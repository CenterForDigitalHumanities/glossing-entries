const witnessFragmentID = window.location.hash.slice(1)
let referencedGlossID = null
let existingManuscriptWitness = null
let tpenProjectURI = getURLParameter("tpen-project") ? decodeURIComponent(getURLParameter("tpen-project")) : null

// UI for when the provided T-PEN URI does not resolve or cannot be processed.
document.addEventListener("tpen-lines-error", function(event){
    look.classList.add("text-error")
    look.innerText=`Could not get T-PEN project ${tpenProjectURI}`
    witnessFragmentForm.remove()
    manuscriptWitnessForm.remove()
    loading.classList.add("is-hidden")
    const ev = new CustomEvent("TPEN Lines Error")
    globalFeedbackBlip(ev, `Error loading TPEN project '${tpenProjectURI}'.  Resetting...`, false)
    addEventListener("globalFeedbackFinished", () => {
        startOver()
    })
})

// Make the text in the Gloss modal form the same as the one in the Witness form
document.addEventListener("gloss-modal-visible", function(event){
    const text = witnessFragmentForm.querySelector("textarea[custom-text-key='text']").value
    const glossTextElem = event.target.querySelector("textarea[name='glossText']")
    glossTextElem.value = text
    glossTextElem.setAttribute("value", text)
    glossTextElem.dispatchEvent(new Event('input', { bubbles: true }))
})

/**
 * The DEER announcement for when there is an error expanding for a URI.
 * Note there is more information in event.detail.error
 * Note the troublesome URI is in event.detail.uri
 */ 
addEventListener('expandError', event => {
    const uri = event.detail.uri
    const ev = new CustomEvent("Witness Details Error")
    look.classList.add("text-error")
    look.innerText = "Could not get Witness Fragment information."
    witnessFragmentForm.remove()
    needs.remove()
    loading.classList.add("is-hidden")
    globalFeedbackBlip(ev, `Error getting data for '${uri}'`, false)
})

/**
 * UI/UX for when the user uses this page to delete an existing #WitnessFragment
 */
document.addEventListener("WitnessFragmentDeleted", function(event){
    const ev = new CustomEvent("This Witness Fragment has been deleted.")
    if(event.detail.redirect){
        globalFeedbackBlip(ev, `Witness Fragment deleted.  You will be redirected.`, true)
        addEventListener("globalFeedbackFinished", () => {
            location.href = "gloss-transcription.html"
        })
    }
})

/**
 * UI/UX for when this page has an error attempting to delete an existing #WitnessFragment.
 * The form becomes locked down and an error message is show.
 */
document.addEventListener("WitnessFragmentDeleteError", function(event){
    const ev = new CustomEvent("WitnessFragment Delete Error")
    globalFeedbackBlip(ev, `There was an deleting the Witness Fragment with URI ${event.detail["@id"]}`, false)
    addEventListener("globalFeedbackFinished", () => {
        setFieldDisabled(true)
    })
    console.error(event.error)
})



/*
 * TODO we need to consider onhashchange handling for the entity forms on the gloss-witness.html page.
 */
// window.onhashchange = () => {
//     witnessFragmentID = window.location.hash.slice(1)
// }

/**
 * Attach all the event handlers to the custom key areas.
 * Prepare the UI/UX for either 'create' or 'update' scenarios depending on the url hash.
 * Set fixed value fields and make those inputs dirty.
 */ 
window.onload = async () => {
    setPublicCollections()
    setListings()
    const deleteWitnessButton = document.querySelector(".deleteWitness")

    if(witnessFragmentID){
        // We will trust the source the db tells us belongs to this Witness Fragment.  Ignore ?tpen-project
        tpenProjectURI = null
    }
    if(tpenProjectURI){
        if(!tpenProjectURI.includes("t-pen.org")){
            const ev = new CustomEvent("TPEN Project Error")
            look.classList.add("text-error")
            look.innerText=`Provided URI is not from T-PEN.  Only use T-PEN project or manifest URIs.`
            witnessFragmentForm.remove()
            loading.classList.add("is-hidden")
            globalFeedbackBlip(ev, `Provided project URI is not from T-PEN.`, false)
            return
        }
        const sourceElems = document.querySelectorAll("input[witness-source]")
        sourceElems.forEach(sourceElem => {
            sourceElem.value = tpenProjectURI
            sourceElem.setAttribute("value", tpenProjectURI)
            sourceElem.dispatchEvent(new Event('input', { bubbles: true }))
        })
    }
    else{
        needs.classList.remove("is-hidden")
        loading.classList.add("is-hidden")
    }

    if(witnessFragmentID){
        addEventListener('deer-form-rendered', initFragmentForm)
        existingManuscriptWitness = await getManuscriptWitnessFromFragment(witnessFragmentID)
        .then(existingWitnessURI => existingWitnessURI)
        .catch(err => {
            const ev = new CustomEvent("Query Error")
            globalFeedbackBlip(ev, `The check for existing Witnesses failed.`, false)
            throw err
        })
        const submitBtn = witnessFragmentForm.querySelector("input[type='submit']")
        const deleteBtn = witnessFragmentForm.querySelector(".deleteWitness")
        submitBtn.value = "Update Witness"
        submitBtn.classList.remove("is-hidden")
        deleteBtn.classList.remove("is-hidden")
        witnessFragmentForm.setAttribute("deer-id", witnessFragmentID)
        manuscriptWitnessForm.setAttribute("deer-id", existingManuscriptWitness)
    }
    else{
        witnessFragmentForm.querySelector("select[custom-text-key='language']").$isDirty = true
        if(tpenProjectURI) {
            // special handler for ?wintess-uri=
            addEventListener('tpen-lines-loaded', () => getAllWitnessFragmentsOfSource(null, tpenProjectURI))
            document.querySelector("tpen-line-selector").setAttribute("tpen-project", tpenProjectURI)
            const match = await getManuscriptWitnessFromSource(tpenProjectURI)
            if(match) {
                initiateMatch(match)
            }
            else{
                loading.classList.add("is-hidden")
                manuscriptWitnessForm.classList.remove("is-hidden")
            }
        }
    }

    // mimic isDirty detection for these custom inputs
    witnessFragmentForm.querySelector("select[custom-text-key='language']").addEventListener("change", ev => {
        ev.target.$isDirty = true
        ev.target.closest("form").$isDirty = true
    })
    witnessFragmentForm.querySelector("textarea[custom-text-key='text']").addEventListener("input", ev => {
        ev.target.$isDirty = true
        ev.target.closest("form").$isDirty = true
    })
    deleteWitnessButton.addEventListener("click", async ev => {
        if(await showCustomConfirm("The witness will be deleted.  This action cannot be undone.")){
            deleteWitnessFragment(witnessFragmentID, true)
        }
    })
}

/**
 * Paginate the custom data fields in the Witness form.  Only happens if the page has a hash.
 * Note this only needs to occur one time on page load.
 */ 
function initFragmentForm(event){
    let whatRecordForm = event.target?.id
    let annotationData = event.detail ?? {}
    const $elem = event.target
    if(whatRecordForm !== "witnessFragmentForm") return
    // We will need to know the reference for addButton() so let's get it out there now.
    const sourceURI = annotationData?.source?.value
    tpenProjectURI = tpenProjectURI ? tpenProjectURI : sourceURI
    if(!tpenProjectURI) {
        const ev = new CustomEvent("Witness Fragment does not have a source")
        globalFeedbackBlip(ev, `Witness Fragment does not have a source.  You will be redirected.`, false)
        addEventListener("globalFeedbackFinished", () => {
            location.href = `fragment-metadata.html#${annotationData["@id"]}`
        })
        return
    }
    if(sourceURI && sourceURI !== tpenProjectURI){
        const ev = new CustomEvent("TPEN Lines Error")
        look.classList.add("text-error")
        look.innerText=`Provided TPEN project URI does not match source URI.  There can only be one source.  Remove the ?tpen-project variable from the URL in your browser's address bar and refresh the page.`
        witnessFragmentForm.remove()
        loading.classList.add("is-hidden")
        globalFeedbackBlip(ev, `TPEN source project mismatch.`, false)
        needs.classList.add("is-hidden")
        return
    }
    needs.classList.add("is-hidden")
    document.querySelector("tpen-line-selector").setAttribute("tpen-project", tpenProjectURI)
    referencedGlossID = annotationData["references"]?.value[0].replace(/^https?:/, 'https:')
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
    if(document.querySelector("tpen-line-selector").hasAttribute("tpen-lines-loaded")){
        getAllWitnessFragmentsOfSource(annotationData["selections"], tpenProjectURI)
    }
    else{
        addEventListener('tpen-lines-loaded', ev => {
            getAllWitnessFragmentsOfSource(annotationData["selections"], tpenProjectURI)
        })
    }
    prefillTagsArea(annotationData["tags"], $elem)
    prefillText(annotationData["text"], $elem)

    // This event listener is no longer needed
    removeEventListener('deer-form-rendered', initFragmentForm)

}

/**
 * Reset all the Witness form elements so the form is ready to generate a new Witness.
 * This occurs after the user submits a new witness.
 * If they provided a witness URI in the hash, then this is an 'update scenario'. Do not perform the reset.
 */ 
function setFragmentFormDefaults(){
    // Continue the session like normal if they had loaded up an existing witness and updated it.
    if(witnessFragmentID) return 
    
    const form = witnessFragmentForm
    form.setAttribute("deer-id", "")
    form.setAttribute("deer-source", "")
    form.$isDirty = true
    form.querySelectorAll("input[deer-source]").forEach(i => {
        i.removeAttribute("deer-source")
    })
    form.querySelectorAll("textarea[deer-source]").forEach(t => {
        t.removeAttribute("deer-source")
    })
    form.querySelectorAll("select[deer-source]").forEach(s => {
        s.removeAttribute("deer-source")
    })
    // For when we test
    // form.querySelector("input[deer-key='creator']").value = "BryanDeleteRefactor"
    
    const labelElem = form.querySelector("input[deer-key='title']")
    labelElem.value = ""
    labelElem.setAttribute("value", "")
    labelElem.$isDirty = false

    // I do not think this is supposed to reset.  It is likely they will use the same shelfmark.
    const shelfmarkElem = form.querySelector("input[deer-key='identifier']")
    shelfmarkElem.removeAttribute("deer-source")
    shelfmarkElem.$isDirty = true

    // It remains a partOf the same Manifest.
    const partOfElem = form.querySelector("input[deer-key='partOf']")
    partOfElem.removeAttribute("deer-source")
    partOfElem.$isDirty = true

    const textElem = form.querySelector("textarea[custom-text-key='text']")
    textElem.value = ""
    textElem.setAttribute("value", "")
    textElem.$isDirty = false

    const languageElem = form.querySelector("select[custom-text-key='language']")
    languageElem.setAttribute("value", "la")
    languageElem.value = "la"
    languageElem.$isDirty = true

    const selectionsElem = form.querySelector("input[custom-key='selections']")
    selectionsElem.value = ""
    selectionsElem.setAttribute("value", "")
    selectionsElem.$isDirty = false

    const referencesElem = form.querySelector("input[custom-key='references']")
    referencesElem.value = ""
    referencesElem.setAttribute("value", "")
    referencesElem.$isDirty = false

    // The source value not change and would need to be captured on the next submit.
    const sourceElem = form.querySelector("input[deer-key='source']")
    sourceElem.$isDirty = true

    const glossFormatElem = form.querySelector("select[deer-key='_glossFormat']")
    glossFormatElem.value = "none"
    glossFormatElem.setAttribute("value", "none")
    glossFormatElem.$isDirty = false

    const glossLocationElem = form.querySelector("select[deer-key='_glossLocation']")
    glossLocationElem.value = "none"
    glossLocationElem.setAttribute("value", "none")
    glossLocationElem.$isDirty = false

    const glossatorHandElem = form.querySelector("select[deer-key='_glossatorHand']")
    glossatorHandElem.value = "none"
    glossatorHandElem.setAttribute("value", "none")
    glossatorHandElem.$isDirty = false

    const imageLinkElem = form.querySelector("input[deer-key='depiction']")
    imageLinkElem.value = ""
    imageLinkElem.setAttribute("value", "")
    imageLinkElem.$isDirty = false

    const notesElem = form.querySelector("textarea[deer-key='_notes']")
    notesElem.value = ""
    notesElem.setAttribute("value", "")
    notesElem.$isDirty = false

    const folioElem = form.querySelector("input[deer-key='_folio']")
    folioElem.value = ""
    folioElem.setAttribute("value", "")
    folioElem.$isDirty = false

    const tagsElem = form.querySelector("input[deer-key='tags']")
    tagsElem.value = ""
    tagsElem.setAttribute("value", "")
    tagsElem.$isDirty = false

    //actually remove any tags in the UI
    const tagsAreaElem = form.querySelector("gog-tag-widget")
    tagsAreaElem.querySelectorAll("span.tag").forEach(el => el.remove())

    // reset the Glosses filter
    const filter = form.querySelector('input[filter]')
    filter.value = ""
    filter.setAttribute("value", "")
    filter.dispatchEvent(new Event('input', { bubbles: true }))

    // remove text selection
    let sel = window.getSelection ? window.getSelection() : document.selection
    undoBrowserSelection(sel)

    // remove any Marks noting the user's text selection.
    document.querySelectorAll(".persists").forEach(el => {
        el.classList.remove("persists")
        el.classList.add("pre-select")
    })

    console.log("WITNESS FORM RESET")
}

/**
 * When a filterableListItem_glossSelector loads, add the 'attach' or 'attached' button to it.
 */ 
addEventListener('deer-view-rendered', addButton)

/**
 * After a filterableListItem_glossSelector loads, we need to determine what to do with its 'attach' button.
 * In create/update scenarios, this will result in the need to click a button
 * In loading scenarios, if a text witness URI was supplied to the page it will have a gloss which should appear as 'attached'.
 */ 
function addButton(event) {
    const template_container = event.target
    if(template_container.getAttribute("deer-template") !== "filterableListItem_glossSelector") return
    const obj = event.detail
    const gloss_li = template_container.firstElementChild
    const createScenario = template_container.hasAttribute("create-scenario")
    const updateScenario = template_container.hasAttribute("update-scenario")
    // A new Gloss has been introduced and is done being cached.
    let inclusionBtn = document.createElement("input")
    inclusionBtn.setAttribute("type", "button")
    inclusionBtn.setAttribute("data-id", obj["@id"])
    let already = false
    if(witnessFragmentsObj?.referencedGlosses){
        already = witnessFragmentsObj.referencedGlosses.has(obj["@id"]) ? "attached-to-source" : ""
    }
    if(updateScenario){
        inclusionBtn.setAttribute("disabled", "")
        inclusionBtn.setAttribute("value", "✓ attached")
        inclusionBtn.setAttribute("title", "This Gloss is already attached!")
        inclusionBtn.setAttribute("class", `toggleInclusion ${already} button success`)  
    }
    else{
        // Either a create scenario, or neither (just loading up)
        inclusionBtn.setAttribute("title", `${already ? "This gloss was attached in the past.  Be sure before you attach it." : "Attach This Gloss and Save" }`)
        inclusionBtn.setAttribute("value", `${already ? "❢" : "➥"} attach`)
        inclusionBtn.setAttribute("class", `toggleInclusion ${already} button primary`)

        // If there is a hash AND a the reference value is the same as this gloss ID, this gloss is 'attached'
        if(witnessFragmentID && referencedGlossID === obj["@id"]){
            // Make this button appear as 'attached'
            inclusionBtn.setAttribute("disabled", "")
            inclusionBtn.setAttribute("value", "✓ attached")
            inclusionBtn.setAttribute("title", "This Gloss is already attached!")
            inclusionBtn.classList.remove("primary")
            inclusionBtn.classList.add("success")
        }
    }
    inclusionBtn.addEventListener('click', async ev => {
        ev.preventDefault()
        ev.stopPropagation()
        const form = ev.target.closest("form")
        let blip = new CustomEvent("Blip")
        // There must be a shelfmark
        if(!form.querySelector("input[deer-key='identifier']").value){
            blip = new CustomEvent("You must provide a Shelfmark value.")
            globalFeedbackBlip(blip, `You must provide a Shelfmark value.`, false)
            return
        }
        // There must be a selection
        if(!form.querySelector("input[custom-key='selections']").value){
            blip = new CustomEvent("Select some text first.")
            globalFeedbackBlip(blip, `Select some text first.`, false)
            return   
        }
        const glossIncipit = ev.target.closest("li").getAttribute("data-title")
        const note = ev.target.classList.contains("attached-to-source") 
           ? `This Gloss has already been attached to this source.  Normally it would not appear in the same source a second time.  Be sure before you attach this Gloss.\nSave this textual witness for Gloss '${glossIncipit}'?`
           : `Save this textual witness for Gloss '${glossIncipit}'?`
        if((createScenario || updateScenario) || await showCustomConfirm(note)){
            const customKey = form.querySelector("input[custom-key='references']")
            const uri = ev.target.getAttribute("data-id")
            if(customKey.value !== uri){
                customKey.value = uri 
                customKey.setAttribute("value", uri) 
                customKey.$isDirty = true
                form.$isDirty = true
                form.querySelector("input[type='submit']").click()    
            }
            else{
                globalFeedbackBlip(ev, `This textual witness is already attached to Gloss '${glossIncipit}'`, false)
            }
        }                    
    })
    gloss_li.prepend(inclusionBtn)
    
    if(createScenario) { inclusionBtn.click() }
    else if(updateScenario) { 
        // Set the references input with the new gloss URI and update the form
        const refKey = witnessFragmentForm.querySelector("input[custom-key='references']")
        if(refKey.value !== obj["@id"]){
            refKey.value = obj["@id"]
            refKey.setAttribute("value", obj["@id"]) 
            refKey.$isDirty = true
            witnessFragmentForm.$isDirty = true
            witnessFragmentForm.querySelector("input[type='submit']").click() 
        }
    }
}

/**
 * On page load and after submission DEER will announce this form as rendered.
 * Set up all the default values.
 */
addEventListener('deer-form-rendered', glossFormReset)


/**
 * Prefills the tags area in the form with provided tag data and builds the UI.
 * @param {object|array|string} tagData - The tag data to prefill.
 * @param {HTMLFormElement} form - The form element where the tags area is located.
 * @returns {boolean} - Returns false if there is no tag data.
 */
function prefillTagsArea(tagData, form = document.getElementById("witnessFragmentForm")) {
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
 * Mark the line selections through mark.js and prepare selection form input.
 * 
 * @param linesArr - A single Witness's text selection.  A flat array of TPEN Project Line id's containing a textual fragment selection #char=x,y.
 * @param form - The form containing the selection input
 * @param togglePages - A flag for whether or not to fire the page toggling UI.  Happens when loading up a witness via the browser hash. 
 */
function preselectLines(linesArr, form, fragmentSelections) {
    if(!fragmentSelections?.source && fragmentSelections?.value) fragmentSelections = null
    function quickDecode(html) {
        // This helps with detecting the persists mark and knowing not to write over it.
        const txt = document.createElement("textarea")
        txt.innerHTML = html
        const val = txt.value
        txt.remove()
        return val
    }
    
    if (linesArr === undefined) {
        console.warn("Cannot highlight lines in UI.  There is no data.")
        return false
    }
    linesArr = linesArr.value ?? linesArr
    if (linesArr.length === 0) {
        console.warn("There are no lines recorded for this witness")
        return false
    }
    const source = fragmentSelections?.source ?? null
    fragmentSelections = fragmentSelections?.value ?? fragmentSelections

    /**
     * The check for whether it should be green or yellow.
     * If a #WitnessFragment entity is loaded, its selection should be specifically noted in fragmentSelections.
     * If those fragmentSelections 'match' the array of lines to select, then this is the green selection.
     */ 
    const activeSelection = fragmentSelections && linesArr.every(l=>fragmentSelections.includes(l)) && fragmentSelections.every(l=>linesArr.includes(l))

    const selectionsElem = form.querySelector("input[custom-key='selections']")
    let remark_map = {}
    if(source?.citationSource){
        selectionsElem.setAttribute("deer-source", source.citationSource ?? "")
    }
    if(witnessFragmentID) selectionsElem.value = linesArr.join("__")

    // Now Mark the lines
    linesArr.forEach(line => {
        try{
            const lineid = line.split("#")[0]
            const selection = line.split("#")[1].replace("char=", "").split(",").map(num => parseInt(num))
            const lineElem = document.querySelector(`div[tpen-project-line-id="${lineid}"]`)
            // Do not accidentally overrule a .persists mark (the mark for #witnessURI).  It is both .persists and .pre-select, but .persists takes precedence. 
            const checkInner = quickDecode(lineElem.innerHTML)
            if(checkInner.indexOf('<mark data-markjs="true" class="persists">') === selection[0]) return
            
            const remark_map = unmarkTPENLineElement(lineElem)
            lineElem.classList.add("has-selection")
            const textLength = lineElem.textContent.length
            const lengthOfSelection = (selection[0] === selection[1]) 
                ? 1
                : (selection[1] - selection[0]) + 1
            const markup = new Mark(lineElem)
            if(activeSelection) lineElem.parentElement.previousElementSibling.classList.add("has-selection")
            let options = activeSelection ? {className:"persists"} : {className:"pre-select"}
            options.exclude = [".persists"]
            markup.markRanges([{
                start: selection[0],
                length: lengthOfSelection
            }], options)    
            remarkTPENLineElements(remark_map)
        }
        catch(err){
            console.error(err)
        }
    })
    if(activeSelection){
        document.querySelectorAll(".togglePage:not(.has-selection)").forEach(tog => {
            if(!tog.classList.contains("is-toggled")){
                tog.click()
            }
        })    
    }
}

/**
 * Recieve a TPEN project as input from #needs.  Reload the page with a set ?tpen-project URL parameter.
*/
function loadURI(){
    let tpenProjectLink = resourceURI.value ? resourceURI.value : getURLParameter("tpen-project") ? decodeURIComponent(getURLParameter("tpen-project")) : false
    if(tpenProjectLink){
        if(parseInt(tpenProjectLink)){
            tpenProjectLink = `https://t-pen.org/TPEN/project/${tpenProjectLink}`
        }
        let url = new URL(window.location.href)
        url.searchParams.append("tpen-project", tpenProjectLink)
        window.location = url
    }
    else{
        const ev = new CustomEvent("You must supply a URI via the IIIF Content State iiif-content parameter or supply a value in the text input.")
        globalFeedbackBlip(ev, `You must supply a URI via the IIIF Content State iiif-content parameter or supply a value in the text input.`, false)
    }
}

/**
 * The DEER announcement for when all form fields have been saved or updated.
 * Extend this functionality by also saving or updating the custom fields.
 * 
 */ 
addEventListener('deer-updated', event => {
    // We don't want the typical DEER form stuff to happen.  This may have no effect, not sure.
    event.preventDefault()
    event.stopPropagation()
    const $elem = event.target
    const entityID = event.detail["@id"]  
    const shelfmark = $elem.querySelector("input[deer-key='identifier']")?.value
    // Hmm maybe do this separation of handling a bit different.
    if($elem?.id === "manuscriptWitnessForm"){
        // We generated the Manuscript Witness and can use this ID as part of the fragment for submit
        activateFragmentForm(event.detail["@id"], shelfmark, true)
        console.log("Manuscript Witness Fully Saved")
        const ev = new CustomEvent("Manuscript Witness Submitted")
        globalFeedbackBlip(ev, `Manuscript Witness Saved and Loaded In`, true)
        return
    }
    else if($elem?.id  !== "witnessFragmentForm") return

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
                if(key === "references"){
                    const glossURIs = el.value.split("__")
                    paginateButtonsAfterSubmit(glossURIs)
                }
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
        const ev = new CustomEvent("Witness Save Error")
        globalFeedbackBlip(ev, `Witness Save Error`, false)
    })
})

/**
 * Used with preselectLines().  This line element may already contain a mark.  That mark needs to be removed.
 * Each mark removed will need to be restored later.
 */ 
function unmarkTPENLineElement(lineElem){
    let remark_map = {}
    let persistent_map = {}
    const lineid = lineElem.getAttribute("tpen-line-id")
    remark_map[lineid] = []
    persistent_map[lineid] = []
    for(const mark of lineElem.querySelectorAll(".pre-select")){
       remark_map[lineid].push(mark.textContent)
    }
    for(const mark of lineElem.querySelectorAll(".persists")){
        persistent_map[lineElem.getAttribute("tpen-line-id")].push(mark.textContent)
    }
    const unmarkup = new Mark(lineElem)
    unmarkup.unmark({"className" : "pre-select"})
    unmarkup.unmark({"className" : "persists"})
    const o = {
        "pre-select" : remark_map,
        "persists" : persistent_map
    }
    return o
}

/**
 * Used with capstureSelectedText().  There is a range of line elements and any one of them may already contain a mark.  
 * Each mark needs to be removed.  Each mark removed will need to be restored later.
 */ 
function unmarkTPENLineElements(startEl, stopEl){
    let unmarkup = new Mark(startEl)
    let remark_map = {}
    let persistent_map = {}
    const stopID = stopEl.getAttribute("tpen-line-id")
    // Upstream from this the selection in startEl is checked for a <mark>.  We know it does not have a <mark> here.
    remark_map[startEl.getAttribute("tpen-line-id")] = []
    persistent_map[startEl.getAttribute("tpen-line-id")] = []
    for(const mark of startEl.querySelectorAll(".pre-select")){
        // For each thing you want to unmark, grab the text so we can remark it
        remark_map[startEl.getAttribute("tpen-line-id")].push(mark.textContent)
    }
     for(const mark of startEl.querySelectorAll(".persists")){
        // For each thing you want to unmark, grab the text so we can remark it
        persistent_map[startEl.getAttribute("tpen-line-id")].push(mark.textContent)
    }
    unmarkup.unmark({"className" : "pre-select"})
    unmarkup.unmark({"className" : "persists"})
    if(stopID !== startEl.getAttribute("tpen-line-id")){
        // The selection happened over multiple lines.  Any of those lines may contain a <mark>.  If they do, it is an invalid selection.
        let nextEl = startEl.nextElementSibling
        while(nextEl.getAttribute("tpen-line-id") !== stopID){
            if(nextEl.nextElementSibling){
                nextEl = nextEl.nextElementSibling
            }
            else{
                //We are at the end of a page and are going on to the next page.  Get to the next page element and get the first line element.
                nextEl = nextEl.closest(".pageContainer").nextElementSibling.nextElementSibling.nextElementSibling.firstChild
            }
            if(nextEl.querySelector("mark") && stopID !== nextEl.getAttribute("tpen-line-id")){
                // The user selection contains a <mark> and is invalid.
                const ev = new CustomEvent("Your selection contained text marked for another selection.  Make a different selection.")
                globalFeedbackBlip(ev, `Your selection contained text marked for another selection.  Make a different selection.`, false)
                // remove browser's text selection
                undoBrowserSelection(s)
                // rebuild valid marks that were removed
                remarkTPENLineElements(remark_map)
                return null
            }
            remark_map[nextEl.getAttribute("tpen-line-id")] = []
            // For each thing you want to unmark, grab the text so we can remark it
            for(const mark of nextEl.querySelectorAll(".pre-select")){
                remark_map[nextEl.getAttribute("tpen-line-id")].push(mark.textContent)
            }
            for(const mark of nextEl.querySelectorAll(".persists")){
                persistent_map[nextEl.getAttribute("tpen-line-id")].push(mark.textContent)
            }
            unmarkup = new Mark(nextEl)
            unmarkup.unmark({"className" : "pre-select"})
            unmarkup.unmark({"className" : "persists"})
        }
        // Upstream from this the selection in stopEl is checked for a <mark>.  We know it does not have a <mark> here.
        remark_map[stopEl.getAttribute("tpen-line-id")] = []
        for(const mark of stopEl.querySelectorAll(".pre-select")){
            // For each thing you want to unmark, grab the text so we can remark it
            remark_map[stopEl.getAttribute("tpen-line-id")].push(mark.textContent)
        }
        for(const mark of stopEl.querySelectorAll(".persists")){
            // For each thing you want to unmark, grab the text so we can remark it
            persistent_map[stopEl.getAttribute("tpen-line-id")].push(mark.textContent)
        }
        unmarkup = new Mark(stopEl)
        unmarkup.unmark({"className" : "pre-select"})
        unmarkup.unmark({"className" : "persists"})
    }
    return {
        "pre-select" : remark_map,
        "persists" : persistent_map
    }
}

/**
 * Replace Marks that were undone during selection object get and set scenarios.
 * 
 * @param markData A Map of line ids that correlate to a line element.  The value is an array of strings to Mark within the line element.
 */ 
function remarkTPENLineElements(markData){
    // restore the marks that were there before the user did the selection
    for(const id in markData["pre-select"]){
        const restoreMarkElem = document.querySelector(`div[tpen-line-id="${id}"]`)
        const markit = new Mark(restoreMarkElem)
        const strings = markData["pre-select"][id]
        strings.forEach(str => {
            markit.mark(str, {
                diacritics : true,
                separateWordSearch : false,
                className : "pre-select",
                acrossElements : true,
                accuracy: "complimentary"
            })    
        })
    }
    for(const id in markData.persists){
        const restoreMarkElem = document.querySelector(`div[tpen-line-id="${id}"]`)
        const markit = new Mark(restoreMarkElem)
        const strings = markData.persists[id]
        strings.forEach(str => {
            markit.mark(str, {
                diacritics : true,
                separateWordSearch : false,
                className : "persists",
                acrossElements : true,
                accuracy: "complimentary"
            })    
        })
    }
}

/**
 * Check for existing Manuscript Witnesses with the provided shelfmark.
 * Paginate so the user can choose an existing Manuscript Witness, or make a new one.
 */ 
checkForManuscriptsBtn.addEventListener('click', async (ev) => {
    const shelfmarkElem = manuscriptWitnessForm.querySelector("input[deer-key='identifier']")
    if(shelfmarkElem.hasAttribute("disabled")){
        shelfmarkElem.removeAttribute("disabled")
        checkForManuscriptsBtn.value = "Check for Existing Manuscript Witnesses"
        submitManuscriptsBtn.classList.add("is-hidden")
        manuscriptWitnessForm.querySelectorAll(".detect-witness").forEach(elem => elem.classList.remove("is-hidden"))
        return
    }
    const match = await getManuscriptWitnessFromShelfmark(shelfmarkElem.value.trim())
    if(!match) {
        checkForManuscriptsBtn.value = "Click to Change Shelfmark and Search Again"
        shelfmarkElem.setAttribute("disabled", "")
        manuscriptsFound.classList.add("is-hidden")
        manuscriptWitnessForm.querySelectorAll(".detect-witness").forEach(elem => elem.classList.remove("is-hidden"))
        manuscriptsResult.innerHTML = ""
        submitManuscriptsBtn.classList.remove("is-hidden")
        return
    }
    populateManuscriptWitnessChoices(match)
    manuscriptWitnessForm.querySelectorAll(".detect-witness").forEach(elem => elem.classList.add("is-hidden"))
})

/**
 * After a source text loads we need to know if there are any existing Witness Fragments for it.
 * We use that information to preselect text and paginate 'attach' buttons in the Gloss picker.
 * In this case, we know the source URI.
 * Query RERUM or cache for those Witness Fragments.  We need to know their references and selections.
 * Note: 
 * If we can decouple this from preselectLines() it can become a shared function in shared.js 
 * This seems to do both the logic of getting the fragments and the UI work to put them on screen.
 * 
 * @param event - source-text-loaded 
 */ 
async function getAllWitnessFragmentsOfSource(fragmentSelections=null, sourceValue=null){
    if(!sourceValue) return
    const lineSelectorElem = document.querySelector(".lineSelector")
    if(!(lineSelectorElem?.hasAttribute("source-text-loaded") || lineSelectorElem?.hasAttribute("tpen-lines-loaded"))){
        console.error("There is no reason to run this function because we cannot supply the results to a non-existent UI.  Wait for the text content to load.")
        return 
    }
    /**
     * Other asyncronous loading functionality may already know the glosses and their fragments.
     * @see witnessFragmentsObj
     * If so, use that cached info to perform the UI tasks and break out of the function.
     */ 
    if(Object.keys(witnessFragmentsObj).length > 0){
        for(const witnessInfo in Object.values(witnessFragmentsObj)){
            witnessInfo.glosses.forEach(glossURI => {
                // For each Gloss URI find its corresponding 'attach' button and ensure it is classed as a Gloss that is already attached to this source.
                document.querySelectorAll(`.toggleInclusion[data-id="${glossURI}"]`).forEach(btn => {
                    btn.classList.add("attached-to-source")
                })    
            })
            preselectLines(witnessInfo.selections, witnessFragmentForm, fragmentSelections)
        }
        if(witnessFragmentID || manuscriptWitnessForm.hasAttribute("matched")){
            witnessFragmentForm.classList.remove("is-hidden")
        }
        return
    }
    const historyWildcard = { "$exists": true, "$size": 0 }
    // Each source annotation targets a Witness.
    // Get all the source annotations whose value is this source string (URI or text string)
    const sourceAnnosQuery = {
        "body.source.value": isURI(sourceValue) ? httpsIdArray(sourceValue) : sourceValue,
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }

    const fragmentUriSet = await getPagedQuery(100, 0, sourceAnnosQuery)
    .then(annos => {
        return new Set(annos.map(anno => anno.target))
    })
    .catch(err => {
        console.error(err)
        return Promise.reject([])
    })

    let glossUriSet = new Set()    
    let all = []
    for (const fragmentURI of fragmentUriSet){
        // Each Witness has an Annotation whose body.value references [a Gloss]
        const referencesAnnosQuery = {
            "target" : httpsIdArray(fragmentURI),
            "body.references.value": { $exists:true },
            "__rerum.history.next": historyWildcard,
            "__rerum.generatedBy" : httpsIdArray(__constants.generator)
        }
        // It also has selections we need to highlight
        const selectionsAnnosQuery = {
            "target" : httpsIdArray(fragmentURI),
            "body.selections.value": { $exists:true },
            "__rerum.history.next": historyWildcard,
            "__rerum.generatedBy" : httpsIdArray(__constants.generator)
        }
        all.push(fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
            method: "POST",
            mode: 'cors',
            headers: {
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(referencesAnnosQuery)
        })
        .then(response => response.json())
        .then(annos => {
            // Keep this information in the witnessFragmentsObj from shared.js
            if(!witnessFragmentsObj.hasOwnProperty(fragmentURI)) witnessFragmentsObj[fragmentURI] = {}
            witnessFragmentsObj[fragmentURI].glosses = new Set([...glossUriSet, ...new Set(annos.map(anno => anno.body.references.value).flat())])
            glossUriSet = new Set([...glossUriSet, ...new Set(annos.map(anno => anno.body.references.value).flat())])
            return Promise.resolve(witnessFragmentsObj)
        })
        .catch(err => {
            console.error(err)
            return Promise.reject([])
        }))

        all.push(fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
            method: "POST",
            mode: 'cors',
            headers: {
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(selectionsAnnosQuery)
        })
        .then(response => response.json())
        .then(annos => {
            // Keep this information in the witnessFragmentsObj from shared.js
            if(!witnessFragmentsObj.hasOwnProperty(fragmentURI)) witnessFragmentsObj[fragmentURI] = {}
            const existingSelections = witnessFragmentsObj[fragmentURI].selections ? witnessFragmentsObj[fragmentURI].selections : []
            const moreSelections = annos.map(anno => anno.body.selections.value).flat()
            const selections = new Set([...existingSelections, ...moreSelections])
            witnessFragmentsObj[fragmentURI].selections = [...selections.values()]
            return Promise.resolve(witnessFragmentsObj)
        })
        .catch(err => {
            console.error(err)
            return Promise.reject([])
        })
        )
    }

    Promise.all(all)
    .then(success => {
        witnessFragmentsObj.referencedGlosses = glossUriSet
        for(const fragmentURI in witnessFragmentsObj){
            if(fragmentURI === "referencedGlosses") continue
            const witnessInfo = witnessFragmentsObj[fragmentURI]
            witnessInfo.glosses.forEach(glossURI => {
                // For each Gloss URI find its corresponding 'attach' button and ensure it is classed as a Gloss that is already attached to this source.
                document.querySelectorAll(`.toggleInclusion[data-id="${glossURI}"]`).forEach(btn => {
                    btn.classList.add("attached-to-source")
                })    
            })
            preselectLines(witnessInfo.selections, witnessFragmentForm, fragmentSelections)
        }
        if(witnessFragmentID || manuscriptWitnessForm.hasAttribute("matched")){
            witnessFragmentForm.classList.remove("is-hidden")
        }
    })
    .catch(err => {
        console.error("Witnesses Object Error")
        console.error(err)
        const ev = new CustomEvent("Witnesses Object Error")
        globalFeedbackBlip(ev, `Witnesses Object Error`, false)
    })
}
