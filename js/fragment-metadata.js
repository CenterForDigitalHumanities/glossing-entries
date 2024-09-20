var witnessFragmentID = window.location.hash.slice(1)

/**
 * The DEER announcement for when there is an error expanding for a URI.
 * Note there is more information in event.detail.error
 * Note the troublesome URI is in event.detail.uri
 */ 
addEventListener('expandError', event => {
    forNow.remove()
    const uri = event.detail.uri
    const ev = new CustomEvent("Witness Details Error")
    look.classList.add("text-error")
    look.innerText = "Could not get Witness information."
    globalFeedbackBlip(ev, `Error getting data for '${uri}'`, false)
})

/**
 * When a deer-view loads, you might want to do stuff
 */ 
addEventListener('deer-form-rendered', directUser)

/**
 * Default behaviors to run on page load.
 */ 
window.onhashchange = window.onload =  () => {
	witnessFragmentID = window.location.hash.slice(1)
    if(!isURI(witnessFragmentID)){
        // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
        const ev_err = new CustomEvent("Expand Error")
        broadcast(ev_err, "expandError", document, {"uri":witnessFragmentID, "error":"Location hash is not a URI."})
    }
}

/**
 * Things to do after the view for the WitnessFragment profile has rendered and has all the data.
 */ 
function directUser(event){
	const template_container = event.target
    const obj = event.detail
    // Give the user a note about going to gloss-transcription.html or gloss-witness.html.  Give them a link
    const source = obj?.source?.value
    let where
    if(!source){
    	// a special message and offer both?
    	where = 
    	`
    	<span>
    		This Witness Fragment does not have a source yet.  Decide where to go to.<br>
    		<a href="gloss-transcription.html#${witnessFragmentID}">This Witness Fragment is for a T-PEN transcription</a><br>
    		<a href="gloss-witness.html#${witnessFragmentID}">This Witness Fragment is for a textual resource.</a>
    	</span>
    	`
    }

    if(source.includes("t-pen.org")){
    	where = 
    	`
		<span>
    		Head to <a href="gloss-transcription.html#${witnessFragmentID}">gloss-transcription.html</a>
    	</span>
    	`
    }
    else{
    	where = 
    	`
		<span>
    		Head to <a href="gloss-witness.html#${witnessFragmentID}">gloss-witness.html</a>
    	</span>
    	`
    }
    forNow.innerHTML = where
	return where
}
