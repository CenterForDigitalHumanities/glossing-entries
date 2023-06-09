/**
 * An archetype entity is being deleted.  Delete it and some choice Annotations connected to it.
 * 
 * Might want to update the name of this to be delete from collection instead of delete this
 * 
 * 
 * @param event {Event} A button/link click event
 * @param type {String} The archtype object's type or @type.
 */ 
async function removeFromCollectionAndDelete(event, type, id = null) {
    event.preventDefault()

    // The URI for the item itself from the location hash, or null b/c it isn't available.
    if(!id) id = location.hash ? location.hash.substr(1) : null
    const thing = 
        (type === "manuscript") ? "Manuscript" :
        (type === "named-gloss") ? "Named Gloss" :
        (type === "Range") ? "Gloss" : null
    const redirect = 
        (type === "manuscript") ? "./manuscripts.html" :
        (type === "named-gloss") ? "./named-glosses.html" :
        (type === "Range") ? "./manage-glosses.html" : null    

    // This won't do    
    if(id === null){
        alert(`No URI supplied for delete.  Cannot delete.`)
        return
    }

    // If it is an unexpected type, we probably shouldn't go through with the delete.
    if(thing === null){
        alert(`Not sure what a ${type} is.  Cannot delete.`)
        return
    }

    // Confirm they want to do this
    if (!confirm(`Really delete this ${thing}?\n(Cannot be undone)`)) return

    const historyWildcard = { "$exists": true, "$size": 0 }

    /**
     * A customized delete functionality for manuscripts, since they have Annotations and Glosses.
     */ 
    if(type==="manuscript"){
        // Such as ' [ Pn ] Paris, BnF, lat. 17233 ''

        const allGlossesOfManuscriptQueryObj = {
            "body.partOf.value": httpsIdArray(id),
            "__rerum.generatedBy" : httpsIdArray("http://store.rerum.io/v1/id/61043ad4ffce846a83e700dd"),
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
        if(allGlossIds === null) {return}

        const allGlosses = allGlossIds.map(glossUri => {
            return fetch("https://tinymatt.rerum.io/gloss/delete", {
                method: "DELETE",
                body: JSON.stringify({"@id":glossUri.replace(/^https?:/,'https:')}),
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
        "__rerum.generatedBy" : httpsIdArray("http://store.rerum.io/v1/id/61043ad4ffce846a83e700dd")
    }
    const allAnnotationIds = await getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
    .then(annos => annos.map(anno => anno["@id"]))
    .catch(err => {
        alert("Could not gather Annotations to delete.")
        console.log(err)
        return null
    })
    // This is bad enough to stop here, we will not continue on towards deleting the entity.
    if(allAnnotationIds === null) return

    const allAnnotations = allAnnotationIds.map(annoUri => {
        return fetch("https://tinymatt.rerum.io/gloss/delete", {
            method: "DELETE",
            body: JSON.stringify({"@id":annoUri.replace(/^https?:/,'https:')}),
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
    fetch("https://tinymatt.rerum.io/gloss/delete", {
        method: "DELETE",
        body: JSON.stringify({"@id":id}),
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Authorization": `Bearer ${window.GOG_USER.authorization}`
        }
    })
    .then(r => {
        if(r.ok){
            location.href = redirect
        }
        else{
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
    if (!id.startsWith("http")) return justArray ? [id] : id
    if (id.startsWith("https://")) return justArray ? [id, id.replace('https', 'http')] : { $in: [id, id.replace('https', 'http')] }
    return justArray ? [id, id.replace('http', 'https')] : { $in: [id, id.replace('http', 'https')] }
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
    return fetch(`https://tinymatt.rerum.io/gloss/query?limit=${lim}&skip=${it}`, {
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
        globalFeedback.classList.add("bg-success")
    } else {
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

function getURLParameter(variable) {
    const query = window.location.search.substring(1)
    const vars = query.split("&")
    for (const i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=")
        if (pair[0] == variable) { return pair[1] }
    }
    return (false)
}

/** Auth */
/*

const GLOSSING_USER_ROLES_CLAIM = "http://rerum.io/user_roles"
const GOG_ADMIN = "glossing_user_admin"
const GOG_CONTRIBUTOR = "glossing_user_contribustor"

const auth = document.querySelector('[is="auth-button"]')

auth.addEventListener("gog-authenticated", ev => {
    if (document.querySelector("[data-user='admin']")) {
        if( !tokenHasRole(ev.detail.authorization,GOG_ADMIN)){ document.querySelectorAll("[data-user='admin']").forEach(elem=>elem.replaceWith(`Restricted`)) }
    }

    if (document.querySelector("[data-user='contributor']")) {
        if( !tokenHasRole(ev.detail.authorization,GOG_CONTRIBUTOR)){ document.querySelectorAll("[data-user='contributor']").forEach(elem=>elem.replaceWith(`Restricted`)) }
    }
})
import jwt_decode from "./jwt.js"
function tokenHasRole(token,role) {
    const user = jwt_decode(token)
    return userHasRole(user, role)
}
*/
