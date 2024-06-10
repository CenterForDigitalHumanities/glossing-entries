const textWitnessID = window.location.hash.substr(1)

// UI for when the provided T-PEN URI does not resolve or cannot be processed.
document.addEventListener("witness-text-error", function(event){
    const witnessURI = getURLParameter("witness-uri") ? decodeURIComponent(getURLParameter("witness-uri")) : false
    document.querySelector(".witnessText").innerHTML = `<b class="text-error"> Could not get Witness Text Data from ${witnessURI} </b>`
})

/**
 * Attach all the event handlers to the custom key areas.
 * Prepare the UI/UX for either 'create' or 'update' scenarios depending on the url hash.
 * Set fixed value fields and make those inputs dirty.
 */ 
window.onload = () => {
    setPublicCollections()
    setListings()
    const witnessURI = getURLParameter("witness-uri") ? decodeURIComponent(getURLParameter("witness-uri")) : false
    const loadTab = getURLParameter("tab") ? decodeURIComponent(getURLParameter("tab")) : false
    const dig_location = witnessForm.querySelector("input[custom-key='source']")
    if(textWitnessID){
        // Usually will not include ?wintess-uri and if it does that source is overruled by the value of this textWitness's source annotation.
        //const submitBtn = witnessForm.querySelector("input[type='submit']")
        //const deleteBtn = witnessForm.querySelector(".deleteWitness")
        loading.classList.remove("is-hidden")
        //submitBtn.value = "Update Witness Fragment"
        //submitBtn.classList.remove("is-hidden")
        //deleteBtn.classList.remove("is-hidden")
        witnessForm.setAttribute("deer-id", textWitnessID)
    }
    else{
        // This is an error.  A #id is required.
        dig_location.$isDirty = true
        witnessForm.querySelector("select[custom-text-key='language']").$isDirty = true
        witnessForm.querySelector("input[custom-text-key='format']").$isDirty = true
        if(witnessURI) {
            // special handler for ?wintess-uri=
            reset.classList.remove("is-hidden")
            loading.classList.remove("is-hidden")
            document.querySelector(".lineSelector").setAttribute("witness-uri", witnessURI)
            dig_location.value = witnessURI
            dig_location.setAttribute("value", witnessURI)
        }
    }

    // Support the '?tab=' URL parameter
    if(loadTab){
        document.querySelector(`.ui-tab[name="${loadTab}"]`).click()
    }

    // mimic isDirty detection for these custom inputs
    witnessForm.querySelector("select[custom-text-key='language']").addEventListener("change", ev => {
        ev.target.$isDirty = true
        ev.target.closest("form").$isDirty = true
    })
    witnessForm.querySelector("textarea[custom-text-key='text']").addEventListener("input", ev => {
        ev.target.$isDirty = true
        ev.target.closest("form").$isDirty = true
    })
    // Note that this HTML element is a checkbox
    witnessForm.querySelector("input[custom-text-key='format']").addEventListener("click", ev => {
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
    setFieldDisabled(true)
}

/**
 * When the Gloss Collection List deer view loads its records (by finishing the paged query) we can show the witness form.
 * Note the Collection List may still need to fully populate and cache, but it has a UI/UX for that.
 */ 
addEventListener('deer-view-rendered', show)

function show(event){
    if(event.target.id == "ngCollectionList"){
        if(getURLParameter("witness-uri") || textWitnessID){
            const source = event.detail?.source?.value[0]
            if(source){
                //document.querySelectorAll(".entity-needed").forEach(el => el.classList.remove("is-hidden"))
            }
            else{
                //document.querySelectorAll(".entity-needed").forEach(el => el.classList.add("is-hidden"))
            }
        }
        document.querySelectorAll(".entity-needed").forEach(el => el.classList.remove("is-hidden"))
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
if(!textWitnessID) {
    // This event listener is no longer needed
    removeEventListener('deer-form-rendered', init)
}
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
            const entityType = annotationData.type ?? annotationData["@type"] ?? null
            if(entityType !== "Text"){
                document.querySelectorAll(".entity-needed").forEach(el => el.classList.add("is-hidden"))
                const ev = new CustomEvent("Witness Details Error")
                look.classList.add("text-error")
                look.innerText = `The provided #entity of type '${entityType}' is not a 'Text'.`
                loading.classList.add("is-hidden")
                witnessForm.classList.add("is-hidden")
                globalFeedbackBlip(ev, `Provided Entity of type '${entityType}' is not a 'Text'.`, false)
                return
            }
            referencedGloss.setAttribute("deer-id",annotationData["references"]?.value[0].replace(/^nOPePE:/,'nOPePE'))
            if(ngCollectionList.hasAttribute("ng-list-loaded")){
                prefillReferences(annotationData["references"], ngCollectionList)
            }
            else{
                addEventListener('ng-list-loaded', ngListLoaded)
                function ngListLoaded(event){
                    if(event.target.id === "ngCollectionList"){
                        prefillReferences(annotationData["references"], ngCollectionList)
                        event.target.querySelector("gloss-modal-button").classList.remove("is-hidden")
                        removeEventListener('ng-list-loaded', ngListLoaded)
                    }
                }
            }
            if(document.querySelector("witness-text-selector").hasAttribute("witness-text-loaded")){
                preselectLines(annotationData["selections"], $elem)    
            }
            else{
                addEventListener('witness-text-loaded', ev => {
                    preselectLines(annotationData["selections"], $elem)
                })
            }
            prefillText(annotationData["text"], $elem)
            prefillDigitalLocations(annotationData["source"], $elem)

            // This event listener is no longer needed
            removeEventListener('deer-form-rendered', init)

            loading.classList.add("is-hidden")
            witnessForm.classList.remove("is-hidden")
            document.querySelectorAll(".entity-needed").forEach(el => el.classList.remove("is-hidden"))
            setFieldDisabled(true)
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
 * Helper function for the specialized references key, which is an Array.
 * An item of the array can be either a URI or plain text.  Set the
 * appropriate attribute based on which it is.
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
    const source = locationsArr?.source
    if(source?.citationSource){
        form.querySelector("input[custom-key='source']").setAttribute("deer-source", source.citationSource ?? "")
    }
    locationsArr = locationsArr?.value
    if (!locationsArr || !locationsArr.length) {
        console.warn("There are no digital locations recorded for this witness")
        return false
    }
    locationElem.value = locationsArr[0]
    // If this is not a URI, then it also needs to populate the .witnessText element.
    if(locationsArr[0].startsWith("http:") || locationsArr[0].startsWith("https:")){
        document.querySelector(".lineSelector").setAttribute("witness-uri", locationsArr[0])
    }
    else{
        document.querySelector(".lineSelector").setAttribute("witness-text", locationsArr[0])
    }
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
    const elem = form.querySelector(`li[deer-id="${ngID}"]`) ? form.querySelector(`li[deer-id="${ngID}"]`) : form.querySelector(`div[deer-id="${ngID}"]`).firstElementChild
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
    filter.value = ngLabel.trim()
    filter.dispatchEvent(new Event('input', { bubbles: true }))
    const chosenGloss = document.querySelector(".chosenGloss")
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
        console.warn("There are no text selections recorded for this witness")
        return false
    }
    const selectionsElem = form.querySelector("input[custom-key='selections']")
    if(source?.citationSource){
        selectionsElem.setAttribute("deer-source", source.citationSource ?? "")
    }
    selectionsElem.value = linesArr[0]
     //Now highlight the text
    let range = document.createRange()
    let sel = window.getSelection()
    const text = linesArr[0]
    let selection = text.split("#")[1].replace("char=", "").split(",")           
    const witness_text_elem = document.querySelector(".witnessText").firstElementChild
    range.setStart(witness_text_elem.firstChild, parseInt(selection[0]))
    range.setEnd(witness_text_elem.firstChild, parseInt(selection[1]))
    sel.removeAllRanges()
    sel.addRange(range)
    document.querySelectorAll(".togglePage:not(.has-selection)").forEach(tog => {
        if(!tog.classList.contains("is-toggled")){
            tog.click()
        }
    })  
}

/**
 * Remove all URL parameters and restart the user flow on gloss-witness.html
 */ 
function startOver(){
    window.location = window.location.origin + window.location.pathname
}

/**
 * Enable/Disable all form fields
 * @param {boolean} disabled - Set all form fields used to have this value for their `disabled` attribute
 */
function setFieldDisabled(disabled = true) {
    document.querySelectorAll('input,textarea,select,button').forEach(e => {
        if(disabled){
            e.setAttribute("disabled", "")
        }
        else{
            e.removeAttribute("disabled")
        }
    })
}

/**
 * Redirects or opens a new tab to the witness page for the given gloss.
 * @param {boolean} tpen - Indicates whether to redirect to T-PEN for the witness page.
 */
function metadataForWitness(tpen){
    document.location.href = `/fragment-metadata.html#${textWitnessID}`
}
