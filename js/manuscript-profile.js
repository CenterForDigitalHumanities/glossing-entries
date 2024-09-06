var manuscriptWitnessID = window.location.hash.slice(1)

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
addEventListener('deer-view-rendered', doStuff)

/**
 * Default behaviors to run on page load.
 */ 
window.onhashchange = window.onload = () => {
	manuscriptWitnessID = window.location.hash.slice(1)
    if(!(manuscriptWitnessID.startsWith("http:") || manuscriptWitnessID.startsWith("https:"))){
        // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
        const ev_err = new CustomEvent("Expand Error")
        broadcast(ev_err, "expandError", document, {"uri":manuscriptWitnessID, "error":"Location hash is not a URI."})
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
