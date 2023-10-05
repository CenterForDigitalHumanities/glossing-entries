/**
 * Shared front end functionality across the HTML pages.
 */

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
 * 
 * @param source A String that is either a text body or a URI to a text resource.
 */ 
async function getAllWitnessesOfSource(source){
    const totalsProgress = document.querySelector(".totalsProgress") ? document.querySelector(".totalsProgress") : null
    if(totalsProgress === null){
        return Promise.reject("There is no reason to run this function because we cannot supply the results to a non-existent UI.  Wait for the Glosses to load.")
    }
    const cachedFilterableGlosses = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
    const numloaded = parseInt(totalsProgress.getAttribute("count"))
    const total = parseInt(totalsProgress.getAttribute("total"))
    if(cachedFilterableGlosses.size === 0 || numloaded !== total){
        console.error("There is no reason to run this function because we cannot supply the results to a non-existent UI.  Wait for the Glosses to load.")
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
    let witnessesObj = {}
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
        console.log("Witnesses Object Successfully Built")
        const ev = new CustomEvent("Witnesses Object Successfully Built")
        globalFeedbackBlip(ev, `Witnesses Object Successfully Built!`, true)
        console.log("Witnesses Object")
        console.log(witnessesObj)
        console.log("Glosses' Information")
        for(const witnessURI in witnessesObj){
            const witnessInfo = witnessesObj[witnessURI]
            witnessInfo.glosses.forEach(glossURI => {
                // For each Gloss URI find its corresponding 'attach' button and class it so users know that gloss has been attached to this source
                document.querySelectorAll(`.toggleIncludes[data-id="${glossURI}"]`).forEach(btn => {
                    console.log(cachedFilterableGlosses.get(glossURI))
                    btn.classList.add("attached-to-source")
                    btn.title = "This Gloss has been attached to this source in the past."
                })    
            })
            preselectLines(witnessInfo.selections, witnessForm)
        }
    })
    .catch(err => {
        console.error("Witnesses Object Error")
        console.error(err)
        const ev = new CustomEvent("Witnesses Object Error")
        globalFeedbackBlip(ev, `Witnesses Object Error`, false)
    })
    
    // Each Gloss has information pertinent to the page.  It was already expanded and is in cache.

}
