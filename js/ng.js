setTimeout(() => {
    document.querySelectorAll("input[deer-key='creator']").forEach(el => {
        el.value="HabesTest"
        el.setAttribute("value", "HabesTest")
    })
    document.getElementById("named-gloss").setAttribute("deer-creator", "HabesTest")
    window.GOG_USER["http://store.rerum.io/agent"] = "HabesTest"
}, 4000)

document.onload = function(e){ 
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
    textElem.addEventListener('blur', ev => checkForGlossesBtn.click())
    checkForGlossesBtn.addEventListener('click', async ev => {
        const matches = await findMatchingIncipits(textElem.value.trim(), labelElem.value)
        glossResult.innerHTML = matches.length ? "<p>Potential matches found!</p>" : "<p>Gloss appears unique!</p>"
        matches.forEach(anno => {
            glossResult.insertAdjacentHTML('beforeend', `<a href="#${anno.id.split('/').pop()}">${anno.title}</a>`)
        })
    })
        ;[glossText, textLang].forEach(elem => addEventListener('input', event => {
            textObject.value = {
                '@type': "Text",
                textValue: glossText.value,
                format: "text/plain",
                language: textLang
            }
        }))
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
    setTimeout(() => {
        document.querySelectorAll("input[deer-key='creator']").forEach(el => {
            el.value="HabesTest"
            el.setAttribute("value", "HabesTest")
        })
        document.getElementById("named-gloss").setAttribute("deer-creator", "HabesTest")
        window.GOG_USER["http://store.rerum.io/agent"] = "HabesTest"
    }, 4000)
})

function parseSections() {
    const canonValue = document.querySelector('input[deer-key="canonicalReference"]')?.value
    const _document = document.querySelector('input[deer-key="_document"]')
    const _section = document.querySelector('input[deer-key="_section"]')
    const _subsection = document.querySelector('input[deer-key="_subsection"]')
    const elemSet = [_document, _section, _subsection]
    if (elemSet.includes(null) || !canonValue?.length) { throw new Error(`Missing elements in ${elemSet.join(', ')}`) }

    const canonSplit = canonValue.split(/[\s\:\.,;\|#§]/)
    elemSet.forEach((el, index) => el.value = canonSplit[index])
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