const manuscriptWitnessID = window.location.hash.slice(1)

/**
 * The DEER announcement for when there is an error expanding for a URI.
 * Note there is more information in event.detail.error
 * Note the troublesome URI is in event.detail.uri
 * 
 */ 
addEventListener('expandError', event => {
	document.querySelector("deer-view").remove()
    const uri = event.detail.uri
    const ev = new CustomEvent("Witness Details Error")
    look.classList.add("text-error")
    look.innerText = "Could not get Witness information."
    globalFeedbackBlip(ev, `Error getting data for '${uri}'`, false)
})

/**
 * When a deer-view loads, you might want to do stuff
 */ 
addEventListener('deer-form-rendered', doStuff)

/**
 * Default behaviors to run on page load.
 */ 
window.onload = () => {
	let hash = window.location.hash
    if(hash.startsWith("#")){
        hash = window.location.hash.slice(1)
        if(!(hash.startsWith("http:") || hash.startsWith("https:"))){
            // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
            let e = new CustomEvent("expandError", { detail: {"uri":hash}, bubbles:true})
            document.dispatchEvent(e)
            return
        }
    }
}

/**
 * Things to do after the view for the WitnessFragment profile has rendered and has all the data.
 */ 
function doStuff(event){
	const template_container = event.target
    const obj = event.detail
    console.log("We are doing stuff on render")
}

//TODO
/**
 * If I am deleting a ManuscriptWitness (and all Annotations targeting it) I also need to delete all WitnessFragments that are a partOf it (and all Annotations targeting those WitnessFragments).
 *   There is no "public list" to worry about like with Glosses
 */ 
function deleteManuscriptWitness(){
   
}