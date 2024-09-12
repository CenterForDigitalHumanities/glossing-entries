var glossHashID = window.location.hash.slice(1)

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
 * Default behaviors to run on page load.
 */ 
window.onhashchange = window.onload = () => {
    if(!isURI(glossHashID)){
        // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
        const ev_err = new CustomEvent("Expand Error")
        broadcast(ev_err, "expandError", document, {"uri":glossHashID, "error":"Location hash is not a URI."})
        return
    }
    document.querySelector("gog-references-browser").setAttribute("gloss-uri", glossHashID)
}

/**
 * Things to do after the view for the Gloss profile has rendered and has all the data.
 */ 
function init(event){
	document.querySelector("gog-references-browser").classList.remove("is-hidden")
}
addEventListener('deer-view-rendered', init)