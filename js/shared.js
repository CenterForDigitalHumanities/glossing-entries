/**
 * Shared front end functionality across the HTML pages.
 */

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
        const resolve_ev = new CustomEvent("Confirm Modal Event")
        broadcast(resolve_ev, "customModalConfirm", this, {"confirmed": result})
        this.remove()
    }
}
customElements.define('custom-confirm-modal', CustomConfirmModal)

let witnessFragmentsObj = {}

//For when we test, so we can easily find and blow away junk data
// setTimeout(() => {
//     document.querySelectorAll("input[deer-key='creator']").forEach(el => {
//         el.value="BryanReleaseCheckup"
//         el.setAttribute("value", "BryanReleaseCheckup")
//     })
//     document.querySelectorAll("form").forEach(el => {
//         el.setAttribute("deer-creator", "BryanReleaseCheckup")
//     })
//     if(!window.GOG_USER) window.GOG_USER = {}
//     window.GOG_USER["http://store.rerum.io/agent"] = "BryanReleaseCheckup"
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
    const query = window.location.search.slice(1)
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
async function getPagedQuery(lim, it = 0, queryObj, allResults = []) {
    if(!__constants?.tiny) await setConstants()
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

/**
 * A 'catch all' blip for forms submits that have not been set up with their own yet.
 * Note form submits that do have their own cause two blips for now.
 * FIXME we would like to be able to delete this and have each form submit give their own message.
 */ 
// document.addEventListener('deer-updated', event => {
//     globalFeedbackBlip(event, `Saving ${event.detail.name ? "'" + event.detail.name + "' " : ""}successful!`, true)
// })

/** Auth */
/**
 * Loads the hash identifier (hash-id) and sets it as an attribute for elements with [hash-id].
 * 'self' here is the Window object
 */ 
self.onhashchange = loadHashId
function loadHashId() {
    let hash = location.hash.slice(1)
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
    if(!__constants?.generator) await setConstants()
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
 * Undo a manual user selection of text on the page.  Mainly just a UI trick.
 * 
 * @param s The Browser Selection object
 */ 
function undoBrowserSelection(s){
    s?.removeAllRanges?.() ?? s?.empty?.()
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
    if(!__constants?.ngCollection) await setConstants()
    const publicList = await fetch(__constants.ngCollection).then(resp => resp.json()).catch(err => {return null})
    if(!publicList || !publicList?.itemListElement){
        throw new Error("Unable to fetch public list to check against")
    }
    const publicListUris = publicList.itemListElement.map(obj => {
        const negotiatedId = obj["@id"] ?? obj.id
        return negotiatedId.split("/").pop()
    })
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
        confirmModal.addEventListener('customModalConfirm', event => {
            resolve(event.detail.confirmed)
            // The resolve function above needs a little time to finish.  inProgress() makes the button it wants to click disabled too fast.
            if(event.detail.confirmed) {
                setTimeout(function() {
                    inProgress(event, true)
                }, 250)
            }
        }, {once: true})
    })
}

/**
 * Generate an MD5 Hash from any input string.  Note this is not guaranteed to be collision free.
 * In other words, it is possible to get the same hash for two completely different strings.
 * Though possible, it is very unlikely.
 * 
 * There is no way to 'decrypt' the output.  You will never be able to determine the original string.
 * Sorry not sorry
 * 
 * @param str - Anything this programming language considers a valid 'String' type
 * @note numbers and arrays are supported as is.  JSON can be supported if you stringify() it.
 */ 
function generateHash(str) {
    var hc="0123456789abcdef";
    function rh(n) {var j,s="";for(j=0;j<=3;j++) s+=hc.charAt((n>>(j*8+4))&0x0F)+hc.charAt((n>>(j*8))&0x0F);return s;}
    function ad(x,y) {var l=(x&0xFFFF)+(y&0xFFFF);var m=(x>>16)+(y>>16)+(l>>16);return (m<<16)|(l&0xFFFF);}
    function rl(n,c)            {return (n<<c)|(n>>>(32-c));}
    function cm(q,a,b,x,s,t)    {return ad(rl(ad(ad(a,q),ad(x,t)),s),b);}
    function ff(a,b,c,d,x,s,t)  {return cm((b&c)|((~b)&d),a,b,x,s,t);}
    function gg(a,b,c,d,x,s,t)  {return cm((b&d)|(c&(~d)),a,b,x,s,t);}
    function hh(a,b,c,d,x,s,t)  {return cm(b^c^d,a,b,x,s,t);}
    function ii(a,b,c,d,x,s,t)  {return cm(c^(b|(~d)),a,b,x,s,t);}
    function sb(x) {
        var i;var nblk=((x.length+8)>>6)+1;var blks=new Array(nblk*16);for(i=0;i<nblk*16;i++) blks[i]=0;
        for(i=0;i<x.length;i++) blks[i>>2]|=x.charCodeAt(i)<<((i%4)*8);
        blks[i>>2]|=0x80<<((i%4)*8);blks[nblk*16-2]=x.length*8;return blks;
    }
    var i,x=sb(""+str),a=1732584193,b=-271733879,c=-1732584194,d=271733878,olda,oldb,oldc,oldd;
    for(i=0;i<x.length;i+=16) {olda=a;oldb=b;oldc=c;oldd=d;
        a=ff(a,b,c,d,x[i+ 0], 7, -680876936);d=ff(d,a,b,c,x[i+ 1],12, -389564586);c=ff(c,d,a,b,x[i+ 2],17,  606105819);
        b=ff(b,c,d,a,x[i+ 3],22,-1044525330);a=ff(a,b,c,d,x[i+ 4], 7, -176418897);d=ff(d,a,b,c,x[i+ 5],12, 1200080426);
        c=ff(c,d,a,b,x[i+ 6],17,-1473231341);b=ff(b,c,d,a,x[i+ 7],22,  -45705983);a=ff(a,b,c,d,x[i+ 8], 7, 1770035416);
        d=ff(d,a,b,c,x[i+ 9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,     -42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
        a=ff(a,b,c,d,x[i+12], 7, 1804603682);d=ff(d,a,b,c,x[i+13],12,  -40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);
        b=ff(b,c,d,a,x[i+15],22, 1236535329);a=gg(a,b,c,d,x[i+ 1], 5, -165796510);d=gg(d,a,b,c,x[i+ 6], 9,-1069501632);
        c=gg(c,d,a,b,x[i+11],14,  643717713);b=gg(b,c,d,a,x[i+ 0],20, -373897302);a=gg(a,b,c,d,x[i+ 5], 5, -701558691);
        d=gg(d,a,b,c,x[i+10], 9,   38016083);c=gg(c,d,a,b,x[i+15],14, -660478335);b=gg(b,c,d,a,x[i+ 4],20, -405537848);
        a=gg(a,b,c,d,x[i+ 9], 5,  568446438);d=gg(d,a,b,c,x[i+14], 9,-1019803690);c=gg(c,d,a,b,x[i+ 3],14, -187363961);
        b=gg(b,c,d,a,x[i+ 8],20, 1163531501);a=gg(a,b,c,d,x[i+13], 5,-1444681467);d=gg(d,a,b,c,x[i+ 2], 9,  -51403784);
        c=gg(c,d,a,b,x[i+ 7],14, 1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);a=hh(a,b,c,d,x[i+ 5], 4,    -378558);
        d=hh(d,a,b,c,x[i+ 8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16, 1839030562);b=hh(b,c,d,a,x[i+14],23,  -35309556);
        a=hh(a,b,c,d,x[i+ 1], 4,-1530992060);d=hh(d,a,b,c,x[i+ 4],11, 1272893353);c=hh(c,d,a,b,x[i+ 7],16, -155497632);
        b=hh(b,c,d,a,x[i+10],23,-1094730640);a=hh(a,b,c,d,x[i+13], 4,  681279174);d=hh(d,a,b,c,x[i+ 0],11, -358537222);
        c=hh(c,d,a,b,x[i+ 3],16, -722521979);b=hh(b,c,d,a,x[i+ 6],23,   76029189);a=hh(a,b,c,d,x[i+ 9], 4, -640364487);
        d=hh(d,a,b,c,x[i+12],11, -421815835);c=hh(c,d,a,b,x[i+15],16,  530742520);b=hh(b,c,d,a,x[i+ 2],23, -995338651);
        a=ii(a,b,c,d,x[i+ 0], 6, -198630844);d=ii(d,a,b,c,x[i+ 7],10, 1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);
        b=ii(b,c,d,a,x[i+ 5],21,  -57434055);a=ii(a,b,c,d,x[i+12], 6, 1700485571);d=ii(d,a,b,c,x[i+ 3],10,-1894986606);
        c=ii(c,d,a,b,x[i+10],15,   -1051523);b=ii(b,c,d,a,x[i+ 1],21,-2054922799);a=ii(a,b,c,d,x[i+ 8], 6, 1873313359);
        d=ii(d,a,b,c,x[i+15],10,  -30611744);c=ii(c,d,a,b,x[i+ 6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21, 1309151649);
        a=ii(a,b,c,d,x[i+ 4], 6, -145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+ 2],15,  718787259);
        b=ii(b,c,d,a,x[i+ 9],21, -343485551);a=ad(a,olda);b=ad(b,oldb);c=ad(c,oldc);d=ad(d,oldd);

    }
    return rh(a)+rh(b)+rh(c)+rh(d)
}

/**
 * Reduce diacritics to the normalized form of their letter (ex. 'ê' to 'e').
 * Remove punctuation.
 * Remove leading and trailing whitespace and newlines.
 * 
 * @param str - Any valid javascript string
 * @return The string after applying the normalization changes listed above
 */ 
function normalizeString(str){
    if(!str || typeof str !== "string") return
    const punctuation = /[\.,?!]/g
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(punctuation, "").trim()
}

/**
 * Paginate the '➥ attach' and possibly '✓ attached' button(s) after a WitnessFragment submission.
 * This supports the submissions through the glossModal as well, as that triggers a WitnessFragment submission.
 * 
 * @param glossURIs - An array of Gloss URIs to match on which buttons need some pagination
 */ 
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
 * Query RERUM or cache for Witness Fragments related to the provided input
 * 
 * @param manuscriptWitnessURI - The ManuscriptWitness URI whose WitnessFragments you want.
 * @return An Array of WitnessFragment URIs
 */ 
async function getAllWitnessFragmentsOfManuscript(manuscriptWitnessURI){
    if(!manuscriptWitnessURI) return    
    if(!__constants?.generator) await setConstants()
    const historyWildcard = { "$exists": true, "$size": 0 }

    // Each Fragment is partOf a Manuscript.
    const fragmentAnnosQuery = {
        "body.partOf.value": httpsIdArray(manuscriptWitnessURI),
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

    return [...fragmentUriSet.values()]
}

/**
 *  Delete a Witness Fragment through gloss-transcription.html, gloss-witness.html or manage-glosses.html.  
 *  This will delete the Witness Fragment entity itself and its Annotations.  
 *  The Witness Fragment will no longer appear as a witness to a Gloss in any UI and the text selection will go away.
 * 
 *  @param {boolean} redirect - A flag for whether or not to redirect as part of the UX.
*/
async function deleteWitnessFragment(witnessFragmentURI=null, redirect=false){
    if(!witnessFragmentURI) return
    if(!__constants?.generator) await setConstants()
    const entity = await fetch(witnessFragmentURI).then(resp => resp.json()).catch(err => {throw err})
    const typecheck = entity ? entity.type ?? entity["@type"] ?? "" : ""
    if(typecheck !== "WitnessFragment"){
        const entity_err = new CustomEvent("Bad Entity")
        broadcast(entity_err, "WitnessFragmentDeleteError", document, {"@id":witnessFragmentURI, "error":`Entity type '${typecheck}' is not a WitnessFragment`} )
        return
    }    
    // No extra clicks while you await.
    if(redirect) document.querySelector(".deleteWitness")?.setAttribute("disabled", "true")
    const annos_query = {
        "target" : httpsIdArray(witnessFragmentURI),
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    let anno_ids =
        await fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json; charset=utf-8"                
            },
            body: JSON.stringify(annos_query)
        })
        .then(resp => resp.json()) 
        .then(annos => annos.map(anno => anno["@id"] ?? anno.id))
        .catch(err => {
            return null
        })

    // This is bad enough to stop here, we will not continue on towards deleting the entity.
    if(anno_ids === null) throw new Error("Cannot find Entity Annotations")

    let delete_calls = anno_ids.map(annoUri => {
        return fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({ "@id": annoUri.replace(/^https?:/, 'https:') }),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            }
        })
        .then(r => {
            if(r.ok) {return r}
            else {throw new Error(r.text)}
        })
        .catch(err => {
            console.warn(`There was an issue removing an Annotation: ${annoUri}`)
            console.log(err)
            return err
        })
    })

    delete_calls.push(
        fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({"@id" : witnessFragmentURI.replace(/^https?:/, 'https:')}),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            },
        })
        .then(r => {
            if(r.ok) {return r}
            else {throw new Error(r.text)}
        })
        .catch(err => {
            console.warn(`There was an issue removing the Witness Fragment: ${witnessFragmentURI}`)
            console.log(err)
            return err
        })
    )

    return Promise.all(delete_calls).then(success => {
        const ev = new CustomEvent("WitnessFragment Deleted.")
        broadcast(ev, "WitnessFragmentDeleted", document, {"@id":witnessFragmentURI, "redirect":redirect})
        return success
    })
    .catch(err => {
        // OK they may be orphaned.  We will continue on towards deleting the entity.
        console.warn("There was an issue removing connected Annotations.")
        console.error(err)
        const ev_err = new CustomEvent("Error Deleting Witness")
        globalFeedbackBlip(ev_err, `Error Deleting WitnessFragment.  It may still appear.`, false)
        broadcast(ev, "WitnessFragmentDeleteError", document, {"@id":witnessFragmentURI, "error":err})
        return err
    })    
}

/**
 *  Delete a Manuscript Witness through witness-metadata.html or manage-manuscripts.html.  
 *  This will delete the Manuscript Entity entity itself and its Annotations.  
 *  This will delete any Witness Fragment that has a partOf Annotation which targets this Manuscript Witness.
 *  The Witness Fragment will no longer appear as a Witness to the Gloss in any UI.
 *  The Witness Fragment will no longer appear as a witness to a Gloss in any UI and the text selection will go away.
 * 
 *  @param {boolean} redirect - A flag for whether or not to redirect as part of the UX.
*/
async function deleteManuscriptWitness(manuscriptWitnessURI=null, redirect=false){
    if(!manuscriptWitnessURI) return
    if(!__constants?.generator) await setConstants()
    const entity = await fetch(manuscriptWitnessURI).then(resp => resp.json()).catch(err => {throw err})
    const typecheck = entity ? entity.type ?? entity["@type"] ?? "" : ""
    if(typecheck !== "ManuscriptWitness"){
        const entity_err = new CustomEvent("Bad Entity")
        broadcast(entity_err, "ManuscriptWitnessDeleteError", document, {"@id":manuscriptWitnessURI, "error":`Entity type '${typecheck}' is not a ManuscriptWitness`} )
        return
    }    
    // Confirm they want to do this
    if (!await showCustomConfirm(`Really delete this Manuscript Witness and remove its Witness Fragments?\n(Cannot be undone)`)) return
    // No extra clicks while you await.
    if(redirect) document.querySelector(".dropManuscript")?.setAttribute("disabled", "true")
    const manuscript_annos_query = {
        "target" : httpsIdArray(manuscriptWitnessURI),
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    let manuscript_anno_ids =
        await fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
            method: "POST",
            mode: "cors",
            headers: {
                "Content-Type": "application/json; charset=utf-8"                },
            body: JSON.stringify(manuscript_annos_query)
        })
        .then(resp => resp.json()) 
        .then(annos => annos.map(anno => anno["@id"] ?? anno.id))
        .catch(err => {
            return null
        })

    // This is bad enough to stop here, we will not continue on towards deleting the entity.
    if(manuscript_anno_ids === null) throw new Error("Cannot find Entity Annotations")

    let manuscript_delete_calls = manuscript_anno_ids.map(annoUri => {
        return fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({ "@id": annoUri.replace(/^https?:/, 'https:') }),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            }
        })
        .then(r => {
            if(r.ok) {return r}
            else {throw new Error(r.text)}
        })
        .catch(err => {
            console.warn(`There was an issue removing an Annotation: ${annoUri}`)
            console.log(err)
            return err
        })
    })

    manuscript_delete_calls.push(
        fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({"@id" : manuscriptWitnessURI.replace(/^https?:/, 'https:')}),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            },
        })
        .then(r => {
            if(r.ok) {return r}
            else {throw new Error(r.text)}
        })
        .catch(err => {
            console.warn(`There was an issue removing the Manuscript Witness: ${manuscriptWitnessURI}`)
            console.log(err)
            return err
        })
    )

    // Obtain and delete each WitnessFragment that is partOf this Manuscript Witness.
    // Note that Annotations targeting those WitnessFragments should be deleted as well.
    const witnessFragmentURIs = await getAllWitnessFragmentsOfManuscript(manuscriptWitnessURI)
    const fragment_delete_calls = witnessFragmentURIs.map(fragmentURI => {
        return deleteWitnessFragment(fragmentURI, false)
    })

    const all_delete_calls = [...manuscript_delete_calls, ...fragment_delete_calls]

    return Promise.all(all_delete_calls).then(success => {
        const ev = new CustomEvent("ManuscriptWitness Deleted")
        broadcast(ev, "ManuscriptWitnessDeleted", document, { "@id":manuscriptWitnessURI, "redirect":redirect } )
        return success
    })
    .catch(err => {
        console.warn("There was an issue removing connected Annotations.")
        console.error(err)
        const ev_err = new CustomEvent("Manuscript Witness Delete Error")
        broadcast(ev_err, "ManuscriptWitnessDeleteError", document, {"@id":manuscriptWitnessURI, "error":err} )
        return err
    })    
}

/**
 * A Gloss entity is being deleted through gloss-metadata.html or ??.  
 * Delete the Gloss, the Annotations targeting the Gloss, the WitnesseFragments of the Gloss, and the WitnessFragments' Annotations.
 * DO NOT delete a Gloss if it is on the public list.  That's a separate function.  See manageGlossModal.js and manage-glosses.html.
 * 
 * @param id {String} The Gloss IRI.
 * @param {boolean} redirect - A flag for whether or not to redirect as part of the UX.
 */
async function deleteGloss(glossURI, redirect=false) {
    if(!glossURI) return
    if(!__constants?.generator) await setConstants()
    const entity = await fetch(glossURI).then(resp => resp.json()).catch(err => {throw err})
    const typecheck = entity ? entity.type ?? entity["@type"] ?? "" : ""
    // There should only be one ManuscriptWitness with this shelfmark.  When we detect that type, we've found it.
    if(!(typecheck === "Gloss" || typecheck === "named-gloss")){
        const entity_err = new CustomEvent("Bad Entity")
        broadcast(entity_err, "GlossDeleteError", document, {"@id":glossURI, "error":`Entity type '${typecheck}' is not a Gloss`} )
        return
    }   
    // Confirm they want to do this
    if (!await showCustomConfirm(`Really delete this Gloss and remove its Witness Fragments?\n(Cannot be undone)`)) return

    // No extra clicks while you await.
    if(redirect) document.querySelector(".dropGloss")?.setAttribute("disabled", "true")

    if(await isPublicGloss(glossURI)){
        const ev = new CustomEvent("Gloss is public")
        globalFeedbackBlip(ev, `This Gloss is public and cannot be deleted from here.`, false)
        return
    }
    let allWitnessFragmentsOfGloss = await getAllWitnessFragmentsOfGloss(glossURI)
    const historyWildcard = { "$exists": true, "$size": 0 }

    // Get all Annotations throughout history targeting this object that were generated by this application.
    const allAnnotationsTargetingEntityQueryObj = {
        target: httpsIdArray(glossURI),
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    const allEntityAnnotationIds = await getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
    .then(annos => annos.map(anno => anno["@id"]))
    .catch(err => {
        alert("Could not gather Annotations to delete.")
        console.log(err)
        return null
    })

    // This is bad enough to stop here, we will not continue on towards deleting the entity.
    if(allEntityAnnotationIds === null) throw new Error("Cannot find Entity Annotations")

    const allEntityAnnotations = allEntityAnnotationIds.map(annoUri => {
        return fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({"@id":annoUri.replace(/^https?:/, 'https:')}),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            }
        })
        .then(r => {
            if(r.ok) {return r}
            else {throw new Error(r.text)}
        })
        .catch(err => { 
            console.warn("issue removing Gloss Entity Annotations")
            console.error(err)
            return err
        })
    })

    const allWitnessFragmentDeletes = allWitnessFragmentsOfGloss.map(witnessURI => {
        return deleteWitnessFragment(witnessURI, false)
    })

    // Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
    await Promise.all(allEntityAnnotations).then(success => {
        console.log("Connected Annotations successfully removed.")
    })
    .catch(err => {
        // OK they may be orphaned.  We will continue on towards deleting the entity.
        console.warn("There was an issue removing connected Annotations.")
        console.log(err)
    })

    // Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
    await Promise.all(allWitnessFragmentDeletes).then(success => {
        console.log("Connected WitnessFragments successfully removed.")
    })
    .catch(err => {
        // OK they may be orphaned.  We will continue on towards deleting the entity.
        console.warn("There was an issue removing connected Witnesses.")
        console.log(err)
    })

    // Now the entity itself
    fetch(`${__constants.tiny}/delete`, {
        method: "DELETE",
        body: JSON.stringify({ "@id": glossURI }),
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Bearer ${window.GOG_USER.authorization}`
        }
    })
    .then(r => {
        if(r.ok){
            const ev = new CustomEvent("Gloss Deleted")
            broadcast(ev, "GlossDeleted", document, { "@id":glossURI, "redirect":redirect })
            return r
        }
        else{ 
            throw new Error(r.text)
        }
    })
    .catch(err => {        
        const ev_err = new CustomEvent("Gloss Delete Error")
        broadcast(ev_err, "GlossDeleteError", document, { "@id":glossURI, "error":err })
        return err
    })
}

/**
 * For a given shelfmark, query RERUM to find matching Manuscript Witness entities.
 * 
 * @param shelfmark - A string representing the shelfmark value
 * @return the Manuscript Witness URI
 */ 
async function getManuscriptWitnessFromShelfmark(shelfmark=null){
    const historyWildcard = { "$exists": true, "$size": 0 }
    if(!shelfmark){
        const ev = new CustomEvent("No shelfmark provided")
        globalFeedbackBlip(ev, `You must provide a shelfmark value.`, false)
        return
    }
    const shelfmarkAnnosQuery = {
        "body.identifier.value": shelfmark,
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }

    /**
     * Since ManuscriptWitness and WitnessFragment types have this shelfmark we have to do an expensive query here.
     * The query gets every Annotation with this shelfmark body and goes through them to find the one that is a ManuscriptWitness.
     * Note this makes no attempt to check if the given shelfmark applies to multiple ManuscriptWitnesses.
     */ 
    let manuscriptUriSet = await getPagedQuery(100, 0, shelfmarkAnnosQuery)
    .then(async (annos) => {
        let manuscript = undefined
        for await (const anno of annos){
            const entity = await fetch(anno.target).then(resp => resp.json()).catch(err => {throw err})
            // There should only be one ManuscriptWitness with this shelfmark.  When we detect that type, we've found it.
            if(entity["@type"] && entity["@type"] === "ManuscriptWitness"){
                manuscript = anno.target
                break
            }    
        }
        return new Set([manuscript])
    })
    .catch(err => {
        console.error(err)
        throw err
    })
    manuscriptUriSet.delete(undefined)

    if(manuscriptUriSet.size === 0){
        console.log(`There is no Manuscript Witness with shelfmark '${shelfmark}'`)
        return
    }
    else if (manuscriptUriSet.size > 1){
        console.log("There are multiple Manuscript Witnesses with this shelfmark and there should only be one.  This is an error.")
        return
    }
    
    // There should only be one unique entry.  If so, we just need to return the first next() in the set iterator.
    return manuscriptUriSet.values().next().value
}

/**
 * For a given Witness Fragment URI, query RERUM to find the Manuscript Witness it is a part of.
 * There is 1 body.partOf Annotation (leaf) whose target value is this Witness Fragment URI.
 * 
 * @param fragmentURI - A string URI of a Witness Fragment entity
 * @return the Manuscript Witness URI
 */ 
async function getManuscriptWitnessFromFragment(fragmentURI=null){
    if(!fragmentURI){
        const ev = new CustomEvent("No Text Fragment URI provided")
        globalFeedbackBlip(ev, `You must provide the text fragment URI.`, false)
        return
    }
    const historyWildcard = { "$exists": true, "$size": 0 }

    const partOfAnnosQuery = {
        "body.partOf.value": {"$exists":true},
        "target": httpsIdArray(fragmentURI),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    // Note this makes no attempt to check if the given WitnessFragment is a partOf multiple ManuscriptWitnesses
    let manuscriptUriSet = await fetch(`${__constants.tiny}/query?limit=1&skip=0`, {
        method: "POST",
        mode: 'cors',
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(partOfAnnosQuery)
    })
    .then(response => response.json())
    .then(async(annos) => {
        const manuscripts = annos.map(async(anno) => {
            const entity = await fetch(anno.body.partOf.value).then(resp => resp.json()).catch(err => {throw err})
            if(entity["@type"] && entity["@type"] === "ManuscriptWitness"){
                return anno.body.partOf.value
            }
            // This will end up in the Set
            return undefined
        })
        const manuscriptWitnessesOnly = await Promise.all(manuscripts).catch(err => {throw err} )
        return new Set(manuscriptWitnessesOnly)
    })
    .catch(err => {
        console.error(err)
        throw err
    })
    manuscriptUriSet.delete(undefined)

    if(manuscriptUriSet.size === 0){
        console.log(`There is no Manuscript Witness for fragment '${fragmentURI}'`)
        return
    }
    // else if(manuscriptUriSet.size > 1){
    //     console.error("There are many Manuscript Witnesses when we only expect one.")
    //     return
    // }
    
    // There should only be one unique entry.  If so, we just need to return the first next() in the set iterator.
    return manuscriptUriSet.values().next().value
}

/**
 * For a given content source (URI or text hash), query RERUM to find the Manuscript Witness it belongs to.
 * 
 * @param source - A string URI or hash representing a resource (textual)
 * @return the Manuscript Witness URI
 */ 
async function getManuscriptWitnessFromSource(source=null){
    if(!source){
        const ev = new CustomEvent("No source provided")
        globalFeedbackBlip(ev, `You must provide a source.`, false)
        return
    }
    if(!__constants?.generator) await setConstants()
    const historyWildcard = { "$exists": true, "$size": 0 }
    const sourceAnnosQuery = {
        "body.source.value": isURI(source) ? httpsIdArray(source) : source,
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    // Note this makes no attempt to check if the given source exists for multiple WitnessFragments.
    let fragmentUriSet = await fetch(`${__constants.tiny}/query?limit=1&skip=0`, {
        method: "POST",
        mode: 'cors',
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(sourceAnnosQuery)
    })
    .then(response => response.json())
    .then(async(annos) => {
        const fragments = annos.map(async(anno) => {
            const entity = await fetch(anno.target).then(resp => resp.json()).catch(err => {throw err})
            if(entity["@type"] && entity["@type"] === "WitnessFragment"){
                return anno.target
            }
            // This will end up in the Set
            return undefined
        })
        const fragmentsOnly = await Promise.all(fragments).catch(err => {throw err} )
        return new Set(fragmentsOnly)
    })
    .catch(err => {
        console.error(err)
        throw err
    })
    // Remove the undefined entry if present
    fragmentUriSet.delete(undefined)
    if(fragmentUriSet.size === 0){
        console.log(`There is no Manuscript Witness with source '${source}'`)
        return
    }
    // There are many fragments with this source.  Those fragments are all a part of one Manuscript Witness.
    // We only need to check for the partOf Annotation on one fragment, since they are all the same.
    const fragmentURI = fragmentUriSet.values().next().value

    //each fragment has partOf Annotations letting you know the Manuscripts it is a part of.
    const partOfAnnosQuery = {
        "body.partOf.value": {"$exists":true},
        "target": httpsIdArray(fragmentURI),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    // Note this makes no attempt to check if the given WitnessFragment is a partOf multiple ManuscriptWitnesses
    let manuscriptUriSet = await fetch(`${__constants.tiny}/query?limit=1&skip=0`, {
        method: "POST",
        mode: 'cors',
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(partOfAnnosQuery)
    })
    .then(response => response.json())
    .then(async(annos) => {
        const manuscripts = annos.map(async(anno) => {
            const entity = await fetch(anno.body.partOf.value).then(resp => resp.json()).catch(err => {throw err})
            if(entity["@type"] && entity["@type"] === "ManuscriptWitness"){
                return anno.body.partOf.value
            }
            // This will end up in the Set
            return undefined
        })
        const manuscriptWitnessesOnly = await Promise.all(manuscripts).catch(err => {throw err} )
        return new Set(manuscriptWitnessesOnly)
    })
    .catch(err => {
        console.error(err)
        throw err
    })
    manuscriptUriSet.delete(undefined)
    if(manuscriptUriSet.size === 0){
        console.log(`There is no Manuscript Witness with source '${source}'`)
        return
    }
    // else if(manuscriptUriSet.size > 1){
    //     console.error("There are many Manuscript Witnesses when we only expect one.")
    //     return
    // }
    return manuscriptUriSet.values().next().value
}

/**
 * Query RERUM or cache for Witness Fragments related to the provided input
 * 
 * @param glossURI - The Gloss URI whose WitnessFragments you want.
 * @return An Array of WitnessFragment URIs
 */ 
async function getAllWitnessFragmentsOfGloss(glossURI){
    if(!__constants?.generator) await setConstants()
    const historyWildcard = { "$exists": true, "$size": 0 }

    const gloss_witness_annos_query = {
        "body.references.value" : httpsIdArray(glossURI),
        '__rerum.history.next':{ $exists: true, $type: 'array', $eq: [] },
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    let fragmentUriSet = await getPagedQuery(100, 0, gloss_witness_annos_query)
    .then(async(annos) => {
        const fragments = annos.map((anno) => anno.target)
        return new Set(fragments)
    })
    .catch(err => {
        console.error(err)
        throw err
    })
    // Remove the undefined entry if present
    if(fragmentUriSet.size === 0){
        console.log(`There are no Manuscript Witnesses that reference the Gloss '${glossURI}'`)
        return []
    }

    return [...fragmentUriSet.values()]
}

/**
 * Reset the gloss modal form to its default values so that it is ready to submit another one.
 */ 
function glossFormReset(event){
    let whatRecordForm = event.target.id ? event.target.id : event.target.getAttribute("name")
    if(whatRecordForm === "gloss-modal-form") document.querySelector("gloss-modal").reset()
}

/**
 * Reset the witness fragment form to its default values so that it is ready to submit another one.
 */ 
function fragmentFormReset(event){
    let whatRecordForm = event.target.id ? event.target.id : event.target.getAttribute("name")
    if(whatRecordForm === "witnessFragmentForm") setFragmentFormDefaults()
}

/**
 * Instead of offering users the picker to choose a Manuscript Witness, programatically choose it instead.
 * This happens when a Manuscript Witness is found from a provided soure so that the user cannot possibly
 * make a second Manuscript Witness connected to the provided source.
 * 
 * @param manuscriptWitnessID - URI of a Manuscript Witness.
 */ 
async function initiateMatch(manuscriptWitnessID){
    if(!manuscriptWitnessID) return
    if(!__constants?.generator) await setConstants()
    const historyWildcard = { "$exists": true, "$size": 0 }
    const shelfmarkAnnosQuery = {
        "body.identifier.value": {"$exists":true},
        "target": httpsIdArray(manuscriptWitnessID),
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    // We need to know the shelfmark to activate the Witness Fragment form because they MUST match.
    return fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
        method: "POST",
        mode: 'cors',
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(shelfmarkAnnosQuery)
    })
    .then(response => response.json())
    .then(annos => {
        if(annos.length === 0){
            console.error("This is awkward.  There are no shelfmarks for this Manuscript Witness")
        }
        else if(annos.length > 1){
            console.error("This is awkward.  There are multiple shelfmarks for this Manuscript Witness")
        }
        const shelfmark = annos[0].body.identifier.value
        manuscriptWitnessForm.setAttribute("matched", true)
        activateFragmentForm(manuscriptWitnessID, shelfmark, false)
    })
    .catch(err => {
        console.error(`Error loading in the manuscript '${manuscriptWitnessID}'`)
        const e = new CustomEvent("Manuscript Witness Error")
        globalFeedbackBlip(e, `Could Not Load In Manuscript Witness`, false)
    })
}

/**
 * A search was performed for Manuscript Witnesses with a given shelfmark.
 * We only expect one Manuscript Witnesses with the given shelfmark, but the functionality below can handle more than one.
 * Turns those Manuscript Witnesses into actionable buttons so the user can pick one to make Fragments for.
 * 
 * TODO:  If there is only one match, we could just initiateMatch() instead of building the picker.
 * 
 * @param matches A string Manuscript Witness URI or an Array of those strings.
 */
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
    submitManuscriptsBtn.classList.add("is-hidden")
    checkForManuscriptsBtn.value = "Check Again"
    manuscriptsFound.classList.remove("is-hidden")
}

/**
 * Once a Manuscript Witness is known, the Manuscript Witness Form should be deactivated.
 * The Witness Fragment form should be activated allowing users to make Witness Fragments for the Manuscript Witness.
 * 
 * @param manuscriptID - Manuscript Witness URI that the Fragments will be a part of
 * @param shelfmark - The shelfmark for that Manuscript Witness.  The shelfmark for each fragment MUST match.
 * @param show - A boolean flag for whether or not to set the UI to show the WitnessFragment form.
 */ 
function activateFragmentForm(manuscriptID, shelfmark, show){
    if(!(manuscriptID && shelfmark)) return
    const partOfElem = witnessFragmentForm.querySelector("input[deer-key='partOf']")
    const witness_shelfmark_elem = manuscriptWitnessForm.querySelector("input[deer-key='identifier']")
    const fragment_shelfmark_elem = witnessFragmentForm.querySelector("input[deer-key='identifier']")
    if(!witness_shelfmark_elem.value){
        // Just populating, don't need an event or to make it dirty because the form it is in is not submittable.
        witness_shelfmark_elem.value = shelfmark
    }
    fragment_shelfmark_elem.value = shelfmark
    fragment_shelfmark_elem.dispatchEvent(new Event('input', { bubbles: true }))
    fragment_shelfmark_elem.setAttribute("disabled", "")
    partOfElem.value = manuscriptID
    partOfElem.setAttribute("value", manuscriptID )
    partOfElem.dispatchEvent(new Event('input', { bubbles: true }))
    look.innerHTML = `Manuscript <a target="_blank" href="manuscript-profile.html#${manuscriptID}"> ${shelfmark} </a> Loaded In`
    look.classList.remove("is-hidden")
    existingManuscriptWitness = manuscriptID
    if(show){
        loading.classList.add("is-hidden")
        witnessFragmentForm.classList.remove("is-hidden")
        manuscriptWitnessForm.classList.add("is-hidden")
    }
    addEventListener('deer-form-rendered', fragmentFormReset)
}

/**
 * Paginate after a user clicks an actionable button that chooses a Manuscript Witness (after searching by shelfmark).
 */ 
function chooseManuscriptWitness(ev){
    const manuscriptChoiceElem = ev.target.tagName === "DEER-VIEW" ? ev.target.parentElement : ev.target
    const manuscriptID = manuscriptChoiceElem.getAttribute("manuscript")
    const shelfmark = manuscriptChoiceElem.querySelector("deer-view").innerText
    activateFragmentForm(manuscriptID, shelfmark, true)
    const e = new CustomEvent("Manuscript Witness Loaded")
    globalFeedbackBlip(e, `Manuscript Witness Loaded`, true)
    return
}

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
    const negotiatedId = gloss["@id"] ?? gloss.id
    const glossURI = negotiatedId.replace(/^https?:/, 'https:')
    modal.classList.add("is-hidden")

    const li = document.createElement("li")
    const div = document.createElement("div")
    // Make this a deer-view so this Gloss is expanded and cached, resulting in more attributes for this element to be filtered on.
    div.classList.add("deer-view")
    div.setAttribute("deer-template", "filterableListItem_glossSelector")
    div.setAttribute("deer-id", negotiatedId)
    div.setAttribute("deer-link", "gloss-metadata.html#")
    li.setAttribute("data-title", title)
    
    // We know the title already so this makes a handy placeholder :)
    li.innerHTML = `<span class="serifText"><a target="_blank" href="gloss-metadata.html#${negotiatedId}">${title}...</a></span>`
    // This helps filterableListItem_glossSelector know how to style the attach button, and also lets us know to change count/total loaded Glosses.
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
 * Remove all URL parameters and restart the user flow on the active HTML page.
 */ 
function startOver(){
    window.location = window.location.origin + window.location.pathname
}

function isURI(urlString){
    try { 
        return Boolean(new URL(urlString))
    }
    catch(e){ 
        return false
    }
}

/**
 * Enable/Disable all form fields
 * @param {boolean} disabled - Set all form fields used to have this value for their `disabled` attribute
 */
function setFieldDisabled(disabled = true) {
    document.querySelectorAll('input,textarea,select,button').forEach(e => {
        if(disabled){
            e.setAttribute("disabled", "")
        }
        else{
            e.removeAttribute("disabled")
        }
    })
}

/**
 * A pagination effect to let the user know an action is in progress.
 * UIs can clear this indicator in the listeners for the completion of those submit and delete actions.
 * @see CustomConfirmModal
 * 
 * FIXME: Give something more obvious to the user.
 *   Shadow out the form
 *   Make the button pulse
 *   Show the loading gif in the button
 *   etc.
 */ 
function inProgress(event, disabled=true){
    // The disabled=false flag can be used to re-enable things
    setFieldDisabled(disabled)
}
