const witnessFragmentID = window.location.hash.substr(1)
let referencedGlossID = null
let existingManuscriptWitness = null
let sourceURI = getURLParameter("source-uri") ? decodeURIComponent(getURLParameter("source-uri")) : null
const loadTab = getURLParameter("tab") ? decodeURIComponent(getURLParameter("tab")) : null

// UI for when the provided T-PEN URI does not resolve or cannot be processed.
document.addEventListener("source-text-error", function(event){
    document.querySelector(".witnessText").innerHTML = `<b class="text-error"> Could not get Witness Text Data from ${sourceURI} </b>`
})

// Make the text in the Gloss modal form the same as the one in the Witness form
document.addEventListener("gloss-modal-visible", function(event){
    const text = witnessFragmentForm.querySelector("textarea[custom-text-key='text']").value
    const glossTextElem = event.target.querySelector("textarea[name='glossText']")
    glossTextElem.value = text
    glossTextElem.setAttribute("value", text)
    glossTextElem.dispatchEvent(new Event('input', { bubbles: true }))
})

function populateManuscriptWitnessChoices(matches){
    if (!matches) return
    if(typeof matches === "string") matches = [matches]
    manuscriptsResult.innerHTML = ""
    matches.forEach(id => {
        const choice = document.createElement("div")
        const view = document.createElement("deer-view")
        view.setAttribute("deer-id", id)
        view.setAttribute("deer-template", "shelfmark")
        view.innerText = "loading..."
        choice.setAttribute("manuscript", id)
        choice.classList.add("tag")
        choice.addEventListener("click", chooseManuscriptWitness)
        choice.appendChild(view)
        manuscriptsResult.appendChild(choice)
        broadcast(undefined, "deer-view", view, { set: [view] })
    })
    submitManuscriptsBtn.classList.remove("is-hidden")
    checkForManuscriptsBtn.value = "Check Again"
    manuscriptsFound.classList.remove("is-hidden")
}

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
        checkForManuscriptsBtn.value = "No Witnesses Found.  Change Shelfmark to Try Again."
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

function chooseManuscriptWitness(ev){
    const manuscriptChoiceElem = ev.target.tagName === "DEER-VIEW" ? ev.target.parentElement : ev.target
    const manuscriptID = manuscriptChoiceElem.getAttribute("manuscript")
    const partOfElem = witnessFragmentForm.querySelector("input[deer-key='partOf']")
    const shelfmark = manuscriptChoiceElem.querySelector("deer-view").innerText
    manuscriptWitnessForm.querySelector("input[deer-key='identifier']").value = shelfmark
    partOfElem.value = manuscriptID
    partOfElem.setAttribute("value", manuscriptID )
    partOfElem.dispatchEvent(new Event('input', { bubbles: true }))
    toggleFieldsDisabled(manuscriptWitnessForm, true)
    manuscriptWitnessForm.querySelectorAll(".button").forEach(btn => btn.classList.add("is-hidden"))
    manuscriptWitnessForm.classList.add("bg-light")
    witnessFragmentForm.classList.remove("is-hidden")
    providedShelfmark.innerText = shelfmark
    providedShelfmark.setAttribute("href", `manuscript-details.html#${manuscriptID}`)
    providedShelfmark.parentElement.classList.remove("is-hidden")
    existingManuscriptWitness = manuscriptID
    manuscriptsFound.classList.add("is-hidden")
    manuscriptWitnessForm.querySelectorAll(".detect-witness").forEach(elem => elem.classList.add("is-hidden"))
    document.querySelectorAll(".witness-needed").forEach(el => el.classList.remove("is-hidden"))
    console.log("Manuscript Witness Has Been Loaded In")
    const e = new CustomEvent("Manuscript Witness Loaded")
    globalFeedbackBlip(e, `Manuscript Witness Loaded`, true)
    return
}

async function getManuscriptWitnessFromShelfmark(shelfmark=null){
    const historyWildcard = { "$exists": true, "$size": 0 }
    if(!shelfmark){
        const ev = new CustomEvent("No shelfmark provided")
        globalFeedbackBlip(ev, `You must provide a shelfmark value.`, false)
        return
    }

    // Each shelfmark annotation targets a Witness entity.
    // Get all the shelfmark annotations whose value is this shelfmark string
    // Note both the Manscript Witness and Witness Fragment will have this shelfmark, we just want to know the Manuscript Witnesses.
    const shelfmarkAnnosQuery = {
        "body.identifier.value": httpsIdArray(shelfmark),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }

    const manuscriptUriSet = await getPagedQuery(100, 0, shelfmarkAnnosQuery)
    .then(async(annos) => {
        let manuscriptWitnessesOnly = new Set()
        for await (const anno of annos){
            const entity = await fetch(anno.target).then(resp => resp.json()).catch(err => {throw err})
            if(entity["@type"] && entity["@type"] === "TextWitness"){
                manuscriptWitnessesOnly.add(anno.target)
            }
        }
        return manuscriptWitnessesOnly
    })
    .catch(err => {
        console.error(err)
        throw err
    })

    console.log(`The following Manuscript Witnesses already exist with shelfmark ${shelfmark}`)
    console.log([...manuscriptUriSet.values()])

    if(manuscriptUriSet.size === 0){
        console.error(`There is no Manuscript Witness with this shelfmark`)
        return
    }
    else if (manuscriptUriSet.size > 1){
        console.error("There are multiple Manuscript Witnesses with this shelfmark and there should only be one.  This is an error.")
        return
    }
    
    // There should only be one unique entry.  If so, we just need to return the first next() in the set iterator.
    return manuscriptUriSet.values().next().value
}

async function getManuscriptWitnessFromFragment(fragmentURI=null){
    if(!fragmentURI){
        const ev = new CustomEvent("No Text Fragment URI provided")
        globalFeedbackBlip(ev, `You must provide the text fragment URI.`, false)
        return
    }
    const historyWildcard = { "$exists": true, "$size": 0 }
    // A fragment will have partOf Annotation(s) targeting it.  They will list the Manuscript Witness URI.
    const partOfAnnosQuery = {
        "body.partOf.value": {"$exists":true},
        "target": httpsIdArray(fragmentURI),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }

    const manuscriptUriSet = await getPagedQuery(100, 0, partOfAnnosQuery)
    .then(async(annos) => {
        let manuscriptWitnessesOnly = new Set()
        for await (const anno of annos){
            const entity = await fetch(anno.body.partOf.value).then(resp => resp.json()).catch(err => {throw err})
            if(entity["@type"] && entity["@type"] === "TextWitness"){
                manuscriptWitnessesOnly.add(anno.body.partOf.value)
            }
        }
        return manuscriptWitnessesOnly
    })
    .catch(err => {
        console.error(err)
        throw err
    })

    console.log(`This Witness Fragment is part of the following Manuscript Witness`)
    console.log(manuscriptUriSet.values())

    if(manuscriptUriSet.size === 0){
        console.error(`There is no Manuscript Witness for this Witness Fragment`)
        return
    }
    else if (manuscriptUriSet.size > 1){
        console.error("There are multiple Manuscript Witnesses and a choice must be made.")
        return
    }
    
    // There should only be one unique entry.  If so, we just need to return the first next() in the set iterator.
    return manuscriptUriSet.values().next().value
}

async function getManuscriptWitnessFromSource(source=null){
    if(!source){
        const ev = new CustomEvent("No source provided")
        globalFeedbackBlip(ev, `You must provide a source.`, false)
        return
    }
    const historyWildcard = { "$exists": true, "$size": 0 }
    const isURI = (urlString) => {
          try { 
            return Boolean(new URL(urlString))
          }
          catch(e){ 
            return false
          }
      }

    if(!isURI){
        const ev = new CustomEvent("Under Construction")
        globalFeedbackBlip(ev, `You can only provide sources as a URI for now.  Try again later.`, false)
        return
    }
    let manuscriptUriSet = null

    // Each source annotation targets a Witness.  Only need one because they will all target the same Witness
    const sourceAnnosQuery = {
        "body.source.value": httpsIdArray(source),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }

    const fragmentUriSet = await getPagedQuery(100, 0, sourceAnnosQuery)
    .then(async(annos) => {
        const fragments = annos.map(async(anno) => {
            const entity = await fetch(anno.target).then(resp => resp.json()).catch(err => {throw err})
            if(entity["@type"] && entity["@type"] === "TextFragment"){
                return anno.target
            }
        })
        const fragmentsOnly = await Promise.all(fragments).catch(err => {throw err} )
        return new Set(fragmentsOnly)
    })
    .catch(err => {
        console.error(err)
        throw err
    })

    if(fragmentUriSet.size === 0){
        console.error("There is no Manuscript Witness with this source")
        return
    }

    // There are many fragments with this source.  Those fragments are all a part of one Manuscript Witness.
    // We only need to check for the partOf Annotation on one fragment, even though we know them all.
    const fragmentURI = fragmentUriSet.values().next().value

    //each fragment has partOf Annotations letting you know the Manuscripts it is a part of.
    const partOfAnnosQuery = {
        "body.partOf.value": {"$exists":true},
        "target": httpsIdArray(fragmentURI),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    manuscriptUriSet = await getPagedQuery(100, 0, partOfAnnosQuery)
    .then(async(annos) => {
        let manuscriptWitnessesOnly = new Set()
        for await (const anno of annos){
            const entity = await fetch(anno.body.partOf.value).then(resp => resp.json()).catch(err => {throw err})
            if(entity["@type"] && entity["@type"] === "TextWitness"){
                manuscriptWitnessesOnly.add(anno.body.partOf.value)
            }
        }
        return manuscriptWitnessesOnly
    })
    .catch(err => {
        console.error(err)
        throw err
    })
    
    if(manuscriptUriSet.size === 0){
        console.error("There is no Manuscript Witness with this source")
        return
    }
    else if(manuscriptUriSet.size > 1){
        console.error("There are many Manuscript Witnesses when we only expect one.")
        return
    }
    return manuscriptUriSet.values().next().value
}

/**
 * Reset all the Witness form elements so the form is ready to generate a new Witness.
 * This occurs after the user submits a new witness.
 * If they provided a witness URI in the hash, then this is an 'update scenario'. Do not perform the reset.
 */ 
function setWitnessFormDefaults(){
    // Continue the session like normal if they had loaded up an existing witness and updated it.
    if(witnessFragmentID) return 
    
    const form = witnessFragmentForm  
    form.removeAttribute("deer-id")
    form.removeAttribute("deer-source")    
    form.$isDirty = true
    form.querySelectorAll("input[deer-source]").forEach(i => {
        i.removeAttribute("deer-source")
    })
    form.querySelectorAll("textarea[deer-source]").forEach(t => {
        t.removeAttribute("deer-source")
    })
    // For when we test
    document.querySelectorAll("input[deer-key='creator']").forEach(i => i.value = "BryanTryin")
    
    const labelElem = form.querySelector("input[deer-key='title']")
    labelElem.value = ""
    labelElem.setAttribute("value", "")
    labelElem.removeAttribute("deer-source")
    labelElem.$isDirty = false

    // I do not think this is supposed to reset.  It is likely they will use the same shelfmark.
    // const shelfmarkElem = manuscriptWitnessForm.querySelector("input[deer-key='identifier']")
    // shelfmarkElem.removeAttribute("deer-source")
    // shelfmarkElem.$isDirty = true

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
    const sourceElems = form.querySelectorAll("input[witness-source]")
    sourceElems.forEach(sourceElem => {
        sourceElem.removeAttribute("deer-source")
        sourceElem.$isDirty = true
    })
    
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
window.onload = async () => {
    setPublicCollections()
    setListings()
    if(witnessFragmentID){
        sourceURI = null
    }
    else if(sourceURI){
        const sourceElems = document.querySelectorAll("input[witness-source]")
        sourceElems.forEach(sourceElem => {
            sourceElem.value = sourceURI
            sourceElem.setAttribute("value", sourceURI)
            sourceElem.dispatchEvent(new Event('input', { bubbles: true }))
        })
        document.querySelector("source-text-selector").setAttribute("source-uri", sourceURI)
    }
    else{
        needs.classList.remove("is-hidden")
        loading.classList.add("is-hidden")
    }
    const deleteWitnessButton = document.querySelector(".deleteWitness")

    if(witnessFragmentID){
        // Usually will not include ?wintess-uri and if it does that source is overruled by the value of this textWitness's source annotation.
        addEventListener('deer-form-rendered', initFragmentForm)
        addEventListener('deer-form-rendered', initWitnessForm)
        addEventListener('source-text-loaded', getAllWitnessFragmentsOfManuscript)
        existingManuscriptWitness = await getManuscriptWitnessFromFragment(witnessFragmentID)
        .then(existingWitnessURI => existingWitnessURI)
        .catch(err => {
            const ev = new CustomEvent("Query Error")
            globalFeedbackBlip(ev, `The check for existing Witnesses failed.`, false)
            throw err
        })
        const submitBtn = witnessFragmentForm.querySelector("input[type='submit']")
        const deleteBtn = witnessFragmentForm.querySelector(".deleteWitness")
        needs.classList.add("is-hidden")
        document.querySelectorAll(".witness-needed").forEach(el => el.classList.remove("is-hidden"))
        submitBtn.value = "Update Witness"
        submitBtn.classList.remove("is-hidden")
        deleteBtn.classList.remove("is-hidden")
        witnessFragmentForm.setAttribute("deer-id", witnessFragmentID)
        manuscriptWitnessForm.setAttribute("deer-id", existingManuscriptWitness)
        // Note that we need to set the source-uri attribute for <source-text-selector> still
    }
    else{
        // These items have default values that are dirty on fresh forms.
        witnessFragmentForm.querySelector("select[custom-text-key='language']").$isDirty = true
        witnessFragmentForm.querySelector("input[custom-text-key='format']").$isDirty = true
        if(sourceURI) {
            // special handler for ?wintess-uri=
            addEventListener('source-text-loaded', getAllWitnessFragmentsOfSource)
            addEventListener('deer-form-rendered', initWitnessForm)
            const match = await getManuscriptWitnessFromSource(sourceURI)
            loading.classList.add("is-hidden")
            manuscriptWitnessForm.classList.remove("is-hidden")
            if(match) populateManuscriptWitnessChoices(match)
        }
    }

    // Support the '?tab=' URL parameter
    if(loadTab){
        document.querySelector(`.ui-tab[name="${loadTab}"]`).click()
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
    // Note that this HTML element is a checkbox
    witnessFragmentForm.querySelector("input[custom-text-key='format']").addEventListener("click", ev => {
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
    deleteWitnessButton.addEventListener("click", async ev => {
        if(await showCustomConfirm("The witness will be deleted.  This action cannot be undone.")){
            deleteWitness()
        }
    })
}

/**
 * When the Gloss Collection List deer view loads its records (by finishing the paged query) we can show the witness form.
 * Note the Collection List may still need to fully populate and cache, but it has a UI/UX for that.
 */ 
// addEventListener('deer-view-rendered', show)

// function show(event){
//     if(event.target.id == "ngCollectionList"){
//         loading.classList.add("is-hidden")
//         if(sourceURI || witnessFragmentID) {
//             manuscriptWitnessForm.classList.remove("is-hidden")
//         }
//         else{
//             needs.classList.remove("is-hidden")
//         }
//         // This listener is no longer needed.
//         removeEventListener('deer-view-rendered', show)
//     }
// }

/**
 * When a filterableListItem loads, add the 'attach' or 'attached' button to it.
 */ 
addEventListener('deer-view-rendered', addButton)

/**
 * Paginate the custom data fields in the Witness form.  Only happens if the page has a hash.
 * Note this only needs to occur one time on page load.
 */ 
function initFragmentForm(event){
    let whatRecordForm = event.target?.id
    let annotationData = event.detail ?? {}
    const textSelectionElem = document.querySelector("source-text-selector")
    const $elem = event.target
    if(whatRecordForm !== "witnessFragmentForm") return
    const sourceURI = annotationData?.source?.value
    if(sourceURI)
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
    if(textSelectionElem.hasAttribute("source-text-loaded")){
        preselectLines(annotationData["selections"], $elem)    
    }
    else{
        if(!textSelectionElem.getAttribute("source-uri")) textSelectionElem.setAttribute("source-uri", sourceURI)
        addEventListener('source-text-loaded', ev => {
            preselectLines(annotationData["selections"], $elem)
        })
    }
    prefillText(annotationData["text"], $elem)
    $elem.classList.remove("is-hidden")
    loading.classList.add("is-hidden")
    // This event listener is no longer needed
    removeEventListener('deer-form-rendered', initFragmentForm)

    // Capture the render that occurs after the form submit now
    addEventListener('deer-form-rendered', formReset)

    // Initialize the Witness form when it recieves the Manuscript Witness URI
    addEventListener('deer-form-rendered', initWitnessForm)
}

/**
 * Paginate the custom data fields in the Witness form.  Only happens if the page has a hash.
 * Note this only needs to occur one time on page load.
 */ 
function initWitnessForm(event){
    let whatRecordForm = event.target?.id
    let annotationData = event.detail ?? {}
    const $elem = event.target
    if(whatRecordForm !== "manuscriptWitnessForm") return
    const knownShelfmark = annotationData.identifier.value
    if(knownShelfmark){
        //toggleFieldsDisabled($elem, true)
        //$elem.classList.add("is-hidden")
        $elem.querySelectorAll(".button").forEach(btn => btn.classList.add("is-hidden"))
        witnessFragmentForm.classList.remove("is-hidden")
        $elem.classList.add("bg-light")
        providedShelfmark.innerText = knownShelfmark
        providedShelfmark.setAttribute("href", `manuscript-details.html#${annotationData["@id"]}`)
        providedShelfmark.parentElement.classList.remove("is-hidden")
        $elem.querySelectorAll(".detect-witness").forEach(elem => elem.classList.add("is-hidden"))
        const partOfElem = witnessFragmentForm.querySelector("input[deer-key='partOf']")
        partOfElem.value = annotationData["@id"]
        partOfElem.setAttribute("value", event.detail["@id"] )
        partOfElem.dispatchEvent(new Event('input', { bubbles: true }))
        prefillDigitalLocations(annotationData["source"], $elem)
    }
    else{
        $elem.classList.remove("is-hidden")
    }
    loading.classList.add("is-hidden")
    // This event listener is no longer needed
    removeEventListener('deer-form-rendered', initWitnessForm)
}

/**
 * After submission DEER will announce this form as rendered.
 * Set up all the default values to be ready for another submission.
 */
function formReset(event){
    let whatRecordForm = event.target.id ? event.target.id : event.target.getAttribute("name")
    const $elem = event.target
    switch (whatRecordForm) {
        case "witnessFragmentForm":
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
 * Helper function for the specialized references key, which is an Array.
 * An item of the array can be either a URI or plain text.  Set the
 * appropriate attribute based on which it is.
 * */
function prefillDigitalLocations(locationsArr, form) {
    const locationElems = form.querySelectorAll("input[witness-source]")
    if(!locationElems) {
        console.warn("Nothing to fill")
        return false
    }
    if (locationsArr === undefined) {
        console.warn("Cannot set value for digital locations and build UI.  There is no data.")
        return false
    }
    if (!locationsArr || !locationsArr.length) {
        console.warn("There are no digital locations recorded for this witness")
        return false
    }
    const source = locationsArr?.source
    locationsArr = locationsArr?.value
    locationElems.forEach(locationElem => {
        if(source?.citationSource){
            locationElem.setAttribute("deer-source", source.citationSource ?? "")
        }
        locationElem.value = locationsArr[0]
    })
    
    // If this is not a URI, then it also needs to populate the .witnessText element.
    if(locationsArr[0].startsWith("http:") || locationsArr[0].startsWith("https:")){
        document.querySelector(".lineSelector").setAttribute("source-uri", locationsArr[0])
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
    const lineid = linesArr[0].split("#")[0]
    const selection = linesArr[0].split("#")[1].replace("char=", "").split(",").map(num => parseInt(num))
    const selectionsElem = form.querySelector("input[custom-key='selections']")
    const lineElem = form.querySelector(".textContent")
    if(source?.citationSource){
        selectionsElem.setAttribute("deer-source", source.citationSource ?? "")
    }
    selectionsElem.value = linesArr[0]

    const lengthOfSelection = (selection[0] === selection[1]) 
        ? 1
        : (selection[1] - selection[0]) + 1
    const markup = new Mark(lineElem)
    let options = {className:"pre-select"}
    options.exclude = [".persists"]
    markup.markRanges([{
        start: selection[0],
        length: lengthOfSelection
    }], options)    
}

/**
 * Enable/Disable all form fields
 * @param {boolean} disabled - Set all form fields used to have this value for their `disabled` attribute
 */
function toggleFieldsDisabled(form, disabled=true){
    form.querySelectorAll('input,textarea,select,button').forEach(e => {
        if(disabled){
            e.setAttribute("disabled", "")
        }
        else{
            e.removeAttribute("disabled")
        }
    })
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

    // Hmm maybe do this separation of handling a bit different.
    if($elem?.id === "manuscriptWitnessForm"){
        // We generated the Manuscript Witness and can use this ID as part of the fragment for submit
        const partOfElem = witnessFragmentForm.querySelector("input[deer-key='partOf']")
        partOfElem.value = event.detail["@id"] 
        partOfElem.setAttribute("value", event.detail["@id"] )
        partOfElem.dispatchEvent(new Event('input', { bubbles: true }))
        toggleFieldsDisabled($elem, true)
        $elem.querySelectorAll(".button").forEach(btn => btn.classList.add("is-hidden"))
        $elem.classList.add("bg-light")
        witnessFragmentForm.classList.remove("is-hidden")
        manuscriptWitnessForm.querySelectorAll(".detect-witness").forEach(elem => elem.classList.add("is-hidden"))
        providedShelfmark.innerText = event.detail?.identifier?.value
        providedShelfmark.setAttribute("href", `manuscript-details.html#${event.detail["@id"]}`)
        console.log("Manuscript Witness Fully Saved")
        const ev = new CustomEvent("Manuscript Witness Submitted")
        globalFeedbackBlip(ev, `Manuscript Witness Submitted!`, true)
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
    const form = witnessFragmentForm
    const view = form.querySelector("deer-view[deer-template='glossesSelectorForTextualWitness']")
    const list = view.querySelector("ul")
    const modal = event.target
    const title = modal.querySelector("form").querySelector("input[deer-key='title']").value
    const totalsProgress = list.closest("deer-view").querySelector(".totalsProgress")

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
    if(witnessFragmentID){
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
    const form_container = template_container.closest("form")
    if(template_container.getAttribute("deer-template") !== "filterableListItem") return
    const obj = event.detail
    const gloss_li = template_container.firstElementChild
    const createScenario = template_container.hasAttribute("create-scenario") ? true : false
    const updateScenario = template_container.hasAttribute("update-scenario") ? true : false
    // A new Gloss has been introduced and is done being cached.
    let inclusionBtn = document.createElement("input")
    inclusionBtn.setAttribute("type", "button")
    inclusionBtn.setAttribute("data-id", obj["@id"])
    let already = ""
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
                //alert(`This textual witness is already attached to Gloss '${glossIncipit}'`)
                blip = new CustomEvent(`This textual witness is already attached to Gloss '${glossIncipit}'`)
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
 * Process the text from a file on the users local machine.
 */ 
resourceFile.addEventListener("change", function(event){
    let reader = new FileReader()
    //const allowed = [".txt", ".json", ".json-ld", ".xml", ".tei", ".tei-xml", ".rdf", ".rdfs", ".html"]
    const allowed = [".txt"]
    const file_extension = (ext) => allowed.includes(`.${resourceFile.value.split(".").pop()}`)
    const file_type_allowed = allowed.some(file_extension)
    if(!file_type_allowed){
        const ev = new CustomEvent(`'.${resourceFile.value.split(".").pop()}' is not a supported file type.`)
        globalFeedbackBlip(ev, `'.${resourceFile.value.split(".").pop()}' is not a supported file type.`, false)
        loadFile.classList.add("is-hidden")
        fileText.classList.remove("taller")
        fileText.value = " Awaiting file contents..."
        return   
    }
    reader.onload = function(ev){
        if(reader.result){
            fileText.value = reader.result
            fileText.classList.add("taller")
            loadFile.classList.remove("is-hidden")
            setTimeout( () => {
                window.scrollTo({ "top": document.body.scrollHeight, "behavior": "smooth" })
            }, 500)
        }
        else{
            const ev = new CustomEvent("Could not load file contents or file was empty")
            globalFeedbackBlip(ev, `Could not load file contents or file was empty`, false)
            loadFile.classList.add("is-hidden")
            fileText.classList.remove("taller")
            fileText.value = " Awaiting file contents..."
            return
        }
    }
    reader.readAsText(this.files[0])
})

/**
 * Change which user input method is showing based on the chosen tab.
 */ 
function changeUserInput(event, which){
    if(which !== "uri"){
        const ev = new CustomEvent("Under Construction")
        globalFeedbackBlip(ev, `Undergoing development, try again later.`, false)
        return    
    }
    const inputs = document.querySelectorAll(".userInput")
    const active = event.target.parentElement.querySelector(".ui-tab.active")
    active.classList.remove("active")
    event.target.classList.add("active")
    const url = new URL(window.location.href)
    url.searchParams.set("tab", event.target.getAttribute("name"))
    window.history.replaceState(null, null, url) 
    inputs.forEach(userInput => {
        userInput.classList.add("is-hidden")
        if(userInput.getAttribute("user-input") === which){
            userInput.classList.remove("is-hidden")
            if(which === "cp"){
                setTimeout( () => {
                    window.scrollTo({ "top": document.body.scrollHeight, "behavior": "smooth" })
                }, 500)
            }
        }
    })
}

/**
 * Load the chosen user input.  Hide the #needs area.
 */
function loadUserInput(ev, which){
    let text = ""
    const sourceElems = document.querySelectorAll("input[witness-source]")
    switch(which){
        case "uri":
            // Recieve a Witness URI as input from #needs.  Reload the page with a set ?source-uri URL parameter.
            let providedSourceURI = resourceURI.value ? resourceURI.value : sourceURI ? sourceURI : null
            if(providedSourceURI){
                let url = new URL(window.location.href)
                url.searchParams.append("source-uri", providedSourceURI)
                window.location = url
            }
            else{
                //alert("You must supply a URI via the source-uri parameter or supply a value in the text input.")
                const ev = new CustomEvent("You must supply a URI via the source-uri parameter or supply a value in the text input.")
                globalFeedbackBlip(ev, `You must supply a URI via the source-uri parameter or supply a value in the text input.`, false)
            }
        break
        case "file":
            text = fileText.value
            needs.classList.add("is-hidden")
            document.querySelectorAll(".witness-needed").forEach(el => el.classList.remove("is-hidden"))
            document.querySelector(".lineSelector").setAttribute("witness-text", text)
            loading.classList.add("is-hidden")
            // witnessFragmentForm.classList.remove("is-hidden")
            // Typically the source is a URI which resolves to text.  Here, it is just the text.
            sourceElems.forEach(sourceElem => {
                sourceElem.value = text
                sourceElem.setAttribute("value", text)
                sourceElem.dispatchEvent(new Event('input', { bubbles: true }))
            })
            
        break
        case "cp":
            text = resourceText.value
            needs.classList.add("is-hidden")
            document.querySelectorAll(".witness-needed").forEach(el => el.classList.remove("is-hidden"))
            document.querySelector(".lineSelector").setAttribute("witness-text", text)
            loading.classList.add("is-hidden")
            // witnessFragmentForm.classList.remove("is-hidden")
            // Typically the source is a URI which resolves to text.  Here, it is just the text.
            sourceElems.forEach(sourceElem => {
                sourceElem.value = text
                sourceElem.setAttribute("value", text)
                sourceElem.dispatchEvent(new Event('input', { bubbles: true }))
            })
        break
        default:
    }
}

// Paginate the '➥ attach' and possibly '✓ attached' button(s) after a Witness submission.
function paginateButtonsAfterSubmit(glossURIs){
    const previouslyChosen = document.querySelector(".toggleInclusion.success")
    glossURIs.forEach(glossURI => {
        glossURI = glossURI.replace(/^https?:/, 'https:')
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

/**
 * Remove all URL parameters and restart the user flow on gloss-witness.html
 */ 
function startOver(){
    window.location = window.location.origin + window.location.pathname
}

/**
 * @param source A String that is either a text body or a URI to a text resource.
 */ 
async function getAllWitnessFragmentsOfManuscript(mID){
    if(!document.querySelector("source-text-selector").hasAttribute("source-text-loaded")){
        return Promise.reject("There is no reason to run this function because we cannot supply the results to a non-existent UI.  Wait for the T-PEN Transcription to load.")
    }
    // Other asyncronous loading functionality may have already built this.  Use what is cached if so.
    if(Object.keys(witnessFragmentsObj).length > 0){
        for(const witnessInfo in Object.values(witnessFragmentsObj)){
            witnessInfo.glosses.forEach(glossURI => {
                // For each Gloss URI find its corresponding 'attach' button and ensure it is classed as a Gloss that is already attached to this source.
                document.querySelectorAll(`.toggleInclusion[data-id="${glossURI}"]`).forEach(btn => {
                    btn.classList.add("attached-to-source")
                })    
            })
            preselectLines(witnessInfo.selections, witnessFragmentForm, false)
        }
        return
    }
    const historyWildcard = { "$exists": true, "$size": 0 }
    const isURI = (urlString) => {
          try { 
            return Boolean(new URL(urlString))
          }
          catch(e){ 
            return false
          }
      }

    // Each Fragment is partOf a Manuscript.
    const fragmentAnnosQuery = {
        "body.partOf.value": httpsIdArray(mID),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }

    const fragmentUriSet = await getPagedQuery(100, 0, fragmentAnnosQuery)
    .then(annos => {
        return new Set(annos.map(anno => anno.target))
    })
    .catch(err => {
        console.error(err)
        return Promise.reject([])
    })

    let glossUriSet = new Set()
    // Each witness has Gloss and Selections
    
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
            if(!witnessFragmentsObj.hasOwnProperty(fragmentURI)) witnessFragmentsObj[fragmentURI] = {}
            const existingSelections = witnessFragmentsObj[fragmentURI].selections ? witnessFragmentsObj[fragmentURI].selections : []
            witnessFragmentsObj[fragmentURI].selections = [...existingSelections, ...annos.map(anno => anno.body.selections.value).flat()]
            return Promise.resolve(witnessFragmentsObj)
        })
        .catch(err => {
            console.error(err)
            return Promise.reject([])
        })
        )
    }

    // This has the asyncronous behavior necessary to build witnessFragmentsObj.
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
            preselectLines(witnessInfo.selections, manuscriptWitnessForm, false)
        }
    })
    .catch(err => {
        console.error("Witnesses Object Error")
        console.error(err)
        const ev = new CustomEvent("Witnesses Object Error")
        globalFeedbackBlip(ev, `Witnesses Object Error`, false)
    })
}

/**
 * @param source A String that is either a text body or a URI to a text resource.
 */ 
async function getAllWitnessFragmentsOfSource(){
    if(!document.querySelector("source-text-selector").hasAttribute("source-text-loaded")){
        return Promise.reject("There is no reason to run this function because we cannot supply the results to a non-existent UI.  Wait for the text content to load.")
    }
    // Other asyncronous loading functionality may have already built this.  Use what is cached if so.
    if(Object.keys(witnessFragmentsObj).length > 0){
        for(const witnessInfo in Object.values(witnessFragmentsObj)){
            witnessInfo.glosses.forEach(glossURI => {
                // For each Gloss URI find its corresponding 'attach' button and ensure it is classed as a Gloss that is already attached to this source.
                document.querySelectorAll(`.toggleInclusion[data-id="${glossURI}"]`).forEach(btn => {
                    btn.classList.add("attached-to-source")
                })    
            })
            preselectLines(witnessInfo.selections, witnessFragmentForm, false)
        }
        return
    }
    const historyWildcard = { "$exists": true, "$size": 0 }
    const isURI = (urlString) => {
          try { 
            return Boolean(new URL(urlString))
          }
          catch(e){ 
            return false
          }
      }

    // Each source annotation targets a Witness.
    // Get all the source annotations whose value is this source string (URI or text string)
    const sourceAnnosQuery = {
        "body.source.value": httpsIdArray(sourceURI),
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
    // Each witness has Gloss and Selections
    
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
            if(!witnessFragmentsObj.hasOwnProperty(fragmentURI)) witnessFragmentsObj[fragmentURI] = {}
            const existingSelections = witnessFragmentsObj[fragmentURI].selections ? witnessFragmentsObj[fragmentURI].selections : []
            witnessFragmentsObj[fragmentURI].selections = [...existingSelections, ...annos.map(anno => anno.body.selections.value).flat()]
            return Promise.resolve(witnessFragmentsObj)
        })
        .catch(err => {
            console.error(err)
            return Promise.reject([])
        })
        )
    }

    // This has the asyncronous behavior necessary to build witnessFragmentsObj.
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
            preselectLines(witnessInfo.selections, witnessFragmentForm, false)
        }
    })
    .catch(err => {
        console.error("Witnesses Object Error")
        console.error(err)
        const ev = new CustomEvent("Witnesses Object Error")
        globalFeedbackBlip(ev, `Witnesses Object Error`, false)
    })
}