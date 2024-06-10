const textWitnessID = window.location.hash.substring(1)
let tpenProjectURI = getURLParameter("tpen-project") ? decodeURIComponent(getURLParameter("tpen-project")) : null
let referencedGlossID = null
// UI for when the provided T-PEN URI does not resolve or cannot be processed.
document.addEventListener("tpen-lines-error", function(event){
    const ev = new CustomEvent("TPEN Lines Error")
    look.classList.add("text-error")
    look.innerText=`Could not get T-PEN project ${tpenProjectURI}`
    witnessForm.remove()
    loading.classList.add("is-hidden")
    globalFeedbackBlip(ev, `Error loading TPEN project '${tpenProjectURI}'`, false)
})

// Make the text in the Gloss modal form the same as the one in the Witness form
document.addEventListener("gloss-modal-visible", function(event){
    const text = witnessForm.querySelector("textarea[custom-text-key='text']").value
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
    const ev = new CustomEvent("Transcription Witness Details Error")
    look.classList.add("text-error")
    look.innerText = "Could not get Transcription Witness information."
    witnessForm.remove()
    loading.classList.add("is-hidden")
    globalFeedbackBlip(ev, `Error getting data for '${uri}'`, false)
})

/**
 * Attach all the event handlers to the custom key areas.
 * Prepare the UI/UX for either 'create' or 'update' scenarios depending on the url hash.
 * Set fixed value fields and make those inputs dirty.
 */ 
window.onload = () => {
    setPublicCollections()
    setListings()
    const dig_location = witnessForm.querySelector("input[custom-key='source']")
    const deleteWitnessButton = document.querySelector(".deleteWitness")
    addEventListener('tpen-lines-loaded', getAllWitnesses)
    if(tpenProjectURI) {
        if(!tpenProjectURI.includes("t-pen.org")){
            const ev = new CustomEvent("TPEN Project Error")
            look.classList.add("text-error")
            look.innerText=`Provided URI is not from T-PEN.  Only use T-PEN project or manifest URIs.`
            witnessForm.remove()
            loading.classList.add("is-hidden")
            globalFeedbackBlip(ev, `Provided project URI is not from T-PEN.`, false)
            needs.classList.add("is-hidden")
            return
        }
        document.querySelector("tpen-line-selector").setAttribute("tpen-project", tpenProjectURI)
        needs.classList.add("is-hidden")
        document.querySelectorAll(".tpen-needed").forEach(el => el.classList.remove("is-hidden"))
        dig_location.value = tpenProjectURI
        dig_location.setAttribute("value", tpenProjectURI)
    }
    if(textWitnessID){
        const submitBtn = witnessForm.querySelector("input[type='submit']")
        const deleteBtn = witnessForm.querySelector(".deleteWitness")
        submitBtn.value = "Update Textual Witness"
        submitBtn.classList.remove("is-hidden")
        deleteBtn.classList.remove("is-hidden")
        witnessForm.setAttribute("deer-id", textWitnessID)
        deleteWitnessButton.addEventListener("click", async ev => {
            const customMessage = "The witness will be deleted. This action cannot be undone."
            if(await showCustomConfirm(customMessage)) {
                deleteWitness(textWitnessID, true)
            }
        })
    }
    else{
        // These items have default values that are dirty on fresh forms.
        dig_location.$isDirty = true
        witnessForm.querySelector("select[custom-text-key='language']").$isDirty = true
        witnessForm.querySelector("input[custom-text-key='format']").$isDirty = true
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
}

/**
 * Detects that all annotation data is gathered and all HTML of the form is in the DOM and can be interacted with.
 * This is important for pre-filling or pre-selecting values of multi select areas, dropdown, checkboxes, etc. 
 * @see deer-record.js DeerReport.constructor()  
 */
addEventListener('deer-form-rendered', init)
if(!textWitnessID) removeEventListener('deer-form-rendered', init)
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
            // We will need to know the reference for addButton() so let's get it out there now.
            const sourceURI = annotationData?.source?.value[0]
            tpenProjectURI = tpenProjectURI ? tpenProjectURI : annotationData?.source?.value[0]
            if(!tpenProjectURI) return
            if(sourceURI && sourceURI !== tpenProjectURI){
                const ev = new CustomEvent("TPEN Lines Error")
                look.classList.add("text-error")
                look.innerText=`Provided TPEN project URI does not match source URI.  There can only be one source.  Remove the ?tpen-project variable from the URL in your browser's address bar and refresh the page.`
                witnessForm.remove()
                loading.classList.add("is-hidden")
                globalFeedbackBlip(ev, `TPEN source project mismatch.`, false)
                needs.classList.add("is-hidden")
                return
            }
            needs.classList.add("is-hidden")
            document.querySelector("tpen-line-selector").setAttribute("tpen-project", tpenProjectURI)
            document.querySelectorAll(".tpen-needed").forEach(el => el.classList.remove("is-hidden"))
            referencedGlossID = annotationData["references"]?.value[0].replace(/^https?:/,'https:')
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
                preselectLines(annotationData["selections"], $elem, true)
            }
            else{
                addEventListener('tpen-lines-loaded', ev => {
                    preselectLines(annotationData["selections"], $elem, true)
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
 * Reset all the Witness form elements so the form is ready to generate a new Witness.
 * This occurs after the user submits a new witness.
 * If they provided a witness URI in the hash, then this is an 'update scenario'. Do not perform the reset.
 */ 
function setWitnessFormDefaults(){
    // Continue the session like normal if they had loaded up an existing witness and updated it.
    if(textWitnessID) return 
    
    const form = witnessForm
    form.setAttribute("deer-id", "")
    form.setAttribute("deer-source", "")
    form.$isDirty = true
    form.querySelectorAll("input[deer-source]").forEach(i => {
        i.removeAttribute("deer-source")
    })
    form.querySelectorAll("textarea[deer-source]").forEach(t => {
        t.removeAttribute("deer-source")
    })
    // For when we test
    // form.querySelector("input[deer-key='creator']").value = "BryanDelete"
    
    const labelElem = form.querySelector("input[deer-key='title']")
    labelElem.value = ""
    labelElem.setAttribute("value", "")
    labelElem.$isDirty = false

    const shelfmarkElem = form.querySelector("input[deer-key='identifier']")
    shelfmarkElem.$isDirty = true

    const formatElem = form.querySelector("input[custom-text-key='format']")
    formatElem.checked = false
    formatElem.$isDirty = true

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
    const sourceElem = form.querySelector("input[custom-key='source']")
    sourceElem.$isDirty = true

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
 * When the Gloss Collection List deer view loads its records (by finishing the paged query) we can show the witness form.
 * Note the Collection List may still need to fully populate and cache, but it has a UI/UX for that.
 */ 
addEventListener('deer-view-rendered', show)

function show(event){
    if(event.target.id == "ngCollectionList"){
        loading.classList.add("is-hidden")
        if(tpenProjectURI) witnessForm.classList.remove("is-hidden")
        // This listener is no longer needed.
        removeEventListener('deer-view-rendered', show)
    }
}

/**
 * When a filterableListItem loads, add the 'attach' or 'attached' button to it.
 */ 
addEventListener('deer-view-rendered', addButton)

/**
 * On page load and after submission DEER will announce this form as rendered.
 * Set up all the default values.
 */
addEventListener('deer-form-rendered', formReset)

function formReset(event){
    let whatRecordForm = event.target.id ? event.target.id : event.target.getAttribute("name")
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
function preselectLines(linesArr, form, togglePages) {

    function quickDecode(html) {
        // This helps with detecting the persists mark and knowing not to write over it.
        const txt = document.createElement("textarea")
        txt.innerHTML = html
        const val = txt.value
        txt.remove()
        return val
    }

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
    let remark_map = {}
    if(source?.citationSource){
        selectionsElem.setAttribute("deer-source", source.citationSource ?? "")
    }
    if(textWitnessID) selectionsElem.value = linesArr.join("__")

    // Now Mark the lines
    linesArr.forEach(line => {
        try{
            const lineid = line.split("#")[0]
            const selection = line.split("#")[1].replace("char=", "").split(",").map(num => parseInt(num))
            const lineElem = document.querySelector(`div[tpen-project-line-id="${lineid}"]`)
            // Do not accidentally overrule a .persists mark (the mark for #witnessURI).  It is both .persists and .pre-select, but .persists takes precedence. 
            const checkInner = quickDecode(lineElem.innerHTML)
            if(checkInner.indexOf('<mark data-markjs="true" class="persists">') === selection[0]) return
            if(togglePages) lineElem.parentElement.previousElementSibling.classList.add("has-selection")
            const remark_map = unmarkTPENLineElement(lineElem)
            lineElem.classList.add("has-selection")
            const textLength = lineElem.textContent.length
            const lengthOfSelection = (selection[0] === selection[1]) 
                ? 1
                : (selection[1] - selection[0]) + 1
            const markup = new Mark(lineElem)
            let options = togglePages ? {className:"persists"} : {className:"pre-select"}
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
    if(togglePages){
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
        const ev = new CustomEvent("Witness Save Error")
        globalFeedbackBlip(ev, `Witness Save Error`, false)
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
    const glossURI = gloss["@id"].replace(/^https?:/,'https:')
    modal.classList.add("is-hidden")

    const li = document.createElement("li")
    const div = document.createElement("div")
    // Make this a deer-view so this Gloss is expanded and cached, resulting in more attributes for this element to be filtered on.
    div.classList.add("deer-view")
    div.setAttribute("deer-template", "filterableListItem")
    div.setAttribute("deer-id", gloss["@id"])
    div.setAttribute("deer-link", "ng.html#")
    li.setAttribute("data-title", title)
    
    // We know the title already so this makes a handy placeholder :)
    li.innerHTML = `<span class="serifText"><a target="_blank" href="ng.html#${gloss["@id"]}">${title}...</a></span>`
    // This helps filterableListItem know how to style the attach button, and also lets us know to change count/total loaded Glosses.
    if(textWitnessID){
        div.setAttribute("update-scenario", "true")
    }
    else{
        div.setAttribute("create-scenario", "true")
    }
    div.appendChild(li)
    list.appendChild(div)
    setTimeout(function() {
        broadcast(undefined, "deer-view", div, { set: [div] })
    }, 1)
})

/**
 * After a filterableListItem loads, we need to determine what to do with its 'attach' button.
 * In create/update scenarios, this will result in the need to click a button
 * In loading scenarios, if a text witness URI was supplied to the page it will have a gloss which should appear as 'attached'.
 */ 
function addButton(event) {
    const template_container = event.target
    if(template_container.getAttribute("deer-template") !== "filterableListItem") return
    const obj = event.detail
    const gloss_li = template_container.firstElementChild
    const createScenario = template_container.hasAttribute("create-scenario")
    const updateScenario = template_container.hasAttribute("update-scenario")
    // A new Gloss has been introduced and is done being cached.
    let inclusionBtn = document.createElement("input")
    inclusionBtn.setAttribute("type", "button")
    inclusionBtn.setAttribute("data-id", obj["@id"])
    let already = false
    if(witnessesObj?.referencedGlosses){
        already = witnessesObj.referencedGlosses.has(obj["@id"]) ? "attached-to-source" : ""
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
        if(textWitnessID && referencedGlossID === obj["@id"]){
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
        const refKey = witnessForm.querySelector("input[custom-key='references']")
        if(refKey.value !== obj["@id"]){
            refKey.value = obj["@id"]
            refKey.setAttribute("value", obj["@id"]) 
            refKey.$isDirty = true
            witnessForm.$isDirty = true
            witnessForm.querySelector("input[type='submit']").click() 
        }
    }
}

// Paginate the '➥ attach' and possibly '✓ attached' button(s) after a Witness submission.
function paginateButtonsAfterSubmit(glossURIs){
    const previouslyChosen = document.querySelector(".toggleInclusion.success")
    glossURIs.forEach(glossURI => {
        glossURI = glossURI.replace(/^https?:/,'https:')
        document.querySelectorAll(`.toggleInclusion[data-id="${glossURI}"]`).forEach(inclusionBtn => {
            inclusionBtn.classList.add("attached-to-source")
            inclusionBtn.setAttribute("value", "❢ attach")
            inclusionBtn.setAttribute("title", "This gloss was attached in the past.  Be sure before you attach it.")
            if(previouslyChosen){
                // If there is an '✓ attached' one on the page already, this is an update scenario.
                // The '➥ attach' button that was clicked is now the chosen Gloss for the loaded Witness.
                // The '✓ attached' one is no longer connected to this Witness or Source URL via this Witness.
                inclusionBtn.setAttribute("disabled", "")
                inclusionBtn.setAttribute("value", "✓ attached")
                inclusionBtn.setAttribute("title", "This Gloss is already attached!")
                inclusionBtn.classList.remove("primary")
                inclusionBtn.classList.add("success")
                previouslyChosen.removeAttribute("disabled")
                previouslyChosen.setAttribute("value", "➥ attach")
                previouslyChosen.setAttribute("title", "Attach This Gloss and Save")
                previouslyChosen.classList.add("primary")
                previouslyChosen.classList.remove("success")
                previouslyChosen.classList.remove("attached-to-source")
            }
        })    
    })
}

function getAllWitnesses(event){
    getAllWitnessesOfSource(tpenProjectURI)
}

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