
var glossHashID = window.location.hash.slice(1)

/**
 * TODO we need to consider onhashchange handling for the entity forms on the gloss-witness.html page.
 */
// window.onhashchange = () => {
//     glossHashID = window.location.hash.slice(1)
// }

/**
 * Default behaviors to run on page load.  Add the event listeners to the custom form elements and mimic $isDirty.
 */ 
window.onload = () => {
    const glossForm = document.getElementById("named-gloss")
    if(!glossHashID){
        loading.classList.add("is-hidden")
        document.querySelector(".gloss-needed").classList.remove("is-hidden")
    } 
    // Add pagination to the form submit so users know work is happening in the background
    glossForm.addEventListener("submit", (e) => {inProgress(e, true)})
    if(glossHashID) {
        if(!(glossHashID.startsWith("http:") || glossHashID.startsWith("https:"))){
            // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
            const ev_err = new CustomEvent("Expand Error")
            broadcast(ev_err, "expandError", document, {"uri":glossHashID, "error":"Location hash is not a URI."})
            return
        }
        setFieldDisabled(true)
        document.querySelector("gog-references-browser").setAttribute("gloss-uri", glossHashID)
        document.querySelectorAll(".addWitnessBtn").forEach(btn => btn.classList.remove("is-hidden"))
        const deleteGlossBtn = glossForm.querySelector(".dropGloss")
        deleteGlossBtn.classList.remove("is-hidden")
        deleteGlossBtn.addEventListener('click', ev => {
            deleteGloss(glossHashID, true)
        })
    }
    const labelElem = glossForm.querySelector('input[deer-key="title"]')
    const textElem = glossText
    const textListener = textElem.addEventListener('input', ev => {
        if (textElem.value?.length > 5) {
            const words = textElem.value.split(' ')
            let label = ''
            while (label.length < 20 && words.length > 0) {
                label += words.shift() + " "
            }
            labelElem.value = label.trim()
            labelElem.dispatchEvent(new Event('input', { bubbles: true }))
        }
    })
    labelElem.addEventListener('input', ev => {
        if (!textElem.value.startsWith(labelElem.value)) {
            textElem.removeEventListener('input', textListener)
        }
        labelElem.$isDirty = true
    })
    //textElem.addEventListener('blur', ev => checkForGlossesBtn.click())
    checkForGlossesBtn.addEventListener('click', async ev => {
        const matches = await findMatchingIncipits(textElem.value.trim(), labelElem.value)
        glossResult.innerHTML = matches.length ? "<p>Potential matches found!</p>" : "<p>Gloss appears unique!</p>"
        matches.forEach(anno => {
            glossResult.insertAdjacentHTML('beforeend', `<a href="#${anno.id.split('/').pop()}">${anno.title}</a>`)
        })
    })
    if(!glossHashID){
       // These items have default values that are dirty on fresh forms.
        glossForm.querySelector("select[custom-text-key='language']").$isDirty = true
    }
    // mimic isDirty detection for these custom inputs
    glossForm.querySelector("select[custom-text-key='language']").addEventListener("change", ev => {
        ev.target.$isDirty = true
        glossForm.$isDirty = true
    })
    glossForm.querySelector("textarea[custom-text-key='text']").addEventListener("input", ev => {
        ev.target.$isDirty = true
        glossForm.$isDirty = true
    })
}

/**
 * UI/UX for when the user uses this page to delete an existing #Gloss
 */
document.addEventListener("GlossDeleted", function(event){
    const ev = new CustomEvent("This Gloss has been deleted.")
    globalFeedbackBlip(ev, `Gloss deleted.  You will be redirected.`, true)
    addEventListener("globalFeedbackFinished", () => {
        location.href = "glosses.html"
    })
})

/**
 * UI/UX for when this page has an error attempting to delete an existing #Gloss
 * The form becomes locked down and an error message is show.
 */
document.addEventListener("GlossDeleteError", function(event){
    const ev = new CustomEvent("Gloss Delete Error")
    globalFeedbackBlip(ev, `There was an issue removing the Gloss with URI ${event.detail["@id"]}.  This item may still appear in collections.`, false)
    addEventListener("globalFeedbackFinished", () => {
        setFieldDisabled(true)
    })
    console.error(event.error)
})

addEventListener('deer-form-rendered', initGlossForm)
function initGlossForm(event){
    let whatRecordForm = event.target.id
    if(whatRecordForm !== "named-gloss") return
    let annotationData = event.detail
    const entityType = annotationData.type ?? annotationData["@type"] ?? null
    if(entityType !== "Gloss" && entityType !== "named-gloss"){
        const ev = new CustomEvent("Gloss Details Error")
        look.classList.add("text-error")
        look.innerText = `The provided #entity of type '${entityType}' is not a 'Gloss'.`
        globalFeedbackBlip(ev, `Provided Entity of type '${entityType}' is not a 'Gloss'.`, false)
        return
    }
    prefillTagsArea(annotationData["tags"], event.target)
    prefillText(annotationData["text"], event.target)
    if(event.detail.targetChapter && !event.detail["_section"]) {
        // This conditional is solely to support Glossing Matthew data and accession it into the new encoding.
        const canonRef = document.querySelector('[deer-key="canonicalReference"]')
        canonRef.value = `Matthew ${event.detail.targetChapter.value || ''}${event.detail.targetVerse.value ? `:${event.detail.targetVerse.value}` : ''}`
        canonRef.dispatchEvent(new Event('input', { bubbles: true }))
        parseSections()
    }
    removeEventListener('deer-form-rendered', initGlossForm)
    loading.classList.add("is-hidden")
    document.querySelector(".gloss-needed").classList.remove("is-hidden")
    setTimeout(() => {
        setFieldDisabled(false)
    }, 200)
}

/**
 * When a Gloss is submitted for creation or update it will have multiple shelfmarks to make WitnessFragments against.
 * In some cases, a ManuscriptWitness will need to be generated in order to have a WitnessFragment.
 *     - Check for existing ManuscriptWitnesses with this shelfmark
 *         - If none exist, a ManuscriptWitness must be generated
 *         - Generate the targetCollection Annotation for the ManuscriptWitness
 *         - Generate the 'identifier' Annotation for the Manuscript Witness
 *     - Generate a WitnessFragment using the same shelfmark
 *     - Generate a 'partOf' Annotation that targets the WitnessFragment to connect it to the ManuscriptWitness.
 *     - Generate an 'identifier' Annotation that targets the WitnessFragment.
 *     - Generate a 'references' Annotation that targets the WitnessFragment.
 * 
 * @param glossid - the rerum URI of the created Gloss to connect this Witness to via a 'references' Annotation.
 * @return An object noting the entities involved in order to generate the reference properly.
 */ 
async function generateWitnessesOnSubmit(glossid){
    // Must have a label/shelfmark/whatever.  This creates a Witness entity and the Annotation for the provided label.
    if(!glossid) throw new Error("Must have a Gloss URI to generate witnesses")
    const queued = document.getElementsByTagName("gog-references-browser")[0].querySelectorAll(".witness-queued")
    let matchedManuscript = {"@id" : ""}
    let createdWitnessFragment = null
    let createdWitnessFragments = []
    let matchedManuscripts = []
    let allInvolvedEntities = {
        "manuscripts" : [],
        "fragments" : []
    }
    let manuscriptWitnessObj = {
        "@context": "http://purl.org/dc/terms",
        "@type": "ManuscriptWitness",
        "creator": window.GOG_USER["http://store.rerum.io/agent"]
    }
    let witnessFragmentObj = {
        "@context": "http://purl.org/dc/terms",
        "@type": "WitnessFragment",
        "creator": window.GOG_USER["http://store.rerum.io/agent"]
    }
    for await (const witness_li of queued){
        const user_input = witness_li.innerText
        const match = witness_li.getAttribute("matched-manuscript") ? witness_li.getAttribute("matched-manuscript") : ""
        matchedManuscript = {"@id" : match}
        if(!match){
            matchedManuscript = await fetch(`${__constants.tiny}/create`, {
                method: "POST",
                mode: 'cors',
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                },
                body: JSON.stringify(manuscriptWitnessObj)
            })
            .then(res => res.json())
            .catch(err => {throw err})
        }
        createdWitnessFragment = await fetch(`${__constants.tiny}/create`, {
            method: "POST",
            mode: 'cors',
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            },
            body: JSON.stringify(witnessFragmentObj)
        })
        .then(res => res.json())
        .catch(err => {throw err})
        if(matchedManuscript["@id"] && createdWitnessFragment["@id"]){
            let identifierObj_Manuscript = {
                "@context":"http://www.w3.org/ns/anno.jsonld",
                "@type":"Annotation",
                "body":{
                    "identifier":{
                        "value":user_input
                    }
                },
                "target": matchedManuscript["@id"],
                "creator": window.GOG_USER["http://store.rerum.io/agent"]
            }
            let targetCollectionObj = {
                "@context":"http://www.w3.org/ns/anno.jsonld",
                "@type":"Annotation",
                "body":{
                    "targetCollection": "GoG-Manuscripts"
                },
                "target": matchedManuscript["@id"],
                "creator": window.GOG_USER["http://store.rerum.io/agent"]
            }
            let identifierObj_Fragment = {
                "@context":"http://www.w3.org/ns/anno.jsonld",
                "@type":"Annotation",
                "body":{
                    "identifier":{
                        "value":user_input
                    }
                },
                "target": createdWitnessFragment["@id"],
                "creator": window.GOG_USER["http://store.rerum.io/agent"]
            }
            let partOfObj = {
                "@context":"http://www.w3.org/ns/anno.jsonld",
                "@type":"Annotation",
                "body":{
                    "partOf":{
                        "value":matchedManuscript["@id"]
                    }
                },
                "target": createdWitnessFragment["@id"],
                "creator": window.GOG_USER["http://store.rerum.io/agent"]
            }
            let referencesObj = {
                "@context":"http://www.w3.org/ns/anno.jsonld",
                "@type":"Annotation",
                "body":{
                    "references":{
                        "value":[glossid]
                    }
                },
                "target": createdWitnessFragment["@id"],
                "creator": window.GOG_USER["http://store.rerum.io/agent"]
            }
            
            const a = witness_li.querySelector("a")
            witness_li.setAttribute("deer-id", matchedManuscript["@id"])
            a.setAttribute("href", `manuscript-profile.html#${matchedManuscript["@id"]}`)
            let createdIdentifierAnno_Manuscript = null
            let createdTargetCollectionAnno = null
            let [
                createdReferencesAnno,
                createdIdentifierAnno_Fragment,
                createdPartOfAnno
            ]
            = await Promise.all([
                fetch(`${__constants.tiny}/create`, {
                    method: "POST",
                    mode: 'cors',
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    },
                    body: JSON.stringify(referencesObj)
                })
                .then(res => res.json())
                .catch(err => {throw err}),
                fetch(`${__constants.tiny}/create`, {
                    method: "POST",
                    mode: 'cors',
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    },
                    body: JSON.stringify(identifierObj_Fragment)
                })
                .then(res => res.json())
                .catch(err => {throw err}),
                fetch(`${__constants.tiny}/create`, {
                    method: "POST",
                    mode: 'cors',
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    },
                    body: JSON.stringify(partOfObj)
                })
                .then(res => res.json())
                .catch(err => {throw err})
            ])

            if(!match){
                // If there isn't a match then we created a ManuscriptWitness which now needs an identifier and targetCollection annotation.
                createdIdentifierAnno_Manuscript = await fetch(`${__constants.tiny}/create`, {
                    method: "POST",
                    mode: 'cors',
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    },
                    body: JSON.stringify(identifierObj_Manuscript)
                })
                .then(res => res.json())
                .catch(err => {throw err})
                createdTargetCollectionAnno = await fetch(`${__constants.tiny}/create`, {
                    method: "POST",
                    mode: 'cors',
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    },
                    body: JSON.stringify(targetCollectionObj)
                })
                .then(res => res.json())
                .catch(err => {throw err})
            }

            witness_li.setAttribute("deer-source", createdReferencesAnno["@id"])
            a.setAttribute("deer-source", createdIdentifierAnno_Fragment["@id"])
            witness_li.querySelector("span").remove()
            witness_li.classList.remove("witness-queued")

            createdWitnessFragment.identifier = {
                "source":{
                    "citationSource":createdIdentifierAnno_Fragment["@id"]
                },
                "value" : user_input
            }
            matchedManuscript.identifier = {
                "source":{
                    "citationSource": createdIdentifierAnno_Manuscript ? createdIdentifierAnno_Manuscript["@id"] : "already_existed"
                },
                "value" : user_input
            }
            matchedManuscript.targetCollection = {
                "source":{
                    "citationSource": createdTargetCollectionAnno ? createdTargetCollectionAnno["@id"] : "already_existed"
                },
                "value" : "GoG-Manuscripts"
            }
            createdWitnessFragment.references = {
                "source":{
                    "citationSource":createdReferencesAnno["@id"]
                },
                "value" : [glossid]
            }
            createdWitnessFragment.partOf = {
                "source":{
                    "citationSource":createdPartOfAnno["@id"]
                },
                "value" : matchedManuscript["@id"]
            }
        }
        allInvolvedEntities.manuscripts.push(matchedManuscript)
        allInvolvedEntities.fragments.push(createdWitnessFragment)
    }
    return allInvolvedEntities
}

/**
 * The DEER announcement for when all form fields have been saved or updated.
 * Extend this functionality by also saving or updating the custom fields.
 * Extend this functionality by also saving any queued Witness shelfmarks.
 * 
 */ 
addEventListener('deer-updated', async (event) => {
    const $elem = event.target
    //Only care about witness form
    if($elem?.id  !== "named-gloss") return
    // We don't want the typical DEER form stuff to happen.  This may have no effect, not sure.
    event.preventDefault()
    event.stopPropagation()
    let witness = null
    const entityID = event.detail["@id"]  
    // Only have to await this if we care to stop processing on error
    const generatedQuickReferences = await generateWitnessesOnSubmit(entityID)

    const customTextElems = [
        $elem.querySelector("select[custom-text-key='language']"),
        $elem.querySelector("textarea[custom-text-key='text']")
    ]
    if(customTextElems.filter(el => el.$isDirty).length > 0){
        // One of the text properties has changed so we need the text object
        const language = customTextElems[0].value
        const text = customTextElems[1].value
        let textanno = {
            "@context": "http://www.w3.org/ns/anno.jsonld",
            "@type": "Annotation",
            "body": {
                "text":{
                    "language" : language,
                    "textValue" : text
                }
            },
            "target": entityID,
            "creator" : window.GOG_USER["http://store.rerum.io/agent"]
        }
        const el = customTextElems[1]
        if(el.hasAttribute("deer-source")) textanno["@id"] = el.getAttribute("deer-source")
        fetch(`${__constants.tiny}/${el.hasAttribute("deer-source")?"update":"create"}`, {
            method: `${el.hasAttribute("deer-source")?"PUT":"POST"}`,
            mode: 'cors',
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            },
            body: JSON.stringify(textanno)
        })
        .then(res => res.json())
        .then(a => {
            customTextElems[0].setAttribute("deer-source", a["@id"])
            customTextElems[1].setAttribute("deer-source", a["@id"])
        })
        .catch(err => {
            console.error(`Could not generate 'text' property Annotation`)
            console.error(err)
        })
        .then(success => {
            console.log("GLOSS FULLY SAVED")
            const ev = new CustomEvent("Thank you for your Gloss Submission!")
            globalFeedbackBlip(ev, `Thank you for your Gloss Submission!`, true)
            if(!glossHashID){
                setTimeout(() => {
                    window.location = `ng.html#${entityID}`
                    window.location.reload()
                }, 2000)    
            }
        })
        .catch(err => {
            console.error("ERROR PROCESSING SOME FORM FIELDS")
            console.error(err)
        })
    }

})

/**
 * The DEER announcement for when there is an error expanding for a URI.
 * Note there is more information in event.detail.error
 * Note the troublesome URI is in event.detail.uri
 */ 
addEventListener('expandError', event => {
    const uri = event.detail.uri
    const msg = event.detail.error ? event.detail.error : `Error getting data for '${uri}'`
    const ev = new CustomEvent("Gloss Details Error")
    document.getElementById("named-gloss").classList.add("is-hidden")
    document.querySelector("gog-references-browser").classList.add("is-hidden")
    look.classList.add("text-error")
    look.innerText = "Could not get Gloss information."
    globalFeedbackBlip(ev, msg, false)
    loading.classList.add("is-hidden")
    document.querySelector(".gloss-needed").classList.remove("is-hidden")
})

/**
 * Take the value of the canonical reference locator and parse its pieces to populate
 * _document, _section, and _subsection.  Note that this does not affect the $isDirty state
 * or the value of the canonicalReference input.
 */ 
function parseSections() {
    // Get the Canonical Reference Locator value
    const canonValue = document.querySelector('input[deer-key="canonicalReference"]')?.value
    const _document = document.querySelector('input[deer-key="_document"]')
    const _section = document.querySelector('input[deer-key="_section"]')
    const _subsection = document.querySelector('input[deer-key="_subsection"]')

    // Create an array of the input fields
    const elemSet = [_document, _section, _subsection]

    // Check if any of the input fields are missing or if the Canonical Reference Locator is empty
    if (elemSet.includes(null) || !canonValue?.length) {
        throw new Error(`Missing elements in ${elemSet.join(', ')}`)
    }

    // Split the Canonical Reference Locator value using a regex pattern
    const canonSplit = canonValue.split(/[\s\:\.,;\|#§]/)

    // Iterate through the input fields and populate them with corresponding parts of the split value
    elemSet.forEach((el, index) => {
        if (index < canonSplit.length) {
            // Check if the split part is not "undefined" or the undefined primitive before assignment
            if (canonSplit[index] !== "undefined" && canonSplit[index]) {
                el.value = canonSplit[index]
            } else {
                el.value = '' // Set to an empty string if the split part is "undefined" or missing
            }
        } else {
            el.value = '' // Set to an empty string if there's no corresponding part
        }
        el.dispatchEvent(new Event('input', { bubbles: true }))
    })
    
}
/**
 * Prefills the tags area in the form with provided tag data and builds the UI.
 * @param {object|array|string} tagData - The tag data to prefill.
 * @param {HTMLFormElement} form - The form element where the tags area is located.
 * @returns {boolean} - Returns false if there is no tag data.
 */
function prefillTagsArea(tagData, form = document.getElementById("named-gloss")) {
    if (tagData === undefined) {
        console.warn("Cannot set value for tags and build UI.  There is no data.")
        return false
    }
    let arr_names = (tagData.hasOwnProperty("value") && tagData.value.hasOwnProperty("items")) ? tagData.value.items :
        tagData.hasOwnProperty("items") ? tagData.items :
            [tagData]
    if (arr_names.length === 0) {
        console.warn("There are no tags recorded for this Gloss")
        return false
    }
    form.querySelector("input[deer-key='tags']").value = arr_names.join(",")
    let area = form.querySelector("input[deer-key='tags']").nextElementSibling //The view or select should always be just after the input tracking the values from it.
    //Now build the little tags
    let selectedTagsArea = area.parentElement.querySelector(".selectedEntities")
    selectedTagsArea.innerHTML = ""
    let tags = ""
    arr_names.forEach(tagName => {
        if (tagName) {
            tags += `<span class="tag is-small">${tagName}<span onclick="this.closest('gog-tag-widget').removeTag(event)" class="removeTag" tag-name="${tagName}"></span></span>`
        }
    })
    selectedTagsArea.innerHTML = tags
}

/**
 * Helper function for the specialized text key, which is an Object.
 * Note that format is hard coded to text/plain for now.
 * */
function prefillText(textObj, form) {
    const languageElem = form.querySelector("select[custom-text-key='language'")
    const textElem = form.querySelector("textarea[custom-text-key='text'")
    if (textObj === undefined) {
        console.warn("Cannot set value for text and build UI.  There is no data.")
        return false
    }
    if(![languageElem,textElem].some(e=>e)) {
        console.warn("Nothing to fill.")
        return false
    }
    const source = textObj?.source
    if(source?.citationSource){
        form.querySelector("select[custom-text-key='language'")?.setAttribute("deer-source", source.citationSource ?? "") 
        form.querySelector("textarea[custom-text-key='text'")?.setAttribute("deer-source", source.citationSource ?? "") 
    }
    textObj = textObj.value ?? textObj
    const language = textObj.language
    if(languageElem) {
        languageElem.value = language
        languageElem.setAttribute("value", language)
    }

    const textVal = textObj.textValue
    if (!textVal) {
        console.warn("There is no text recorded for this Gloss")
        return false
    }
    if(textElem){
        textElem.value = textVal
        textElem.setAttribute("value", textVal)
    }
}
