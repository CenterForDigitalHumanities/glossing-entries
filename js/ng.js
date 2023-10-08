/**
 * Default behaviors to run on page load.  Add the event listeners to the custom form elements and mimic $isDirty.
 */ 
window.onload = () => {
    const hash = window.location.hash.substring(1)
    if(hash) {
        document.querySelector("gog-references-browser").setAttribute("gloss-uri", hash)
        document.querySelectorAll(".addWitnessBtn").forEach(btn => btn.classList.remove("is-hidden"))
    }
    const labelElem = document.querySelector('input[deer-key="title"]')
    const textElem = glossText
    const textListener = textElem.addEventListener('input', ev => {
        if (textElem.value?.length > 5) {
            const words = textElem.value.split(' ')
            let label = ''
            while (label.length < 20 && words.length > 0) {
                label += words.shift() + " "
            }
            labelElem.value = label.trim()
        }
    })
    labelElem.addEventListener('input', ev => {
        if (!textElem.value.startsWith(labelElem.value)) {
            textElem.removeEventListener('input', textListener)
        }
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
        document.querySelector("select[custom-text-key='language']").$isDirty = true
        document.querySelector("input[custom-text-key='format']").$isDirty = true
    }
    // mimic isDirty detection for these custom inputs
    document.querySelector("select[custom-text-key='language']").addEventListener("change", ev => {
        ev.target.$isDirty = true
        ev.target.closest("form").$isDirty = true
    })
    document.querySelector("textarea[custom-text-key='text']").addEventListener("input", ev => {
        ev.target.$isDirty = true
        ev.target.closest("form").$isDirty = true
    })
    // Note that this HTML element is a checkbox
    document.querySelector("input[custom-text-key='format']").addEventListener("click", ev => {
        if(ev.target.checked){
            ev.target.value = "text/html"
            ev.target.setAttribute("value", "text/html")
        }
        else{
            ev.target.value = "text/plain"
            ev.target.setAttribute("value", "text/plain")
        }
        ev.target.$isDirty = true
        ev.target.closest("form").$isDirty = true
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
            if(event.detail.targetChapter && !event.detail.section) {
                document.querySelector('[deer-key="canonicalReference"]').value = `Matthew ${event.detail.targetChapter.value}:${event.detail.targetVerse.value}`
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

function parseSections() {
    // Get the Canonical Reference Locator value
    const canonValue = document.querySelector('input[deer-key="canonicalReference"]').value;
    
    // Get references to the input fields
    const _document = document.querySelector('input[deer-key="_document"]');
    const _section = document.querySelector('input[deer-key="_section"]');
    const _subsection = document.querySelector('input[deer-key="_subsection"]');
    
    // Create an array of the input fields
    const elemSet = [_document, _section, _subsection];
    
    // Check if any of the input fields are missing or if the Canonical Reference Locator is empty
    if (elemSet.includes(null)) {
        throw new Error(`Missing elements in ${elemSet.join(', ')}`);
    }
    
    // Split the Canonical Reference Locator value at the first ":" character
    const firstColonIndex = canonValue.indexOf(':');
    
    if (firstColonIndex !== -1) {
        _document.value = canonValue.substring(0, firstColonIndex).trim();
        _section.value = canonValue.substring(firstColonIndex + 1).trim();
        _subsection.value = ''; // Leave the Subsection(s) input field empty
    } else {
        // No ":" character found, populate both Document and Section
        _document.value = canonValue.trim();
        _section.value = '';
        _subsection.value = '';
    }
}





function prefillTagsArea(tagData, form = document.getElementById("named-glosses")) {
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

function prefillThemesArea(themeData, form = document.getElementById("named-glosses")) {
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
