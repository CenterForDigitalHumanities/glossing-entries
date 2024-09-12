/*
* TODO
*/
try {
    let hashURL = new URL(location.hash.substring(1))
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
}