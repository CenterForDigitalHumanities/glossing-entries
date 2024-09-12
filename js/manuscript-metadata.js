/*
* TODO
*/
try {
    let hashURL = new URL(location.hash.slice(1))
} catch (error) {
    location.href = confirm('Use this form to update an existing Manuscript Witness. Select one from the list first.')
    ? 'manuscripts.html'
    : 'index.html'
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