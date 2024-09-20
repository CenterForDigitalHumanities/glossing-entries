var hashURL = window.location.hash.slice(1)

window.onload = () => {
    if(!hashURL) location.href = confirm('Use this form to update an existing Manuscript Witness. Select one from the list first.')
        ? 'manuscripts.html'
        : 'index.html'
    
    if(!isURI(hashURL)){
        // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
        const ev_err = new CustomEvent("Expand Error")
        broadcast(ev_err, "expandError", document, {"uri":hashURL, "error":"Location hash is not a URI."})
        return
    }
    const deleteManuscriptBtn = manuscriptWitnessForm.querySelector(".dropManuscript")
    deleteManuscriptBtn.addEventListener('click', ev => {
        deleteManuscriptWitness(hashURL, true)
    })
}

// Navigate away if the entity they provided is not the correct type
addEventListener('deer-form-rendered', initManuscriptWitnessForm)
function initManuscriptWitnessForm(event){
    let whatRecordForm = event.target?.id
    if(whatRecordForm !== "manuscriptWitnessForm") return
    let annotationData = event.detail ?? {}
    if(!annotationData["@id"]) return
    const entityType = annotationData.type ?? annotationData["@type"] ?? null
    if(entityType !== "ManuscriptWitness"){
        location.href = confirm('Entity provided is not a ManuscriptWitness.  Select one from the list.')
	    ? 'manuscripts.html'
	    : 'index.html'
    }
    loading.classList.add("is-hidden")
    manuscriptWitnessForm.classList.remove("is-hidden")
}

/**
 * The DEER announcement for when all form fields have been saved or updated.
 * Give localized feedback of successful form submissions
 * 
 */ 
addEventListener('deer-updated', async (event) => {
    const ev = new CustomEvent("Manuscript Metadata Updated")
    globalFeedbackBlip(ev, `Manuscript Metadata Updated!`, true)
})

/**
 * The DEER announcement for when there is an error expanding for a URI.
 * Note there is more information in event.detail.error
 * Note the troublesome URI is in event.detail.uri
 */ 
addEventListener('expandError', event => {
    const uri = event.detail.uri
    const msg = event.detail.error ? event.detail.error : `Error getting data for '${uri}'`
    const ev = new CustomEvent("Manuscript Witness Details Error")
    look.classList.add("text-error")
    look.innerText = "Could not get Manuscript Witness information."
    manuscriptWitnessForm.remove()
    loading.classList.add("is-hidden")
    globalFeedbackBlip(ev, msg, false)
})

/**
 * UI/UX for when the user uses this page to delete an existing #Manuscript
 */
document.addEventListener("ManuscriptWitnessDeleted", function(event){
    const ev = new CustomEvent("This Manuscript Witness has been deleted.")
    globalFeedbackBlip(ev, `Manuscript deleted.  You will be redirected.`, true)
    addEventListener("globalFeedbackFinished", () => {
        location.href = "manuscripts.html"
    })
})

/**
 * UI/UX for when this page has an error attempting to delete an existing #Manuscript
 * The form becomes locked down and an error message is show.
 */
document.addEventListener("ManuscriptWitnessDeleteError", function(event){
    const ev = new CustomEvent("Manuscript Delete Error")
    globalFeedbackBlip(ev, `There was an issue removing the Manuscript Witness with URI ${event.detail["@id"]}.  This item may still appear in collections.`, false)
    addEventListener("globalFeedbackFinished", () => {
        setFieldDisabled(true)
    })
    console.error(event.error)
})