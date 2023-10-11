const textWitnessID = window.location.hash.substring(1)
let tpenProjectURI = textWitnessID ? false : getURLParameter("tpen-project") ? decodeURIComponent(getURLParameter("tpen-project")) : false
let referencedGlossID = null
// UI for when the provided T-PEN URI does not resolve or cannot be processed.
document.addEventListener("tpen-lines-error", function(event){
    document.querySelector(".tpenProjectLines").innerHTML = `<b class="text-error"> Could not get T-PEN project ${tpenProjectURI} </b>`
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
        document.querySelector("tpen-line-selector").setAttribute("tpen-project", tpenProjectURI)
        needs.classList.add("is-hidden")
        document.querySelectorAll(".tpen-needed").forEach(el => el.classList.remove("is-hidden"))
        dig_location.value = tpenProjectURI
        dig_location.setAttribute("value", tpenProjectURI)
    }
    if(textWitnessID){
        needs.classList.add("is-hidden")
        const submitBtn = witnessForm.querySelector("input[type='submit']")
        const deleteBtn = witnessForm.querySelector(".deleteWitness")
        submitBtn.value = "Update Textual Witness"
        submitBtn.classList.remove("is-hidden")
        deleteBtn.classList.remove("is-hidden")
        witnessForm.setAttribute("deer-id", textWitnessID)
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
    deleteWitnessButton.addEventListener("click", ev => {
        if(confirm("The witness will be deleted.  This action cannot be undone.")){
            deleteWitness()
        }
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
            tpenProjectURI = annotationData.source.value[0]
            document.querySelector("tpen-line-selector").setAttribute("tpen-project", tpenProjectURI)
            document.querySelectorAll(".tpen-needed").forEach(el => el.classList.remove("is-hidden"))
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
    form.removeAttribute("deer-id")
    form.removeAttribute("deer-source")    
    form.$isDirty = true
    form.querySelector("input[deer-key='creator']").removeAttribute("deer-source")
    // For when we test
    //form.querySelector("input[deer-key='creator']").value = "MultiplicityTest"
    
    const labelElem = form.querySelector("input[deer-key='label']")
    labelElem.value = ""
    labelElem.setAttribute("value", "")
    labelElem.removeAttribute("deer-source")
    labelElem.$isDirty = false

    const shelfmarkElem = form.querySelector("input[deer-key='identifier']")
    shelfmarkElem.removeAttribute("deer-source")
    shelfmarkElem.$isDirty = true

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

    // The source value not change and would need to be captured on the next submit.
    const sourceElem = form.querySelector("input[custom-key='source']")
    sourceElem.removeAttribute("deer-source")
    sourceElem.$isDirty = true

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
 *  Delete a Witness of a Gloss.  
 *  This will delete the entity itself and its Annotations.  It will no longer appear as a Witness to the Gloss in any UI.
*/
async function deleteWitness(){
    if(!textWitnessID) return
    // No extra clicks while you await.
    const deleteWitnessButton = document.querySelector(".deleteWitness")
    deleteWitnessButton.setAttribute("disabled", "true")
    const annos_query = {
        "target" : httpsIdArray(textWitnessID),
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    let anno_ids =
        await fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json; charset=utf-8"                },
            body: JSON.stringify(annos_query)
        })
        .then(resp => resp.json()) 
        .then(annos => annos.map(anno => anno["@id"]))
        .catch(err => {
            return []
        })
    let delete_calls = anno_ids.map(annoUri => {
        return fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({ "@id": annoUri.replace(/^https?:/, 'https:') }),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            }
        })
        .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
        .catch(err => {
            console.warn(`There was an issue removing an Annotation: ${annoUri}`)
            console.log(err)
        })
    })

    delete_calls.push(
        fetch(`${__constants.tiny}/delete`, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            },
            body: JSON.stringify({"@id" : textWitnessID.replace(/^https?:/, 'https:')})
        })
        .then(resp => resp.json()) 
        .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
        .catch(err => {
            console.warn(`There was an issue removing the Witness: ${textWitnessID}`)
            console.log(err)
        })
    )
    Promise.all(delete_calls).then(success => {
        addEventListener("globalFeedbackFinished", ev=> {
            window.location = "ng.html#"
        })
        const ev = new CustomEvent("Witness Deleted.  You will be redirected.")
        globalFeedbackBlip(ev, `Witness Deleted.  You will be redirected.`, true)
    })
    .catch(err => {
        // OK they may be orphaned.  We will continue on towards deleting the entity.
        console.warn("There was an issue removing connected Annotations.")
        console.error(err)
        const ev = new CustomEvent("Error Deleting Witness")
        globalFeedbackBlip(ev, `Error Deleting Witness.  It may still appear.`, false)
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
 * Helper function for the specialized references key, which is an Array of URIs.
 * It needs to apply the filter with this Gloss's Label.
 * 
 * Currently only Firefox supports multiple selection ranges, other browsers will not add new ranges to the selection if it already contains one.
 * 
 */
function preselectLines(linesArr, form, togglePages) {
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
    linesArr.forEach(line => {
        try{
            let lineid = line.split("#")[0]
            let selection = line.split("#")[1].replace("char=", "").split(",").map(num => parseInt(num))
            const lineElem = document.querySelector(`div[tpen-project-line-id="${lineid}"]`)
            if(lineElem.classList.contains("has-selection")) return
            lineElem.classList.add("has-selection")
            lineElem.parentElement.previousElementSibling.classList.add("has-selection")
            const textLength = lineElem.innerText.length
            const lengthOfSelection = (selection[0] === selection[1]) 
                ? 1
                : (selection[1] - selection[0]) + 1
            let markup = new Mark(lineElem)
            let options = togglePages ? {className:"persists"} : {}
            Object.assign(options, {
                diacritics : true,
                className : "pre-select",
                acrossElements : true
            })
            markup.markRanges([{
                start: selection[0],
                length: lengthOfSelection
            }], options)    
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
    const tpenProjectLink = resourceURI.value ? resourceURI.value : getURLParameter("tpen-project") ? decodeURIComponent(getURLParameter("tpen-project")) : false
    if(tpenProjectLink){
        let url = new URL(window.location.href)
        url.searchParams.append("tpen-project", tpenProjectLink)
        window.location = url
    }
    else{
        //alert("You must supply a URI via the IIIF Content State iiif-content parameter or supply a value in the text input.")
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

    const selectedBtn = document.querySelector(".toggleInclusion[disabled]")
    if(selectedBtn){
        selectedBtn.setAttribute("title", "This gloss was attached in the past.  Be sure before you attach it.")
        selectedBtn.setAttribute("value", "❢ attach")
        selectedBtn.setAttribute("class", "toggleInclusion attached-to-source button primary")
        selectedBtn.removeAttribute("disabled")    
    }

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
    li.innerHTML = `<span><a target="_blank" href="ng.html#${gloss["@id"]}">${title}...</a></span>`
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
    const createScenario = !!template_container.hasAttribute("create-scenario")
    const updateScenario = !!template_container.hasAttribute("update-scenario")
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
    inclusionBtn.addEventListener('click', ev => {
        ev.preventDefault()
        ev.stopPropagation()
        const form = ev.target.closest("form")
        let blip = new CustomEvent("Blip")
        // There must be a shelfmark
        if(!form.querySelector("input[deer-key='identifier']").value){
            //alert("You must provide a Shelfmark value.")
            blip = new CustomEvent("You must provide a Shelfmark value.")
            globalFeedbackBlip(blip, `You must provide a Shelfmark value.`, false)
            return
        }
        // There must be a selection
        if(!form.querySelector("input[custom-key='selections']").value){
            //alert("Select some text first")
            blip = new CustomEvent("Select some text first.")
            globalFeedbackBlip(blip, `Select some text first.`, false)
            return   
        }
        const glossIncipit = ev.target.closest("li").getAttribute("data-title")
        const note = ev.target.classList.contains("attached-to-source") 
           ? `This Gloss has already been attached to this source.  Normally it would not appear in the same source a second time.  Be sure before you attach this Gloss.\nSave this textual witness for Gloss '${glossIncipit}'?`
           : `Save this textual witness for Gloss '${glossIncipit}'?`
        if((createScenario || updateScenario) || confirm(note)){
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
            document.querySelector(".persists").classList.remove("persists")
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

function getAllWitnesses(event){
    getAllWitnessesOfSource(tpenProjectURI)
}
