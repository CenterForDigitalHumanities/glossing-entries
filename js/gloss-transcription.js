const textWitnessID = window.location.hash.substr(1)

// Make the text in the Gloss modal form the same as the one in the Witness form
document.addEventListener("gloss-modal-visible", function(event){
    const text = witnessForm.querySelector("textarea[custom-text-key='text']").value
    const glossTextElem = event.target.querySelector("textarea[name='glossText']")
    glossTextElem.value = text
    glossTextElem.setAttribute("value", text)
    glossTextElem.dispatchEvent(new Event('input', { bubbles: true }))
})

/**
 * Reset all the Witness form elements so the form is ready to generate a new Witness.
 * This occurs after the user submits a new witness.
 * If they provided a witness URI in the hash, then this is an 'update scenario'. Do not perform the reset.
 */ 
function setWitnessFormDefaults(){
    // Continue the session like normal if they had loaded up an existing witness and updated it.
    if(textWitnessID) return 
    
    const form = witnessForm  
    form.removeAttribute("deer-id")
    form.removeAttribute("deer-source")    
    form.$isDirty = true
    form.querySelector("input[deer-key='creator']").removeAttribute("deer-source")
    // For when we test
    //form.querySelector("input[deer-key='creator']").value = "DevTest"
    
    const labelElem = form.querySelector("input[deer-key='label']")
    labelElem.value = ""
    labelElem.setAttribute("value", "")
    labelElem.removeAttribute("deer-source")
    labelElem.$isDirty = false

    const shelfmarkElem = form.querySelector("input[deer-key='identifier']")
    shelfmarkElem.value = ""
    shelfmarkElem.setAttribute("value", "")
    shelfmarkElem.removeAttribute("deer-source")
    shelfmarkElem.$isDirty = false

    const formatElem = form.querySelector("input[custom-text-key='format']")
    formatElem.removeAttribute("deer-source")
    formatElem.checked = false
    formatElem.$isDirty = true

    const textElem = form.querySelector("textarea[custom-text-key='text']")
    textElem.value = ""
    textElem.setAttribute("value", "")
    textElem.removeAttribute("deer-source")
    textElem.$isDirty = false

    const languageElem = form.querySelector("select[custom-text-key='language']")
    languageElem.removeAttribute("deer-source")
    languageElem.setAttribute("value", "la")
    languageElem.value = "la"
    languageElem.$isDirty = true

    const selectionsElem = form.querySelector("input[custom-key='selections']")
    selectionsElem.value = ""
    selectionsElem.setAttribute("value", "")
    selectionsElem.removeAttribute("deer-source")
    selectionsElem.$isDirty = false

    const referencesElem = form.querySelector("input[custom-key='references']")
    referencesElem.value = ""
    referencesElem.setAttribute("value", "")
    referencesElem.removeAttribute("deer-source")
    referencesElem.$isDirty = false

    const sourceElem = form.querySelector("input[custom-key='source']")
    sourceElem.value = ""
    sourceElem.setAttribute("value", "")
    sourceElem.removeAttribute("deer-source")
    sourceElem.$isDirty = false

    // reset the Glosses filter
    const filter = form.querySelector('input[filter]')
    filter.value = ""
    filter.setAttribute("value", "")
    filter.dispatchEvent(new Event('input', { bubbles: true }))

    //remove text selection
    let sel = window.getSelection ? window.getSelection() : document.selection
    if (sel) {
        if (sel.removeAllRanges) {
            sel.removeAllRanges()
        } else if (sel.empty) {
            sel.empty()
        }
    }
    console.log("WITNESS FORM RESET")
}

/**
 * Attach all the event handlers to the custom key areas.
 * Prepare the UI/UX for either 'create' or 'update' scenarios depending on the url hash.
 * Set fixed value fields and make those inputs dirty.
 */ 
window.onload = () => {
    setPublicCollections()
    setListings()
    const tpenID = getURLParameter("tpen-project")
    const dig_location = document.querySelector("input[custom-key='source']")
    if(tpenID) {
        needs.classList.add("is-hidden")
        document.querySelectorAll(".tpen-needed").forEach(el => el.classList.remove("is-hidden"))
        document.querySelector(".lineSelector").setAttribute("tpen-project", tpenID)
        dig_location.value = tpenID
        dig_location.setAttribute("value", tpenID)
    }
    if(textWitnessID){
        const submitBtn = document.querySelector("input[type='submit']")
        submitBtn.value = "Update Textual Witness"
        submitBtn.classList.remove("is-hidden")
        document.querySelector("form").setAttribute("deer-id", textWitnessID)
    }
    else{
        // These items have default values that are dirty on fresh forms.
        dig_location.$isDirty = true
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
 * When the Gloss Collection List deer view loads its records (by finishing the paged query) we can show the witness form.
 * Note the Collection List may still need to fully populate and cache, but it has a UI/UX for that.
 */ 
addEventListener('deer-view-rendered', show)

function show(event){
    if(event.target.id == "ngCollectionList"){
        loading.classList.add("is-hidden")
        witnessForm.classList.remove("is-hidden")
        // This listener is no longer needed.
        removeEventListener('deer-view-rendered', show)
    }
}

/**
 * Detects that all annotation data is gathered and all HTML of the form is in the DOM and can be interacted with.
 * This is important for pre-filling or pre-selecting values of multi select areas, dropdown, checkboxes, etc. 
 * @see deer-record.js DeerReport.constructor()  
 */
addEventListener('deer-form-rendered', init)

/**
 * Paginate the custom data fields in the Witness form.  Only happens if the page has a hash.
 * Note this only needs to occur one time on page load.
 */ 
function init(event){
    let whatRecordForm = event.target?.id
    let annotationData = event.detail ?? {}
    const $elem = event.target
    switch (whatRecordForm) {
        case "witnessForm":
            if(ngCollectionList.hasAttribute("ng-list-loaded")){
                prefillReferences(annotationData["references"], ngCollectionList)
            }
            else{
                addEventListener('ng-list-loaded', ngListLoaded)
                function ngListLoaded(event){
                    if(event.target.id === "ngCollectionList"){
                        prefillReferences(annotationData["references"], ngCollectionList)
                        // This listener is no longer needed
                        removeEventListener('ng-list-loaded', ngListLoaded)
                    }
                }
            }
            if(document.querySelector("tpen-line-selector").hasAttribute("tpen-lines-loaded")){
                preselectLines(annotationData["selections"], $elem)    
            }
            else{
                addEventListener('tpen-lines-loaded', ev => {
                    preselectLines(annotationData["selections"], $elem)
                })
            }
            prefillText(annotationData["text"], $elem)
            prefillDigitalLocations(annotationData["source"], $elem)

            // This event listener is no longer needed
            removeEventListener('deer-form-rendered', init)
            break
        default:
    }
}

/**
 * Detects that all annotation data is gathered and all HTML of the form is in the DOM and can be interacted with.
 * This is important for pre-filling or pre-selecting values of multi select areas, dropdown, checkboxes, etc. 
 * @see deer-record.js DeerReport.constructor()  
 */
addEventListener('deer-form-rendered', formReset)

function formReset(event){
    let whatRecordForm = event.target.id ? event.target.id : event.target.getAttribute("name")
    const $elem = event.target
    switch (whatRecordForm) {
        case "witnessForm":
            setWitnessFormDefaults()
            break
        case "gloss-modal-form":
            // This element has its own reset function defined in its Custom Element
            document.querySelector("gloss-modal").reset()
            break
        default:
    }
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

 /**
 * Helper function for the specialized references key, which is an Array of URIs.
 * It needs to apply the filter with this Gloss's Label..
 * */
function prefillDigitalLocations(locationsArr, form) {
    const locationElem = form.querySelector("input[custom-key='source']")
    if(!locationElem) {
        console.warn("Nothing to fill")
        return false
    }
    if (locationsArr === undefined) {
        console.warn("Cannot set value for digital locations and build UI.  There is no data.")
        return false
    }
    if (!locationsArr.length) {
        console.warn("There are no digital locations recorded for this witness")
        return false
    }
    const source = locationsArr?.source
    if(source?.citationSource){
        form.querySelector("input[custom-key='source']").setAttribute("deer-source", source.citationSource ?? "")
    }
    locationsArr = locationsArr?.value ?? locationsArr
    locationElem.value = locationsArr[0]
}

/**
 * Helper function for the specialized references key, which is an Array of URIs.
 * It needs to apply the filter with this Gloss's Label..
 * */
function prefillReferences(referencesArr, form) {
    if (referencesArr === undefined) {
        console.warn("Cannot set value for references and build UI.  There is no data.")
        return false
    }            

    const source = referencesArr?.source
    referencesArr = referencesArr?.value ?? referencesArr
    if (referencesArr.length === 0) {
        console.warn("There are no references recorded for this witness")
        return false
    }

    const ngID = referencesArr[0]
    const elem = form.querySelector(`li[deer-id="${ngID}"]`)
    const ngLabel = elem.getAttribute("data-title")
    const filter = document.querySelector("input[filter]")
    const refElem = form.querySelector("input[custom-key='references']")
    if(![elem,ngLabel,filter,refElem].some(e=>e)) {
        console.warn("Nothing to fill.")
        return false
    }
    if(source?.citationSource){
        refElem.setAttribute("deer-source", source.citationSource ?? "")
    }
    refElem.value = referencesArr[0]
    
    // Now apply the references value to the filter
    const button = elem.querySelector(".toggleInclusion")
    button?.setAttribute("disabled", "")
    button?.setAttribute("value", "✓ attached")
    button?.setAttribute("title", "This Gloss is already attached!")
    button?.classList.remove("primary")
    button?.classList.add("success")
    filter.value = ngLabel.trim()
    filter.dispatchEvent(new Event('input', { bubbles: true }))
    const chosenGloss = document.querySelector(".chosenNamedGloss")
    if(chosenGloss) chosenGloss.value = ngLabel
}

/**
 * Helper function for the specialized references key, which is an Array of URIs.
 * It needs to apply the filter with this Gloss's Label.
 * */
function preselectLines(linesArr, form) {
    const source = linesArr.source ?? null
    if (linesArr === undefined) {
        console.warn("Cannot highlight lines in UI.  There is no data.")
        return false
    }
    linesArr = linesArr.value ?? linesArr
    if (linesArr.length === 0) {
        console.warn("There are no lines recorded for this witness")
        return false
    }
    const selectionsElem = form.querySelector("input[custom-key='selections']")
    if(source?.citationSource){
        selectionsElem.setAttribute("deer-source", source.citationSource ?? "")
    }
    selectionsElem.value = linesArr.join("__")

    //Now highlight the lines
    let range = document.createRange()
    let sel = window.getSelection()
    let line = linesArr[0]
    let lineid = line.split("#")[0]
    const lineStartElem = document.querySelector(`div[tpen-line-id="${lineid}"]`)
    lineStartElem.parentElement.previousElementSibling.classList.add("has-selection")
    let selection = line.split("#")[1].replace("char=", "").split(",")           
    range.setStart(lineStartElem.firstChild, parseInt(selection[0]))
    if(linesArr.length > 1){
        line = linesArr.pop()
        lineid = line.split("#")[0]
        const lineEndElem = document.querySelector(`div[tpen-line-id="${lineid}"]`)
        lineEndElem.parentElement.previousElementSibling.classList.add("has-selection")
        selection = line.split("#")[1].replace("char=", "").split(",")           
        range.setEnd(lineEndElem.firstChild, parseInt(selection[1]))
    }
    else{
        range.setEnd(lineStartElem.firstChild, parseInt(selection[1]))
    }
    sel.removeAllRanges()
    sel.addRange(range)
    document.querySelectorAll(".togglePage:not(.has-selection)").forEach(tog => {
        if(!tog.classList.contains("is-toggled")){
            tog.click()
        }
    })  
}

/**
 * Recieve a TPEN project as input from #needs.  Reload the page with a set ?tpen-project URL parameter.
*/
function loadURI(){
    let url = resourceURI.value ? resourceURI.value : getURLParameter("tpen-project")
    if(url){
        let tpen = "?tpen-project="+url
        url = window.location.href.split('?')[0] + tpen
        window.location = url
    }
    else{
        alert("You must supply a URI via the IIIF Content State iiif-content parameter or supply a value in the text input.")
    }
}

/**
 * The DEER announcement for when all form fields have been saved or updated.
 * Extend this functionality by also saving or updating the custom fields.
 * 
 */ 
addEventListener('deer-updated', event => {
    const $elem = event.target
    //Only care about witness form
    if($elem?.id  !== "witnessForm") return
    // We don't want the typical DEER form stuff to happen.  This may have no effect, not sure.
    event.preventDefault()
    event.stopPropagation()

    const entityID = event.detail["@id"]  
    // These promise are for all the simple array values ('references' and 'selections')
    let annotation_promises = Array.from($elem.querySelectorAll("input[custom-key]"))
        .filter(el => el.$isDirty)
        .map(el => {
            const key = el.getAttribute("custom-key")
            let anno = {
                "@context": "http://www.w3.org/ns/anno.jsonld",
                "@type": "Annotation",
                "body": {},
                "target": entityID,
                "creator" : window.GOG_USER["http://store.rerum.io/agent"]
            }
            anno.body[key] = { "value": el.value.split("__") }
            if(el.hasAttribute("deer-source")) anno["@id"] = el.getAttribute("deer-source")
            // If the form field has a deer-source, we need to update.  Otherwise, we create.
            return fetch(`${__constants.tiny}/${el.hasAttribute("deer-source")?"update":"create"}`, {
                method: `${el.hasAttribute("deer-source")?"PUT":"POST"}`,
                mode: "cors",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                },
                body: JSON.stringify(anno)
            })
            .then(res => res.json())
            .then(a => {
                el.setAttribute("deer-source", a["@id"])
            })
            .catch(err => {
                console.error(`Could not generate Annotation for key '${key}'`)
                console.error(err)
            })
        })

    // This gets the custom keys for the annotation.body.text which is an object
    // If any of the elements that build the object are dirty, then it is dirty.
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
        annotation_promises.push(
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
                $elem.setAttribute("deer-source", a["@id"])
            })
            .catch(err => {
                console.error(`Could not generate 'text' property Annotation`)
                console.error(err)
            })
        )
    }
    Promise.all(annotation_promises)
    .then(success => {
        console.log("FORM FULLY SAVED")
        const ev = new CustomEvent("Gloss Textual Witness Submitted")
        globalFeedbackBlip(ev, `Gloss Textual Witness Submitted!`, true)
    })
    .catch(err => {
        console.error("ERROR PROCESSING SOME FORM FIELDS")
        console.error(err)
    })
})

/**
 * Detects that the modal saved a new Gloss and contains that new Gloss's details.
 * That Gloss detail needs to paginate into the Gloss picker.  It should be marked as 'selected' in update scenarios.
 * If there already a 'selected' gloss it should no longer appear as selected. 
 */
addEventListener('gloss-modal-saved', event => {
    if(event.target.tagName !== "GLOSS-MODAL") return

    const gloss = event.detail
    const form = witnessForm
    const view = form.querySelector("deer-view[deer-template='glossesSelectorForTextualWitness']")
    const list = view.querySelector("ul")
    const modal = event.target
    const title = modal.querySelector("form").querySelector("input[deer-key='title']").value
    const totalsProgress = list.closest("deer-view").querySelector(".totalsProgress")

    const selectedBtn = document.querySelector(".toggleInclusion[disabled]")
    if(selectedBtn){
        selectedBtn.setAttribute("title", "Attach this Gloss and Save")
        selectedBtn.setAttribute("value", "➥ attach")
        selectedBtn.setAttribute("class", "toggleInclusion button primary")
        selectedBtn.removeAttribute("disabled")    
    }

    modal.classList.add("is-hidden")

    const li = document.createElement("li")
    // Make this a deer-view so this Gloss is expanded and cached, resulting in more attributes for this element to be filtered on.
    li.classList.add("deer-view")
    li.setAttribute("deer-template", "filterableListItem")
    li.setAttribute("deer-id", gloss["@id"])
    li.setAttribute("data-title", title)
    li.setAttribute("deer-link", "ng.html#")
    // We know the title already so this makes a handy placeholder :)
    li.innerHTML = `<span><a target="_blank" href="ng.html#${gloss["@id"]}">${title}...</a></span>`
    // This helps filterableListItem know how to style the attach button, and also lets us know to change count/total loaded Glosses.
    if(textWitnessID){
        li.setAttribute("update-scenario", "true")
    }
    else{
        li.setAttribute("create-scenario", "true")
    }
    list.appendChild(li)

    // FIXME oh no this won't work.  This element is replaced by a new <li> in filterableListItem.
    //li.addEventListener("deer-view-rendered", paginateGlossFromModal)
    
    setTimeout(function() {
        broadcast(undefined, "deer-view", li, { set: [li] })
    }, 1)
})

/**
 * FIXME We want this listener here.  However, filterableListItem replaces the <li> element so we can't pass the <li> through from here! 
 * After a new Gloss from the modal has been added it needs to end up in the list of Glosses shown on this page.
 * It has become the chosen Gloss and a submit needs to happen.
 */ 

function paginateGlossFromModal(event) {
    const gloss_li = event.target
    if(gloss_li.tagName !== "LI") return
    // A new Gloss has been introduced and is done being cached.
    if(textWitnessID){
        // This is an 'update scenario'.  Click the Witness form submit.
        witnessForm.querySelector("input[type='submit']").click()
    }
    else{
        // This is a 'create scenario'.  Click the attach button in the new Gloss listing.
        gloss_li.querySelector(".toggleInclusion").click()
    }
}

