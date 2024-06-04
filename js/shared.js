/**
 * Custom modal for confirming actions.
 * @class
 */
class CustomConfirmModal extends HTMLElement {
    constructor() {
        super()
        this.attachShadow({mode: 'open'})
    }

    connectedCallback() {
        const message = this.getAttribute('message') || 'Default message'
        this.shadowRoot.innerHTML = `
        <style>
            .backdrop {
                position: fixed;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                top: 0;
                left: 0;
                z-index: 1000;
            }
            .modal {
                padding: 20px; /* Increased padding */
                background: white;
                position: fixed;
                width: auto; /* Adjust width */
                max-width: 90%; /* Ensure it doesn't exceed the viewport width */
                min-height: 10%;
                left: 50%;
                top: 50%;
                transform: translate(-50%, -50%);
                border-radius: 10px;
                border: 2px solid var(--color-primary);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                z-index: 1001;
                text-align: center;
            }
            .button {
                padding: 15px 30px; /* Increased padding for larger touch targets */
                margin: 10px; /* Adjusted margin */
                border-radius: 5px;
                cursor: pointer;
                color: white;
                border: none;
                font-size: 18px; /* Larger font size */
                width: auto; /* Adjust button width */
                min-width: 120px; /* Minimum width for better visibility */
            }
            .confirm { background-color: green; }
            .cancel { background-color: red; }
        </style>
        <div class="backdrop"></div>
        <div class="modal">
            <div id="confirmMessage">${message}</div>
            <button class="button confirm">Confirm</button>
            <button class="button cancel">Cancel</button>
        </div>
    `
        this.shadowRoot.querySelector('.confirm').addEventListener('click', () => this.resolveConfirm(true))
        this.shadowRoot.querySelector('.cancel').addEventListener('click', () => this.resolveConfirm(false))
    }

    resolveConfirm(result) {
        this.dispatchEvent(new CustomEvent('confirm', {detail: {confirmed: result}}))
        this.remove()
    }
}
customElements.define('custom-confirm-modal', CustomConfirmModal)
/**
 * Shared front end functionality across the HTML pages.
 */
let witnessesObj = {}

//For when we test, so we can easily find and blow away junk data
// setTimeout(() => {
//     document.querySelectorAll("input[deer-key='creator']").forEach(el => {
//         el.value="BryanDelete"
//         el.setAttribute("value", "BryanDelete")
//     })
//     document.querySelectorAll("form").forEach(el => {
//         el.setAttribute("deer-creator", "BryanDelete")
//     })
//     window.GOG_USER["http://store.rerum.io/agent"] = "BryanDelete"
// }, 4000)

let __constants = {}
setConstants()

async function setConstants(){
    __constants = await fetch("../properties.json").then(r=>r.json()).catch(e=>{return {}})
}

/**
 * Use this on page load to find all the deer-views that should be showing a public collection.
 */ 
async function setPublicCollections() {
    if(!__constants?.ngCollection) await setConstants()
    document.querySelectorAll("deer-view[public-collection]").forEach(elem => {
        if(elem.getAttribute("public-collection") === "GoG-Named-Glosses"){
            elem.setAttribute("deer-id", __constants.ngCollection)    
        }
        else if(elem.getAttribute("public-collection") === "Glossing-Matthew"){
            elem.setAttribute("deer-id", __constants.msCollection)
        }
    })
}

/**
 * Use this on page load to find all the deer-views that should be showing a managed collection.
 */
async function setListings(){
    if(!__constants?.ngCollection) await setConstants()
    document.querySelectorAll("deer-view[deer-listing]").forEach(elem => {
        if(elem.getAttribute("deer-collection") === "GoG-Named-Glosses"){
            elem.setAttribute("deer-listing", __constants.ngCollection)    
        }
        else if(elem.getAttribute("deer-collection") === "Glossing-Matthew"){
            elem.setAttribute("deer-listing", __constants.msCollection)
        }
    })    
}
/**
 * Retrieves the value of a URL parameter by name.
 * @param {string} variable - The name of the URL parameter.
 * @returns {string|boolean} - The value of the URL parameter if found, otherwise false.
 */
function getURLParameter(variable) {
    const query = window.location.search.substring(1)
    const vars = query.split("&")
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1] }
    }
    return (false)
}
/**
 * Converts an ID to an array or a MongoDB query object based on whether it starts with "http".
 * @param {string} id - The ID to convert.
 * @param {boolean} justArray - Indicates whether to return only an array.
 * @returns {array|object} - The converted ID as an array or MongoDB query object.
 */
function httpsIdArray(id, justArray) {
    if (!id.startsWith("http")) return justArray ? [ id ] : id
    if (id.startsWith("https://")) return justArray ? [ id, id.replace('https','http') ] : { $in: [ id, id.replace('https','http') ] }
    return justArray ? [ id, id.replace('http','https') ] : { $in: [ id, id.replace('http','https') ] }
}
/**
 * Broadcasts an event to a specified element with additional data.
 * @param {Event} event - The event object.
 * @param {string} type - The type of event to broadcast.
 * @param {HTMLElement} element - The element to dispatch the event to.
 * @param {object} obj - Additional data to include in the event.
 */
function broadcast(event = {}, type, element, obj = {}) {
    let e = new CustomEvent(type, { detail: Object.assign(obj, { target: event.target }), bubbles: true })
    element.dispatchEvent(e)
}
/**
 * Displays a feedback message to the user.
 * @param {boolean} noid - Indicates whether the message is for a manuscript without a URI.
 */
function alertReturn(noid) {
    let msg = noid
        ? "You entered this page without a manuscript URI. Click OK to head back to the list."
        : "The manuscript this gloss is from does not have a TPEN project associated with it."
}
/**
 * Retrieves paginated query results.
 * @param {number} lim - The limit of results per page.
 * @param {number} it - The index of the current page.
 * @param {object} queryObj - The query object to execute.
 * @param {array} allResults - The accumulated results from all pages.
 * @returns {Promise} - A promise resolving to an array of query results.
 */
function getPagedQuery(lim, it = 0, queryObj, allResults = []) {
    return fetch(`${__constants.tiny}/query?limit=${lim}&skip=${it}`, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(queryObj)
    })
        .then(response => response.json())
        .then(results => {
            if (results.length) {
                allResults = allResults.concat(results)
                return getPagedQuery(lim, it + results.length, queryObj, allResults)
            }
            return allResults
        })
        .catch(err => {
            console.warn("Could not process a result in paged query")
            throw err
        })
}
/**
 * Displays global feedback to the user.
 * @param {Event} event - The triggering event.
 * @param {string} message - The feedback message to display.
 * @param {boolean} success - Indicates whether the operation was successful.
 */
function globalFeedbackBlip(event, message, success) {
    globalFeedback.innerText = message
    globalFeedback.classList.add("show")
    if (success) {
        globalFeedback.classList.remove("bg-error")
        globalFeedback.classList.add("bg-success")
    } else {
        globalFeedback.classList.remove("bg-success")
        globalFeedback.classList.add("bg-error")
    }
    setTimeout(function () {
        globalFeedback.classList.remove("show")
        globalFeedback.classList.remove("bg-error")
        // backup to page before the form
        broadcast(event, "globalFeedbackFinished", globalFeedback, { message: message })
    }, 3000)
}

/**
 * These filters will be provided to HTML pages via the URL parameter ?gog-filter.
 * The value will be a Base64 Encoded JSON object.
 * The object is decoded here and returned as JSON.  
 */
function filtersFromURL() {
    const encoded = getURLParameter("gog-filter")
    let decodedJSON = decodeContentState(encoded)
    return decodedJSON
}
/**
 * Encodes content state JSON to a Base64 URL.
 * @param {string} contentStateJSON - The content state JSON to encode.
 * @returns {string} - The Base64 URL encoded string.
 */
function encodeContentState(contentStateJSON) {
    let uriEncoded = encodeURIComponent(contentStateJSON)
    let base64 = btoa(uriEncoded)
    let base64url = base64.replace(/\+/g, "-").replace(/\//g, "_")
    let base64urlNoPadding = base64url.replace(/=/g, "")
    return base64urlNoPadding
}
/**
 * Decodes a Base64 URL encoded string to content state JSON.
 * @param {string} encodedContentState - The Base64 URL encoded string to decode.
 * @returns {object} - The decoded content state JSON object.
 */
function decodeContentState(encodedContentState) {
    let base64url = restorePadding(encodedContentState)
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    let base64Decoded = atob(base64)
    let uriDecoded = decodeURIComponent(base64Decoded) || `{"title":""}`
    return JSON.parse(uriDecoded)
}
/**
 * Restores padding to a Base64 URL encoded string.
 * @param {string} s - The Base64 URL encoded string to restore padding to.
 * @returns {string} - The padded Base64 URL encoded string.
 */
function restorePadding(s) {
    // The length of the restored string must be a multiple of 4
    let pad = s.length % 4
    let padding = ""
    if (pad) {
        if (pad === 1) {
            throw new Error('InvalidLengthError: Input base64url string is the wrong length to determine padding')
        }
        s += '===='.slice(0, 4 - pad)
    }
    return s + padding
}

self.onhashchange = loadHashId

/**
 * A 'catch all' blip for forms submits that have not been set up with their own yet.
 * Note form submits that do have their own cause two blips for now.
 * Note we would like to be able to delete this and have each form submit give their own message.
 */ 
document.addEventListener('deer-updated', event => {
    globalFeedbackBlip(event, `Saving ${event.detail.name ? "'" + event.detail.name + "' " : ""}successful!`, true)
})

/** Auth */
/**
 * Loads the hash identifier (hash-id) and sets it as an attribute for elements with [hash-id].
 */
function loadHashId() {
    let hash = location.hash?.substring(1)
    if (!hash) { return }
    const rerumPrefix = "https://store.rerum.io/v1/id/"
    if (hash.length === 24) { hash = `${rerumPrefix}${hash}` }
    if (!hash.startsWith('http')) { return }
    document.addEventListener('DOMContentLoaded', ev => {
        document.querySelectorAll('.add-update').forEach(el => {
            if (el.value) { el.value = el.value.replace("Create", "Update") }
            if (el.textContent) { el.textContent = "Update" }
        })
        document.querySelectorAll('[hash-id]').forEach(el => el.setAttribute('deer-id', hash))
    })
}
if (document.readyState === 'interactive' || 'loaded') loadHashId()
/**
 * Finds matching incipits based on the provided incipit and title start.
 * @param {string} incipit - The incipit to search for.
 * @param {string} titleStart - The start of the title.
 * @returns {Promise<Array>} - A promise that resolves to an array of matching glosses.
 */
async function findMatchingIncipits(incipit, titleStart) {
    if (incipit?.length < 5) { 
        const ev = new CustomEvent(`Text "${incipit}" is too short to consider.`)
        globalFeedbackBlip(ev, `Text "${incipit}" is too short to consider for this check.`, false)
        return
    }
    const historyWildcard = { "$exists": true, "$size": 0 }
    titleStart ??= /\s/.test(incipit) ? incipit.split(' ')[0] : incipit
    const queryObj = {
        $or: [{
            "body.title.value": titleStart
        }, {
            "body.text.textValue": incipit
        }],
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    return fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
        method: "POST",
        mode: 'cors',
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(queryObj)
    }).then(response => response.json())
        .then(matches => {
            const uniqueGlosses = new Map()
            matches.forEach(each => {
                const match = {
                    id: each.target['@id'] ?? each.target.id ?? each.target,
                    title: each.body.title?.value ?? each.body.title ?? each.body.text.textValue
                }
                uniqueGlosses.set(match.id, match)
            })
            return [...uniqueGlosses.values()]
        })
        .catch(err => {
            console.error(err)
            return Promise.resolve([])
        })
}

/**
 * @param source A String that is either a text body or a URI to a text resource.
 */ 
async function getAllWitnessesOfSource(source){
    if(!document.querySelector("tpen-line-selector").hasAttribute("tpen-lines-loaded")){
        return Promise.reject("There is no reason to run this function because we cannot supply the results to a non-existent UI.  Wait for the T-PEN Transcription to load.")
    }
    // Other asyncronous loading functionality may have already built this.  Use what is cached if so.
    if(Object.keys(witnessesObj).length > 0){
        for(const witnessInfo in Object.values(witnessesObj)){
            witnessInfo.glosses.forEach(glossURI => {
                // For each Gloss URI find its corresponding 'attach' button and ensure it is classed as a Gloss that is already attached to this source.
                document.querySelectorAll(`.toggleInclusion[data-id="${glossURI}"]`).forEach(btn => {
                    btn.classList.add("attached-to-source")
                })    
            })
            preselectLines(witnessInfo.selections, witnessForm, false)
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
        "body.source.value": httpsIdArray(source),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }

    const witnessUriSet = await getPagedQuery(100, 0, sourceAnnosQuery)
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
    for (const witnessURI of witnessUriSet){
        // Each Witness has an Annotation whose body.value references [a Gloss]
        const referencesAnnosQuery = {
            "target" : httpsIdArray(witnessURI),
            "body.references.value": { $exists:true },
            "__rerum.history.next": historyWildcard,
            "__rerum.generatedBy" : httpsIdArray(__constants.generator)
        }
        // It also has selections we need to highlight
        const selectionsAnnosQuery = {
            "target" : httpsIdArray(witnessURI),
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
            if(!witnessesObj.hasOwnProperty(witnessURI)) witnessesObj[witnessURI] = {}
            witnessesObj[witnessURI].glosses = new Set([...glossUriSet, ...new Set(annos.map(anno => anno.body.references.value).flat())])
            glossUriSet = new Set([...glossUriSet, ...new Set(annos.map(anno => anno.body.references.value).flat())])
            return Promise.resolve(witnessesObj)
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
            if(!witnessesObj.hasOwnProperty(witnessURI)) witnessesObj[witnessURI] = {}
            const existingSelections = witnessesObj[witnessURI].selections ? witnessesObj[witnessURI].selections : []
            witnessesObj[witnessURI].selections = [...existingSelections, ...annos.map(anno => anno.body.selections.value).flat()]
            return Promise.resolve(witnessesObj)
        })
        .catch(err => {
            console.error(err)
            return Promise.reject([])
        })
        )
    }

    // This has the asyncronous behavior necessary to build witnessesObj.
    Promise.all(all)
    .then(success => {
        witnessesObj.referencedGlosses = glossUriSet
        for(const witnessURI in witnessesObj){
            if(witnessURI === "referencedGlosses") continue
            const witnessInfo = witnessesObj[witnessURI]
            witnessInfo.glosses.forEach(glossURI => {
                // For each Gloss URI find its corresponding 'attach' button and ensure it is classed as a Gloss that is already attached to this source.
                document.querySelectorAll(`.toggleInclusion[data-id="${glossURI}"]`).forEach(btn => {
                    btn.classList.add("attached-to-source")
                })    
            })
            preselectLines(witnessInfo.selections, witnessForm, false)
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
async function getAllWitnessesOfGloss(glossURI){
    const gloss_witness_annos_query = {
        "body.references.value" : httpsIdArray(glossURI),
        '__rerum.history.next':{ $exists: true, $type: 'array', $eq: [] },
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    const witnessUris = await getPagedQuery(100, 0, gloss_witness_annos_query)
    .catch(err => {
        console.error(err)
        return []
    })
    .then(gloss_witness_annos => gloss_witness_annos.map(anno => anno.target))
    .catch(err => {
        console.error(err)
        return []
    })
    return new Set(witnessUris)
}

/**
 * Undo a manual user selection of text on the page.  Mainly just a UI trick.
 * 
 * @param s The Browser Selection object
 */ 
function undoBrowserSelection(s){
    s?.removeAllRanges?.() ?? s?.empty?.()
}

/** 
 * Discover proper identifier for manuscript or suggest new IRI. 
 *
 * @async
 * @function findShelfmark
 * @param { string } msid Identifier to match or validate.
 * @param { boolean } [forceNew] True to skip search for collision. *risky*
 * @returns Valid msid string or parent IRI
 */ 
async function findShelfmark(msid, forceNew) {
    try {
        // wash msid
        if (typeof msid !== 'string') {
            const invalidInputEvent = new CustomEvent("Failed to Query Rerum. Invalid msid identifier input.")
            globalFeedbackBlip(invalidInputEvent, 'Failed to query for Shelfmark: Attempted to add a non string.', false)
            return
        }

        const cleanMsid = msid.replace(/[@$%*?]+/g, '') 
        .replace(/\s+/g, ' ') 
        .trim() 

        if (cleanMsid.length === 0) {
            const invalidInputEvent = new CustomEvent("Failed to Query Rerum. Invalid msid identifier input.")
            globalFeedbackBlip(invalidInputEvent, 'Failed to query for Shelfmark: Attempted to add an empty string.', false)
            return
        }

        // return washed msid or parent msid
        if (forceNew) {
            return cleanMsid
        }

        const query = {
            "body.alternateTitle.value": cleanMsid,
            "__rerum.generatedBy" : __constants.generator
        }

        const annotation = await fetch(`${__constants.tiny+"/query"}`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(query)
        })
        .then(resp => resp.json())
        .catch(err => {
            console.error(err)
            const qryFail = new CustomEvent("Failed to query RERUM.")
            globalFeedbackBlip(qryFail, 'Failed to find annotation with msid identifier.', false)
            return
        })

        if(annotation.length > 0){
            return annotation[0]["target"]
        }
        else {
            return null
        }


    }
    catch (error) {
        // For anything weird we may not have specifically caught.
        console.error('Error Finding Shelfmark:', error)
        const errorEvent = new CustomEvent("Failed to find Shelfmark.")
        globalFeedbackBlip(errorEvent, 'Failed to find Shelfmark: ' + error.message, false)
    }
}

/** 
 * Confirm the shelfmark's inclusion in "GoG-manuscripts" dynamic collection. 
 * @see {@link findShelfmark #113} to verify shelfmark is appropriate. 
 *
 * @async
 * @function addManuscriptToGoG
 * @param { string } shelfmark Identifier to include.
 */
async function addManuscriptToGoG(shelfmark) {
    try {
        /** Wash shelfmark by 
         * Removing specific special characters @ $ % * ?
         * Replace multiple spaces with a single space
         * Removing trailing or leading whitespace
         * */

        if (typeof shelfmark !== 'string') {
            const invalidInputEvent = new CustomEvent("Failed to Query Rerum. Invalid shelfmark input.")
            globalFeedbackBlip(invalidInputEvent, 'Failed to add manuscript to GoG-manuscripts: Attempted to add a non string.', false)
            return
        }

        const cleanShelfmark = shelfmark.replace(/[@$%*?]+/g, '') 
        .replace(/\s+/g, ' ') 
        .trim() 

        if (cleanShelfmark.length === 0) {
            const invalidInputEvent = new CustomEvent("Failed to Query Rerum. Invalid shelfmark input.")
            globalFeedbackBlip(invalidInputEvent, 'Failed to add manuscript to GoG-manuscripts: Attempted to add an empty string.', false)
            return
        }

        // check for existing annotation with cleaned shelfmark
        const query = {
            "target": cleanShelfmark,
            "__rerum.generatedBy" : __constants.generator
        }

        const existingAnnotations = await fetch(`${__constants.tiny+"/query"}`, {
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-Type": "application/json;charset=utf-8"
            },
            body: JSON.stringify(query)
        })
        .then(resp => resp.json())
        .catch(err => {
            console.error(err)
            return null
        })

        if(existingAnnotations === null){
            const qryFail = new CustomEvent("Failed to query RERUM.")
            globalFeedbackBlip(qryFail, 'Failed to add manuscript to GoG-manuscripts.', false)
            return
        }
        else if(existingAnnotations.length > 0){
            const ev = new CustomEvent("Annotation already exists.")
            globalFeedbackBlip(ev, 'Annotation already exists for this shelfmark.', false)
            return
        }

        // save new annotation with shelfmark if none exists
        const annotation = {
            "@context": "http://www.w3.org/ns/anno.jsonld",
            "@type": "Annotation",
            "target": cleanShelfmark,
            "body": { "targetCollection": "GoG-manuscripts" }
        }
        const savedAnnotation = await fetch(`${__constants.tiny+"/create"}`, { 
            method: 'POST',
            mode: 'cors',
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            },
            body: JSON.stringify(annotation)
        })
        .then(resp => resp.json())
        .catch(err => {
            console.error(err)
            return
        })

        if(savedAnnotation && savedAnnotation.hasOwnProperty("@id")){
            //  success blip if annotation is saved
            const successEvent = new CustomEvent("Manuscript added successfully.")
            globalFeedbackBlip(successEvent, 'Manuscript added successfully to GoG-manuscripts.', true)
            return savedAnnotation    
        }
        else{
            console.error('Error adding manuscript')
            const errorEvent = new CustomEvent("Failed to add manuscript.")
            globalFeedbackBlip(errorEvent, 'Failed to add manuscript to GoG-manuscripts.', false)
        }
    } 
    catch (error) {
        // For anything weird we may not have specifically caught.
        console.error('Error adding manuscript:', error)
        const errorEvent = new CustomEvent("Failed to add manuscript.")
        globalFeedbackBlip(errorEvent, 'Failed to add manuscript to GoG-manuscripts: ' + error.message, false)
    }
}

/**
 *  Delete a Witness of a Gloss through gloss-transcription.html, gloss-witness.html or manage-glosses.html.  
 *  This will delete the Witness entity itself and its Annotations.  
 *  It will no longer appear as a Witness to the Gloss in any UI.
 * 
 *  @param {String} witnessID - The IRI of a Witness Entity
 *  @param {boolean} redirect - A flag for whether or not to redirect as part of the UX.
*/
async function deleteWitness(witnessID, redirect){
    if(!witnessID) return
    // No extra clicks while you await.
    if(redirect) document.querySelector(".deleteWitness").setAttribute("disabled", "true")
    const annos_query = {
        "target" : httpsIdArray(witnessID),
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
            return null
        })

    // This is bad enough to stop here, we will not continue on towards deleting the entity.
    if(anno_ids === null) throw new Error("Cannot find Entity Annotations")

    let delete_calls = anno_ids.map(annoUri => {
        return fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({ "@id": annoUri.replace(/^nOPePE:/,'nOPePE') }),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            }
        })
        .then(r => {
            if(!r.ok) throw new Error(r.text)
        })
        .catch(err => {
            console.warn(`There was an issue removing an Annotation: ${annoUri}`)
            console.log(err)
        })
    })

    delete_calls.push(
        fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({"@id" : witnessID.replace(/^nOPePE:/,'nOPePE')}),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            },
        })
        .then(r => {
            if(!r.ok) throw new Error(r.text)
        })
        .catch(err => {
            console.warn(`There was an issue removing the Witness: ${witnessID}`)
            console.log(err)
        })
    )

    if(redirect){
        Promise.all(delete_calls).then(success => {
            const glossID = document.querySelector("input[custom-key='references']").value
            addEventListener("globalFeedbackFinished", ev=> {
                window.location = `ng.html#${glossID}`
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
        return
    }
    else{
        return delete_calls
    }
}

/**
 * Get the public list and check its items for a given Gloss URI.
 * http vs https is a bit goofy with the public list right now.  
 * Extra care is taken to avoid a silly mismatch.
 * 
 * @param glossID A Gloss URI 
 * @return boolean true when a Gloss URI is in the public list
 */ 
async function isPublicGloss(glossID){
    const publicList = await fetch(__constants.ngCollection).then(resp => resp.json()).catch(err => {return null})
    if(!publicList || !publicList?.itemListElement){
        throw new Error("Unable to fetch public list to check against")
    }
    const publicListUris = publicList.itemListElement.map(obj => obj["@id"].split("/").pop())
    return publicListUris.includes(glossID.split("/").pop())
}
/**
 * Creates a custom confirmation dialog box with the specified message.
 * @param {string} message - The message to be displayed in the confirmation dialog box.
 * @returns {Promise<boolean>} A Promise that resolves with a boolean value indicating whether the confirmation was accepted (true) or canceled (false).
 */
async function showCustomConfirm(message) {
    const confirmModal = document.createElement('custom-confirm-modal')
    confirmModal.setAttribute('message', message)
    document.body.appendChild(confirmModal);

    return new Promise(resolve => {
        confirmModal.addEventListener('confirm', event => {
            resolve(event.detail.confirmed)
        }, {once: true})
    })
}
