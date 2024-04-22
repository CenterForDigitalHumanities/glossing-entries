
const glossHashID = window.location.hash.substring(1)

/**
 * Default behaviors to run on page load.  Add the event listeners to the custom form elements and mimic $isDirty.
 */ 
window.onload = () => {
    let hash = window.location.hash
    if(hash.startsWith("#")){
        hash = window.location.hash.substring(1)
        if(!(hash.startsWith("http:") || hash.startsWith("https:"))){
            // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
            let e = new CustomEvent("expandError", { detail: {"uri":hash}, bubbles:true})
            document.dispatchEvent(e)
            return
        }
    }
    
    const glossForm = document.getElementById("named-gloss")
    if(hash) {
        document.querySelector("gog-references-browser").setAttribute("gloss-uri", hash)
        document.querySelectorAll(".addWitnessDiv").forEach(div => div.classList.remove("is-hidden"))
        document.querySelectorAll(".addWitnessBtn").forEach(btn => btn.classList.remove("is-hidden"))
        glossForm.querySelector(".dropGloss").classList.remove("is-hidden")
       
        
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
    if(!hash){
       // These items have default values that are dirty on fresh forms.
        glossForm.querySelector("select[custom-text-key='language']").$isDirty = true
        glossForm.querySelector("input[custom-text-key='format']").$isDirty = true
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
    // Note that this HTML element is a checkbox
    glossForm.querySelector("input[custom-text-key='format']").addEventListener("click", ev => {
        if(ev.target.checked){
            ev.target.value = "text/html"
            ev.target.setAttribute("value", "text/html")
        }
        else{
            ev.target.value = "text/plain"
            ev.target.setAttribute("value", "text/plain")
        }
        ev.target.$isDirty = true
        glossForm.$isDirty = true
    })
}


/**
 * Detects that all annotation data is gathered and all HTML of the form is in the DOM and can be interacted with.
 * This is important for pre-filling or pre-selecting values of multi select areas, dropdown, checkboxes, etc. 
 * This event will come after all deer-view-rendered events have finished.
 * @see deer-record.js DeerReport.constructor()  
 */
addEventListener('deer-form-rendered', event => {
    let whatRecordForm = event.target.id
    let annotationData = event.detail
    switch (whatRecordForm) {
        case "named-gloss":
            // supporting forms populated
            prefillTagsArea(annotationData["tags"], event.target)
            prefillThemesArea(annotationData["themes"], event.target)
            prefillText(annotationData["text"], event.target)
            if(event.detail.targetChapter && !event.detail["_section"]) {
                // This conditional is solely to support Glossing Matthew data and accession it into the new encoding.
                const canonRef = document.querySelector('[deer-key="canonicalReference"]')
                canonRef.value = `Matthew ${event.detail.targetChapter.value || ''}${event.detail.targetVerse.value ? `:${event.detail.targetVerse.value}` : ''}`
                canonRef.dispatchEvent(new Event('input', { bubbles: true }))
                parseSections()
            }
            break
        default:
    }
})

/**
 * The DEER announcement for when all form fields have been saved or updated.
 * Extend this functionality by also saving or updating the custom fields.
 * 
 */ 
addEventListener('deer-updated', event => {
    const $elem = event.target
    //Only care about witness form
    if($elem?.id  !== "named-gloss") return
    // We don't want the typical DEER form stuff to happen.  This may have no effect, not sure.
    event.preventDefault()
    event.stopPropagation()

    const entityID = event.detail["@id"]  
    const customTextElems = [
        $elem.querySelector("input[custom-text-key='format']"),
        $elem.querySelector("select[custom-text-key='language']"),
        $elem.querySelector("textarea[custom-text-key='text']")
    ]
    if(customTextElems.filter(el => el.$isDirty).length > 0){
        // One of the text properties has changed so we need the text object
        const format = customTextElems[0].value
        const language = customTextElems[1].value
        const text = customTextElems[2].value
        let textanno = {
            "@context": "http://www.w3.org/ns/anno.jsonld",
            "@type": "Annotation",
            "body": {
                "text":{
                    "format" : format,
                    "language" : language,
                    "textValue" : text
                }
            },
            "target": entityID,
            "creator" : window.GOG_USER["http://store.rerum.io/agent"]
        }
        const el = customTextElems[2]
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
            customTextElems[2].setAttribute("deer-source", a["@id"])
        })
        .catch(err => {
            console.error(`Could not generate 'text' property Annotation`)
            console.error(err)
        })
        .then(success => {
            console.log("GLOSS FULLY SAVED")
            const ev = new CustomEvent("Thank you for your Gloss Submission!")
            globalFeedbackBlip(ev, `Thank you for your Gloss Submission!`, true)
            const hash = window.location.hash.substring(1)
            if(!hash){
                setTimeout(() => {
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
    const ev = new CustomEvent("Gloss Details Error")
    document.getElementById("named-gloss").classList.add("is-hidden")
    look.classList.add("text-error")
    look.innerText = "Could not get Witness information."
    document.querySelector(".addWitnessDiv").classList.add("is-hidden")
    globalFeedbackBlip(ev, `Error getting data for '${uri}'`, false)
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

function prefillThemesArea(themeData, form = document.getElementById("named-gloss")) {
    if (themeData === undefined) {
        console.warn("Cannot set value for themes and build UI.  There is no data.")
        return false
    }
    let arr_names = (themeData.hasOwnProperty("value") && themeData.value.hasOwnProperty("items")) ? themeData.value.items :
        themeData.hasOwnProperty("items") ? themeData.items :
            [themeData]
    if (arr_names.length === 0) {
        console.warn("There are no themes recorded for this Gloss")
        return false
    }
    form.querySelector("input[deer-key='themes']").value = arr_names.join(",")
    let area = form.querySelector("input[deer-key='themes']").nextElementSibling //The view or select should always be just after the input tracking the values from it.
    //Now build the little themes
    let selectedTagsArea = area.parentElement.querySelector(".selectedEntities")
    selectedTagsArea.innerHTML = ""
    let themes = ""
    arr_names.forEach(themeName => {
        if (themeName) {
            themes += `<span class="tag is-small">${themeName}<span onclick="this.closest('gog-theme-widget').removeTheme(event)" class="removeTheme" theme-name="${themeName}"></span></span>`
        }
    })
    selectedTagsArea.innerHTML = themes
}

/**
 * Helper function for the specialized text key, which is an Object.
 * Note that format is hard coded to text/plain for now.
 * */
function prefillText(textObj, form) {
    const languageElem = form.querySelector("select[custom-text-key='language'")
    const formatElem = form.querySelector("input[custom-text-key='format'")
    const textElem = form.querySelector("textarea[custom-text-key='text'")
    if (textObj === undefined) {
        console.warn("Cannot set value for text and build UI.  There is no data.")
        return false
    }
    if(![languageElem,formatElem,textElem].some(e=>e)) {
        console.warn("Nothing to fill.")
        return false
    }
    const source = textObj?.source
    if(source?.citationSource){
        form.querySelector("select[custom-text-key='language'")?.setAttribute("deer-source", source.citationSource ?? "") 
        form.querySelector("input[custom-text-key='format'")?.setAttribute("deer-source", source.citationSource ?? "") 
        form.querySelector("textarea[custom-text-key='text'")?.setAttribute("deer-source", source.citationSource ?? "") 
    }
    textObj = textObj.value ?? textObj
    const language = textObj.language
    if(languageElem) {
        languageElem.value = language
        languageElem.setAttribute("value", language)
    }
    
    const format = textObj.format
    if(format === "text/html"){
        formatElem.checked = true
    }
    if(formatElem) {
        formatElem.value = format
        formatElem.setAttribute("value", "format")
    }
    const textVal = textObj.textValue
    if (!textVal) {
        console.warn("There is no text recorded for this witness")
        return false
    }
    if(textElem){
        textElem.value = textVal
        textElem.setAttribute("value", textVal)
    }
}

function witnessForGloss(tpen){
    const title = document.getElementById("named-gloss").querySelector("input[deer-key='title']").value
    if(!title) return
    const encodedFilter = encodeContentState(JSON.stringify({"title" : title}))
    if(tpen){
        //window.location = `gloss-transcription.html?gog-filter=${encodedFilter}`
        window.open(`gloss-transcription.html?gog-filter=${encodedFilter}`, "_blank")
    }
    else{
        //window.location = `gloss-witness.html?gog-filter=${encodedFilter}`
        window.open(`gloss-witness.html?gog-filter=${encodedFilter}`, "_blank")
    }
}

/**
 * A Gloss entity is being deleted through the ng.html interface.  
 * Delete the Gloss, the Annotations targeting the Gloss, the Witnesses of the Gloss, and the Witnesses' Annotations.
 * Remove this Gloss from the public list.
 * Paginate by redirecting to glosses.html.
 * 
 * @param id {String} The Gloss IRI.
 */
async function deleteGloss(id=glossHashID) {
    if(!id){
        alert(`No URI supplied for delete.  Cannot delete.`)
        return
    }
    if(await isPublicGloss(id)){
        const ev = new CustomEvent("Gloss is public")
        globalFeedbackBlip(ev, `This Gloss is public and cannot be deleted from here.`, false)
        return
    }
    let allWitnessesOfGloss = await getAllWitnessesOfGloss(id)
    allWitnessesOfGloss = Array.from(allWitnessesOfGloss)
    // Confirm they want to do this
    if (!await showCustomConfirm(`Really delete this Gloss and remove its Witnesses?\n(Cannot be undone)`)) return

    const historyWildcard = { "$exists": true, "$size": 0 }

    // Get all Annotations throughout history targeting this object that were generated by this application.
    const allAnnotationsTargetingEntityQueryObj = {
        target: httpsIdArray(id),
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    const allEntityAnnotationIds = await getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
    .then(annos => annos.map(anno => anno["@id"]))
    .catch(err => {
        alert("Could not gather Annotations to delete.")
        console.log(err)
        return null
    })

    // This is bad enough to stop here, we will not continue on towards deleting the entity.
    if(allEntityAnnotationIds === null) throw new Error("Cannot find Entity Annotations")

    const allEntityAnnotations = allEntityAnnotationIds.map(annoUri => {
        return fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({"@id":annoUri.replace(/^https?:/,'https:')}),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            }
        })
        .then(r => {
            if(!r.ok) throw new Error(r.text)
        })
        .catch(err => { 
            console.warn(`There was an issue removing an Annotation: ${annoUri}`)
            console.log(err)
            const ev = new CustomEvent("RERUM error")
            globalFeedbackBlip(ev, `There was an issue removing an Annotation: ${annoUri}`, false)
        })
    })

    const allWitnessDeletes = allWitnessesOfGloss.map(witnessURI => {
        return deleteWitness(witnessURI, false)
    })

    // Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
    await Promise.all(allEntityAnnotations).then(success => {
        console.log("Connected Annotationss successfully removed.")
    })
    .catch(err => {
        // OK they may be orphaned.  We will continue on towards deleting the entity.
        console.warn("There was an issue removing connected Annotations.")
        console.log(err)
    })

    // Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
    await Promise.all(allWitnessDeletes).then(success => {
        console.log("Connected Witnesses successfully removed.")
    })
    .catch(err => {
        // OK they may be orphaned.  We will continue on towards deleting the entity.
        console.warn("There was an issue removing connected Witnesses.")
        console.log(err)
    })

    // Now the entity itself
    fetch(`${__constants.tiny}/delete`, {
        method: "DELETE",
        body: JSON.stringify({ "@id": id }),
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Bearer ${window.GOG_USER.authorization}`
        }
    })
    .then(r => {
        if(r.ok){
            const ev = new CustomEvent("This Gloss has been deleted.")
            globalFeedbackBlip(ev, `Gloss deleted.  You will be redirected.`, true)
            addEventListener("globalFeedbackFinished", () => {
                location.href = "glosses.html"
            })
        }
        else{ 
            throw new Error(r.text)
        }
    })
    .catch(err => {
        alert(`There was an issue removing the Gloss with URI ${id}.  This item may still appear in collections.`)
        console.log(err)
    })

}
