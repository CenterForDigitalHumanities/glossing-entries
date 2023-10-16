/**
 * Shared front end functionality across the HTML pages.
 */
let witnessesObj = {}

// For when we test, so we can easily find and blow away junk data
setTimeout(() => {
    document.querySelectorAll("input[deer-key='creator']").forEach(el => {
        el.value="MultiplicityTest"
        el.setAttribute("value", "MultiplicityTest")
    })
    document.querySelectorAll("form").forEach(el => {
        el.setAttribute("deer-creator", "MultiplicityTest")
    })
    window.GOG_USER["http://store.rerum.io/agent"] = "MultiplicityTest"
}, 4000)

let __constants = {}
setConstants()

async function setConstants(){
    __constants = await fetch("../properties.json").then(r=>r.json()).catch(e=>{return {}})
}

/**
 * Use this on page load to find all the deer-views that should be showing a public collection.
 */ 
function setPublicCollections() {
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
function setListings(){
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
 * An archetype entity is being deleted.  Delete it and some choice Annotations connected to it.
 * 
 * @param event {Event} A button/link click event
 * @param type {String} The archtype object's type or @type.
 */
async function removeFromCollectionAndDelete(event, type, id = null) {
    event.preventDefault()

    // The URI for the item itself from the location hash, or null b/c it isn't available.
    if (!id) id = location.hash ? location.hash.substr(1) : null
    const thing =
        (type === "manuscript") ? "Manuscript" :
            (type === "named-gloss") ? "Gloss" :
                (type === "Range") ? "Gloss" : null
    const redirect =
        (type === "manuscript") ? "./manuscripts.html" :
            (type === "named-gloss") ? "./glosses.html" :
                (type === "Range") ? "./manage-glosses.html" : null

    // This won't do    
    if (id === null) {
        alert(`No URI supplied for delete.  Cannot delete.`)
        return
    }

    // If it is an unexpected type, we probably shouldn't go through with the delete.
    if (thing === null) {
        alert(`Not sure what a ${type} is.  Cannot delete.`)
        return
    }

    // Confirm they want to do this
    if (!confirm(`Really delete this ${thing}?\n(Cannot be undone)`)) return

    const historyWildcard = { "$exists": true, "$size": 0 }

    /**
     * A customized delete functionality for manuscripts, since they have Annotations and Glosses.
     */
    if (type === "manuscript") {
        // Such as ' [ Pn ] Paris, BnF, lat. 17233 ''

        const allGlossesOfManuscriptQueryObj = {
            "body.partOf.value": httpsIdArray(id),
            "__rerum.generatedBy" : httpsIdArray(__constants.generator),
            "__rerum.history.next" : historyWildcard
        }
        const allGlossIds = await getPagedQuery(100, 0, allGlossesOfManuscriptQueryObj)
            .then(annos => annos.map(anno => anno.target))
            .catch(err => {
                alert("Could not gather Glosses to delete.")
                console.log(err)
                return null
            })
        // This is bad enough to stop here, we will not continue on towards deleting the entity.
        if (allGlossIds === null) { return }

        const allGlosses = allGlossIds.map(glossUri => {
            return fetch(`${__constants.tiny}/delete`, {
                method: "DELETE",
                body: JSON.stringify({ "@id": glossUri.replace(/^https?:/, 'https:') }),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                }
            })
                .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
                .catch(err => {
                    console.warn(`There was an issue removing a connected Gloss: ${glossUri}`)
                    console.log(err)
                })
        })
        // Wait for these to delete before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
        await Promise.all(allGlosses).then(success => {
            console.log("Connected Glosses successfully removed.")
        })
            .catch(err => {
                // OK they may be orphaned.  We will continue on towards deleting the entity.
                console.warn(`There was an issue removing Connected Glosses`)
                console.log(err)
            })
    }

    // Get all Annotations throughout history targeting this object that were generated by this application.
    const allAnnotationsTargetingEntityQueryObj = {
        target: httpsIdArray(id),
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    const allAnnotationIds = await getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
        .then(annos => annos.map(anno => anno["@id"]))
        .catch(err => {
            alert("Could not gather Annotations to delete.")
            console.log(err)
            return null
        })
    // This is bad enough to stop here, we will not continue on towards deleting the entity.
    if (allAnnotationIds === null) return

    const allAnnotations = allAnnotationIds.map(annoUri => {
        return fetch(`${__constants.tiny}/delete`, {
            method: "DELETE",
            body: JSON.stringify({ "@id": annoUri.replace(/^https?:/, 'https:') }),
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Authorization": `Bearer ${window.GOG_USER.authorization}`
            }
        })
            .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
            .catch(err => {
                console.warn(`There was an issue removing an Annotation: ${annoUri}`)
                console.log(err)
            })
    })

    // Wait for these to delete before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
    await Promise.all(allAnnotations).then(success => {
        console.log("Connected Annotationss successfully removed.")
    })
        .catch(err => {
            // OK they may be orphaned.  We will continue on towards deleting the entity.
            console.warn("There was an issue removing connected Annotations.")
            console.log(err)
        })

    // Now the entity itself
    fetch(`${__constants.tiny}/delete`, {
        method: "DELETE",
        body: JSON.stringify({ "@id": id }),
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Bearer ${window.GOG_USER.authorization}`
        }
    })
        .then(r => {
            if (r.ok) {
                location.href = redirect
            }
            else {
                return Promise.reject(Error(r.text))
            }
        })
        .catch(err => {
            alert(`There was an issue removing the ${thing} with URI ${id}.  This item may still appear in collections.`)
            console.log(err)
        })
}

function getURLParameter(variable) {
    const query = window.location.search.substring(1)
    const vars = query.split("&")
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1] }
    }
    return (false)
}

function httpsIdArray(id, justArray) {
    if (!id.startsWith("http")) return justArray ? [ id ] : id
    if (id.startsWith("https://")) return justArray ? [ id, id.replace('https','http') ] : { $in: [ id, id.replace('https','http') ] }
    return justArray ? [ id, id.replace('http','https') ] : { $in: [ id, id.replace('http','https') ] }
}

function broadcast(event = {}, type, element, obj = {}) {
    let e = new CustomEvent(type, { detail: Object.assign(obj, { target: event.target }), bubbles: true })
    element.dispatchEvent(e)
}

function alertReturn(noid) {
    let msg = noid
        ? "You entered this page without a manuscript URI. Click OK to head back to the list."
        : "The manuscript this gloss is from does not have a TPEN project associated with it."
}

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

function encodeContentState(contentStateJSON) {
    let uriEncoded = encodeURIComponent(contentStateJSON)
    let base64 = btoa(uriEncoded)
    let base64url = base64.replace(/\+/g, "-").replace(/\//g, "_")
    let base64urlNoPadding = base64url.replace(/=/g, "")
    return base64urlNoPadding
}

function decodeContentState(encodedContentState) {
    let base64url = restorePadding(encodedContentState)
    let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
    let base64Decoded = atob(base64)
    let uriDecoded = decodeURIComponent(base64Decoded)
    return JSON.parse(uriDecoded)
}

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
    const linesLoaded = document.querySelector("tpen-line-selector").hasAttribute("tpen-lines-loaded") ? true : false
    if(!linesLoaded){
        return Promise.reject("There is no reason to run this function because we cannot supply the results to a non-existent UI.  Wait for the T-PEN Transcription to load.")
    }
    // Other asyncronous loading functionality may have already built this.  Use what is cached if so.
    if(Object.keys(witnessesObj).length > 0){
        for(const witnessURI in witnessesObj){
            const witnessInfo = witnessesObj[witnessURI]
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
    const witnessUriSet = await fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
        method: "POST",
        mode: 'cors',
        headers: {
            "Content-Type": "application/json;charset=utf-8"
        },
        body: JSON.stringify(sourceAnnosQuery)
    })
    .then(response => response.json())
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
 * Undo a manual user selection of text on the page.  Mainly just a UI trick.
 * 
 * @param s The Browser Selection object
 */ 
function undoBrowserSelection(s){
    if (s) {
        if (s.removeAllRanges) {
            s.removeAllRanges()
        } else if (s.empty) {
            s.empty()
        }
    }
}

/**
 * Used with preselectLines().  This line element may already contain a mark.  That mark needs to be removed.
 * Each mark removed will need to be restored later.
 */ 
function unmarkLineElement(lineElem){
    let remark_map = {}
    const lineid = lineElem.getAttribute("tpen-line-id")
    remark_map[lineid] = []
    for(const mark of lineElem.querySelectorAll(".pre-select")){
       remark_map[lineid].push(mark.textContent)
    }
    const unmarkup = new Mark(lineElem)
    unmarkup.unmark({"className" : "pre-select"})
    return remark_map
}

/**
 * Used with capstureSelectedText().  There is a range of line elements and any one of them may already contain a mark.  
 * Each mark needs to be removed.  Each mark removed will need to be restored later.
 */ 
function unmarkElements(startEl, stopEl){
    let unmarkup = new Mark(startEl)
    let remark_map = {}
    const stopID = stopEl.getAttribute("tpen-line-id")
    // Upstream from this the selection in startEl is checked for a <mark>.  We know it does not have a <mark> here.
    remark_map[startEl.getAttribute("tpen-line-id")] = []
    for(const mark of startEl.querySelectorAll(".pre-select")){
        // For each thing you want to unmark, grab the text so we can remark it
        remark_map[startEl.getAttribute("tpen-line-id")].push(mark.textContent)
    }
    unmarkup.unmark({"className" : "pre-select"})
    if(stopID !== startEl.getAttribute("tpen-line-id")){
        // The selection happened over multiple lines.  Any of those lines may contain a <mark>.  If they do, it is an invalid selection.
        let nextEl = startEl.nextElementSibling
        while(nextEl.getAttribute("tpen-line-id") !== stopID){
            if(nextEl.nextElementSibling){
                nextEl = nextEl.nextElementSibling
            }
            else{
                //We are at the end of a page and are going on to the next page.  Get to the next page element and get the first line element.
                nextEl = nextEl.closest(".pageContainer").nextElementSibling.nextElementSibling.nextElementSibling.firstChild
            }
            if(nextEl.querySelector("mark") && stopID !== nextEl.getAttribute("tpen-line-id")){
                // The user selection contains a <mark> and is invalid.
                const ev = new CustomEvent("Your selection contained text marked for another selection.  Make a different selection.")
                globalFeedbackBlip(ev, `Your selection contained text marked for another selection.  Make a different selection.`, false)
                // remove browser's text selection
                undoBrowserSelection(s)
                // rebuild valid marks that were removed
                remarkElements(remark_map)
                return null
            }
            remark_map[nextEl.getAttribute("tpen-line-id")] = []
            // For each thing you want to unmark, grab the text so we can remark it
            for(const mark of nextEl.querySelectorAll(".pre-select")){
                remark_map[nextEl.getAttribute("tpen-line-id")].push(mark.textContent)
            }
            unmarkup = new Mark(nextEl)
            unmarkup.unmark({"className" : "pre-select"})
        }
        // Upstream from this the selection in stopEl is checked for a <mark>.  We know it does not have a <mark> here.
        remark_map[stopEl.getAttribute("tpen-line-id")] = []
        for(const mark of stopEl.querySelectorAll(".pre-select")){
            // For each thing you want to unmark, grab the text so we can remark it
            remark_map[stopEl.getAttribute("tpen-line-id")].push(mark.textContent)
        }
        unmarkup = new Mark(stopEl)
        unmarkup.unmark({"className" : "pre-select"})
    }
    return remark_map
}

/**
 * Replace Marks that were undone during selection object get and set scenarios.
 * 
 * @param markData A Map of line ids that correlate to a line element.  The value is an array of strings to Mark within the line element.
 */ 
function remarkElements(markData){
    // restore the marks that were there before the user did the selection
    for(const id in markData){
        const restoreMarkElem = document.querySelector(`div[tpen-line-id="${id}"]`)
        const markit = new Mark(restoreMarkElem)
        const strings = markData[id]
        strings.forEach(str => {
            markit.mark(str, {
                diacritics : true,
                separateWordSearch : false,
                className : "pre-select",
                acrossElements : true,
                accuracy: "complimentary"
            })    
        })
    }
}
