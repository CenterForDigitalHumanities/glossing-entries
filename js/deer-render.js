/**
 * @module DeerRender Data Encoding and Exhibition for RERUM
 * @author Patrick Cuba <cubap@slu.edu>
 * @author Bryan Haberberger <bryan.j.haberberger@slu.edu>
 * @version 0.11


 * This code should serve as a basis for developers wishing to
 * use TinyThings as a RERUM proxy for an application for data entry,
 * especially within the Eventities model.
 * @see tiny.rerum.io
 */

import { default as UTILS } from './deer-utils.js'
import { default as config } from './deer-config.js'
import { OpenSeadragon } from './openseadragon.js'
import pLimit from './plimit.js'

const limiter = pLimit(4)
const changeLoader = new MutationObserver(renderChange)
var DEER = config

/**
 * Observer callback for rendering newly loaded objects. Checks the
 * mutationsList for "deep-object" attribute changes.
 * @param {Array} mutationsList of MutationRecord objects
 */
async function renderChange(mutationsList) {
    for (var mutation of mutationsList) {
        switch (mutation.attributeName) {
            case DEER.ID:
            case DEER.KEY:
            case DEER.LINK:
            case DEER.LIST:
                let id = mutation.target.getAttribute(DEER.ID)
                if (id === null ?? mutation.target.getAttribute(DEER.COLLECTION)) return
                let obj = {}
                try {
                    obj = JSON.parse(localStorage.getItem(id))
                } catch (err) { }
                const negotiatedId = obj["@id"] ?? obj.id
                if (!negotiatedId) {
                    id = id.replace(/^https?:/, 'https:') // avoid mixed content
                    obj = await fetch(id).then(response => response.json()).catch(error => error)
                    if (obj) {
                        localStorage.setItem(negotiatedId, JSON.stringify(obj))
                    } else {
                        return false
                    }
                }
                RENDER.element(mutation.target, obj)
                break
            case DEER.LISTENING:
                let listensTo = mutation.target.getAttribute(DEER.LISTENING)
                if (listensTo) {
                    mutation.target.addEventListener(DEER.EVENTS.CLICKED, e => {
                        let loadId = e.detail["@id"] ?? e.detail.id
                        if (loadId === listensTo) { mutation.target.setAttribute("deer-id", loadId) }
                    })
                }
        }
    }
}

const RENDER = {}

RENDER.element = function (elem, obj) {

    return UTILS.expand(obj).then(obj => {
        let tmplName = elem.getAttribute(DEER.TEMPLATE) ?? (elem.getAttribute(DEER.COLLECTION) ? "list" : "json")
        let template = DEER.TEMPLATES[tmplName] ?? DEER.TEMPLATES.json
        let options = {
            list: elem.getAttribute(DEER.LIST),
            link: elem.getAttribute(DEER.LINK),
            collection: elem.getAttribute(DEER.COLLECTION),
            key: elem.getAttribute(DEER.KEY),
            label: elem.getAttribute(DEER.LABEL),
            index: elem.getAttribute("deer-index"),
            config: DEER
        }
        let templateResponse = template(obj, options)
        elem.innerHTML = (typeof templateResponse.html === "string") ? templateResponse.html : templateResponse
        //innerHTML may need a little time to finish to actually populate the template to the DOM, so do the timeout trick here.
        /**
         * A streamlined approach would treat each of these as a Promise-like node and the return of RENDER.element
         * would be a Promise.  That way, something that looped and did may of these could do something like
         * Promise.all() before firing a completion/failure event (or something).  
         */
        setTimeout(function () {
            let newViews = (elem.querySelectorAll(config.VIEW).length) ? elem.querySelectorAll(config.VIEW) : []
            let newForms = (elem.querySelectorAll(config.FORM).length) ? elem.querySelectorAll(config.FORM) : []
            if (newForms.length) {
                UTILS.broadcast(undefined, DEER.EVENTS.NEW_FORM, elem, { set: newForms })
            }
            if (newViews.length) {
                UTILS.broadcast(undefined, DEER.EVENTS.NEW_VIEW, elem, { set: newViews })
            }
            UTILS.broadcast(undefined, DEER.EVENTS.VIEW_RENDERED, elem, obj)
        }, 0)

        if (typeof templateResponse.then === "function") { templateResponse.then(elem, obj, options) }
        //Note this is deprecated for the "deer-view-rendered" event.  above.  
        UTILS.broadcast(undefined, DEER.EVENTS.LOADED, elem, obj)
    })
}

/**
 * The TEMPLATED renderer to draw JSON to the screen
 * @param {Object} obj some json to be drawn as JSON
 * @param {Object} options additional properties to draw with the JSON
 */
DEER.TEMPLATES.json = function (obj, options = {}) {
    let indent = options.indent ?? 4
    let replacer = (k, v) => {
        if (DEER.SUPPRESS.indexOf(k) !== -1) return
        return v
    }
    try {
        return `<pre>${JSON.stringify(obj, replacer, indent)}</pre>`
    } catch (err) {
        return null
    }
}

/**
 * Get a certain property from an object and return it formatted as HTML to be drawn.  
 * @param {Object} obj some obj containing a key that needs to be drawn
 * @param {String} key the name of the key in the obj we are looking for
 * @param {String} label The label to be displayed when drawn
 */
DEER.TEMPLATES.prop = function (obj, options = {}) {
    let key = options.key ?? "@id"
    let prop = obj[key] ?? "[ no value ]"
    // let label = options.label ?? UTILS.getLabel(obj, prop)
    try {
        // return `<span class="${prop}">${label}: ${UTILS.getValue(prop) ?? "[ undefined ]"}</span>`
        return `<span class="${prop}">${UTILS.getValue(prop) ?? "[ no value ]"}</span>`
    } catch (err) {
        return null
    }
}

/**
 * Retreive the best label for object and return it formatted as HTML to be drawn.  
 * @param {Object} obj some obj to be labeled
 * @param {Object} options for lookup
 */
DEER.TEMPLATES.label = function (obj, options = {}) {
    let key = options.key ?? "@id"
    let prop = obj[key] ?? "[ no value ]"
    let label = options.label ?? UTILS.getLabel(obj, prop)
    try {
        return `${label}`
    } catch (err) {
        return null
    }
}

/**
 * Retreive the shelfmark for object and return it formatted as HTML to be drawn.  
 * @param {Object} obj some JSON containing 'identifier'
 * @param {Object} options for lookup
 */
DEER.TEMPLATES.shelfmark = function (obj, options = {}) {
    const shelfmark = UTILS.getValue(obj.identifier)
    try {
        return `${shelfmark}`
    } catch (err) {
        return null
    }
}

/**
 * Generates HTML for displaying folio transcriptions.
 * @param {object} obj - The object containing data for generating folio transcriptions.
 * @param {object} options - Options for generating folio transcriptions (optional).
 * @returns {object} - An object containing HTML and a function for rendering folio transcriptions.
 */
DEER.TEMPLATES.folioTranscription = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
    return {
        html: obj.tpenProject ? `<div class="is-full-width"> <h3> ... loading preview ... </h3> </div>` : ``,
        then: (elem) => {
            const url = obj.tpenProject[0]?.value ?? obj.tpenProject.value
            fetch("https://t-pen.org/TPEN/manifest/" + url)
                .then(response => response.json())
                .then(ms => elem.innerHTML = `
                ${ms.sequences[0].canvases.slice(0, 10).reduce((a, b) => a += `
                <div class="page">
                    <h3>${b.label}</h3> 
                    <a href="./layout.html?partOf=${elem.getAttribute("deer-partof")}#${ms['@id'] ?? ms.id}">(edit layout)</a>
                    <a href="./align-glosses.html#${ms['@id'] ?? ms.id}">(align Glosses)</a>
                    <div class="pull-right col-6">
                        <img src="${b.images[0].resource['@id']}">
                    </div>
                        ${b.otherContent[0].resources.reduce((aa, bb) => aa += `
                        <span class="line" title="${bb["@id"] ?? bb.id}">${bb.resource["cnt:chars"].length ? bb.resource["cnt:chars"] : "[ empty line ]"}</span>
                        `, ``)}
                </div>
                `, ``)}
        `)
        }
    }
}

/**
 * Generates HTML for displaying images using OpenSeadragon (OSD).
 * @param {object} obj - The object containing data for displaying images.
 * @param {object} options - Options for displaying images (optional).
 * @returns {object|string} - An object containing HTML and a function for displaying images using OSD, or a string representing a bare image template.
 */
DEER.TEMPLATES.osd = function (obj, options = {}) {
    const index = options.index && !isNaN(options.index) ? options.index : 0
    const imgURL = obj.sequences[0].canvases[index].images[0].resource['@id']
    const bareImgTemplate = `<img alt="folio view" src="${imgURL}">`
    if (imgURL.includes("TPEN/pageImage")) {
        return bareImgTemplate
    }
    return {
        html: ``,
        then: elem => {
            try {
                OpenSeadragon({
                    id: elem.id,
                    tileSources: {
                        type: 'image',
                        url: imgURL,
                        crossOriginPolicy: 'Anonymous',
                        ajaxWithCredentials: false
                    }
                })
            }
            catch (err) {
                elem.innerHTML = bareImgTemplate
            }
        }
    }
}

/**
 * Generates HTML and functionality for managing glosses.
 * @param {Object} obj - The gloss object.
 * @param {Object} options - Options for customization.
 * @returns {Object} - HTML structure and functionality.
 */
DEER.TEMPLATES.managedlist = function (obj, options = {}) {
    return{
        html: ` 
            <style>
                .cachedNotice{
                    margin-top: -1em;
                    display: block;
                    margin-bottom: 0.55em;
                }
                .cachedNotice a{
                    cursor: pointer;
                }

                .galleryEntry{
                    cursor: alias;
                }
                .totalsProgress{
                    text-align: center;
                    background-color: rgba(0, 0, 0, 0.1);
                    padding-top: 4px;
                    font-size: 13pt;
                }
                .facet-filters{
                    border-bottom: 1px solid black;
                }
                ul{
                    list-style-type: none;
                    padding-left: 1em;
                }
            </style>
            <h2 class="nomargin"> Manage Glosses </h2>
            <small class="cachedNotice is-hidden text-primary"> These Glosses were cached.  To reload the data <a class="newcache tag is-small">click here</a>. </small>
            <div class="row is-hidden facet-filters">
                <div class="col-4 is-hidden">
                    <div class="statusFacets">
                        <small> 
                            Check to see Glosses with the status.
                        </small>
                        <input class="statusFacet" type="checkbox" status-filter="public" /><label>Public</label>
                        <input class="statusFacet" type="checkbox" status-filter="unlabeled" /><label>Untitled</label>
                        <input class="statusFacet" type="checkbox" status-filter="other" /><label>T.B.D.</label>
                    </div>
                </div>
                <div class="col-12">
                    <small> 
                        Find Glosses by text
                    </small>
                    <input filter="title" type="text" placeholder="&hellip;Type to filter by incipit, text, or targeted text" class="serifText">
                </div>
            </div>
            <div class="progressArea row">
                <div class="col">
                    <p class="filterNotice is-hidden"> Gloss filter detected.  Please note that Glosses will appear as they are fully loaded. </p>
                    <div class="totalsProgress" count="0"> {loaded} out of {total} loaded (0%).  This may take a few minutes.  You may click to select any Gloss loaded already.</div>
                </div>
            </div>
        `,
        then: (elem) => {
            let managedListCache = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
            let numloaded = 0
            let total = 0
            const type = obj.name.includes("Named-Glosses") ? "named-gloss" : "manuscript"
            const filterObj = {}
            if (options.list) {
                let ul = document.createElement("ul")
                const deduplicatedList = UTILS.removeDuplicates(obj[options.list], '@id')
                total = deduplicatedList.length                
                deduplicatedList.forEach((val, index) => {
                    const negotiatedId = val["@id"] ?? val.id
                    const glossID = negotiatedId.replace(/^https?:/, 'https:')
                    const publishedStatus = document.createElement("span")
                    publishedStatus.classList.add("pubStatus")
                    publishedStatus.setAttribute("glossid", glossID)
                    publishedStatus.innerText = "??"
                    let li = document.createElement("li")
                    li.setAttribute("deer-id", glossID)
                    li.classList.add("galleryEntry")
                    let a = document.createElement("a")
                    a.setAttribute("href", options.link+glossID)
                    a.setAttribute("target", "_blank")
                    let span = document.createElement("span")

                    if(managedListCache.get(glossID)){
                        // We cached it in the past and are going to trust it right now.
                        const cachedObj = managedListCache.get(glossID)
                        let filteringProps = Object.keys(cachedObj)
                        // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem (already have the data).
                        li.setAttribute("data-expanded", "true")
                        // Add all Gloss object properties to the <li> element as attributes to match on later
                        filteringProps.forEach( (prop) => {
                            if(prop === "text"){
                                const t = cachedObj[prop]?.value?.textValue ?? ""
                                li.setAttribute("data-text", t) 
                            }
                            else if(typeof UTILS.getValue(cachedObj[prop]) === "string" || typeof UTILS.getValue(cachedObj[prop]) === "number") {
                                let value = UTILS.getValue(cachedObj[prop])+""
                                prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                const attr = `data-${prop}`
                                if(prop === "title" && !value){
                                    value = "[ unlabeled ]"
                                    li.setAttribute("data-unlabeled", "true")
                                }
                                li.setAttribute(attr, value)
                                if(value.includes(filterObj[prop])){
                                    li.classList.remove("is-hidden")
                                }
                            }
                        })
                        if(!filteringProps.includes("title")) {
                            li.setAttribute("data-title", "[ unlabeled ]")
                            li.setAttribute("data-unlabeled", "true")
                        }
                        span.innerText = UTILS.getLabel(cachedObj) ? UTILS.getLabel(cachedObj) : "Label Unprocessable"
                        numloaded++
                        a.appendChild(span)
                        li.appendChild(publishedStatus)
                        li.appendChild(a)
                        ul.appendChild(li)
                    }
                    else{
                        // This object was not cached so we do not have its properties.
                        // Make this a deer-view so this Gloss is expanded and we can make attributes from its properties.
                        let div = document.createElement("div")
                        div.setAttribute("deer-template", "managedFilterableListItem")
                        div.setAttribute("deer-id", glossID)
                        div.classList.add("deer-view")
                        span.innerText = `Loading Gloss #${index + 1}...`
                        a.appendChild(span)
                        li.appendChild(publishedStatus)
                        li.appendChild(a)
                        div.appendChild(li)
                        ul.appendChild(div)
                    }
                })
                elem.appendChild(ul)
            }
            else{
                console.log("There are no items in this list to draw.")
                console.log(obj)
                return
            }
            elem.$contentState = ""
            const totalsProgress = elem.querySelector(".totalsProgress")

            const filter = elem.querySelector('input[filter="title"]')
            const facetFilter = elem.querySelector(".statusFacets")
            const facetInputs = elem.querySelectorAll(".statusFacet")
            const cachedNotice = elem.querySelector(".cachedNotice")
            const progressArea = elem.querySelector(".progressArea")

            totalsProgress.innerText = `${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%).  This may take a few minutes.  You may click to select any Gloss loaded already.`
            totalsProgress.setAttribute("total", total)
            totalsProgress.setAttribute("count", numloaded)

            elem.querySelector(".newcache").addEventListener("click", ev => {
                localStorage.clear()
                location.reload()
            })

            // These particular ones are true/false flags, so their value is "true" and "false" not some other string to match on.
            // TODO work with other filters.  Will it be $AND or $OR?
            facetInputs.forEach(input => {
                input.addEventListener('input', ev =>{
                    const k = ev?.target.getAttribute("status-filter")
                    const url = new URL(window.location.href)
                    let filterQuery
                    let filters = {}
                    // TODO need the build this filter based on every checked status and typed text to match on.
                    if(ev?.target.checked){
                        filters[k] = "true"
                    }
                    if(Object.keys(filters).length === 0) filters.title = ""
                    filterQuery = encodeContentState(JSON.stringify(filters))
                    debounce(filterGlosses(filterQuery))
                })    
            })
            
            // This is a freeform filter to match on text.  
            // TODO It will need to take the statuses into account.  Will it be $AND or $OR?
            filter.addEventListener('input', ev =>{
                const val = ev?.target.value.trim()
                let filterQuery
                if(val){
                    filterQuery = encodeContentState(JSON.stringify({"title" : ev?.target.value, "text": ev?.target.value, "targetedtext": ev?.target.value}))
                }
                else{
                    filterQuery = encodeContentState(JSON.stringify({"title" : ""}))
                }
                debounce(filterGlosses(filterQuery))
            })
            
            if(numloaded === total){
                cachedNotice.classList.remove("is-hidden")
                saveList.classList.remove("is-hidden")
                progressArea.classList.add("is-hidden")
                elem.querySelector(".facet-filters").classList.remove("is-hidden")
                elem.querySelectorAll("input[filter]").forEach(i => {
                    i.classList.remove("is-hidden")
                })
            }
            function debounce(func, timeout = 500) {
                let timer
                return (...args) => {
                    clearTimeout(timer)
                    timer = setTimeout(() => { func.apply(this, args) }, timeout)
                }
            }

            /** 
             * This presumes things are already loaded.  Do not use this function unless all glosses are loaded.
             */ 
            function filterGlosses(queryString = '') {
                const numloaded = parseInt(totalsProgress.getAttribute("count"))
                const total = parseInt(totalsProgress.getAttribute("total"))
                if (numloaded !== total) {
                    const ev = new CustomEvent("All data must be loaded to use this filter.  Please wait.")
                    UTILS.globalFeedbackBlip(ev, `All data must be loaded to use this filter.  Please wait.`, false)
                    return
                }
                queryString = queryString.trim()
                const query = decodeContentState(queryString)
                for (const prop in query) {
                    if (typeof query[prop] === 'string') {
                        query[prop] = query[prop].trim()
                    }
                }
                const items = elem.querySelectorAll('li')
                items.forEach(li=>{
                    const templateContainer = li.parentElement.hasAttribute("deer-template") ? li.parentElement : null
                    const elem = templateContainer ?? li
                    if(!elem.classList.contains("is-hidden")){
                        elem.classList.add("is-hidden")
                    }
                    for(const prop in query){
                        if(li.hasAttribute(`data-${prop}`)){
                            const action = li.getAttribute(`data-${prop}`).toLowerCase().includes(query[prop].toLowerCase()) ? "remove" : "add"
                            elem.classList[action](`is-hidden`,`un${action}-item`)
                            setTimeout(()=>elem.classList.remove(`un${action}-item`),500)
                            // If it is showing, no need to check other properties for filtering.
                            if(action === "remove") break
                        }
                    }
                })
            }

            let url = new URL(elem.getAttribute("deer-listing"))
            url.searchParams.set('nocache', Date.now())
            fetch(url).then(r => r.json())
            .then(list => {
                elem.listCache = new Set()
                list.itemListElement?.forEach(item => {
                    const negotiatedId = item['@id'] ?? item.id
                    elem.listCache.add(negotiatedId.replace(/^https?:/, 'https:'))
                })
                for (const span of elem.querySelectorAll('.pubStatus')) {
                    const li = span.parentElement
                    const a = li.querySelector("a")
                    if(elem.listCache.has(span.getAttribute("glossid"))){
                        span.innerHTML = "✓"
                        li.setAttribute("data-public", "true")
                        a.setAttribute("data-public", "true")
                    }
                    else{
                        span.innerHTML = "❌"
                        li.setAttribute("data-public", "false")
                        a.setAttribute("data-public", "false")
                    }
                }
            })
            .then(() => {
                elem.querySelectorAll(".galleryEntry").forEach(el => el.addEventListener('click', (ev) => {
                    ev.preventDefault()
                    ev.stopPropagation()
                    // This <li> will have all the processed data-stuff that we will want to use upstream.
                    const parentDataElem = ev.target.closest("li")
                    if(!parentDataElem.getAttribute("data-type")){
                        // Don't have enough info to manage yet
                        const wait = new CustomEvent("Please wait for this Gloss information to load.")
                        UTILS.globalFeedbackBlip(wait, `Please wait for this Gloss information to load.`, false)
                        return
                    }
                    const glossID = parentDataElem.getAttribute("deer-id") ? parentDataElem.getAttribute("deer-id") : ""
                    const glossTitle = parentDataElem.getAttribute("data-title") ? parentDataElem.getAttribute("data-title") : ""
                    const published = parentDataElem.getAttribute("data-public") === "true" ? true : false
                    const glossText = parentDataElem.getAttribute("data-text") ? parentDataElem.getAttribute("data-text") : ""
                    const glossData = {
                        "@id": glossID,
                        "title": glossTitle,
                        "text" : glossText,
                        "published": published
                    }
                    document.querySelector("manage-gloss-modal").open(glossData)
                }))
                saveList.addEventListener('click', overwriteList)
            })
            /**
             * Overwrites the list of glosses with updated data.
             */            
            function overwriteList() {
                let mss = []
                let missing = false
                elem.listCache.forEach(uri => {
                    uri = uri.replace(/^https?:/, 'https:')
                    let labelElement = document.querySelector(`li[deer-id='${uri}'] a span`)
                    if (labelElement) {
                        let label = labelElement.textContent.trim()
                        mss.push({
                            label: label,
                            '@id': uri
                        })
                    } else {
                        console.log(`Element with deer-id '${uri}' not found.`)
                        missing = true
                    }
                })
                
                if (missing) {
                    const ev = new CustomEvent("Not Ready")
                    UTILS.globalFeedbackBlip(ev, `Cannot overwrite list while glosses are still loading.`, false)
                    return
                }

                const list = {
                    '@id': elem.getAttribute("deer-listing"),
                    '@context': 'https://schema.org/',
                    '@type': "ItemList",
                    name: "Gallery of Glosses Public Glosses List",
                    numberOfItems: elem.listCache.size,
                    itemListElement: mss
                }
                
                fetch(DEER.URLS.OVERWRITE, {
                    method: "PUT",
                    mode: 'cors',
                    body: JSON.stringify(list),
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    }
                })
                .then(r => {
                    if (r.ok) {
                        return r.json()
                    } else {
                        throw new Error('Failed to save')
                    }
                })
                .then(data => {
                    const ev = new CustomEvent("Public List Updated")
                    UTILS.globalFeedbackBlip(ev, `Public Glosses Updated Successfully.`, true)
                    saveList.setAttribute("disabled", "true")
                })
                .catch(err => {
                    const ev = new CustomEvent("Public List Update Failed")
                    UTILS.globalFeedbackBlip(ev, `There was an error.  The public list may not be updated.`, true)
                    console.error(err)
                })
            }
        }
    }
}

/**
 * The TEMPLATED renderer to draw an JSON to the screen as some HTML template
 * @param {Object} obj some json of type Entity to be drawn
 * @param {Object} options additional properties to draw with the Entity
 */
DEER.TEMPLATES.entity = function (obj, options = {}) {
    let tmpl = `<h2>${UTILS.getLabel(obj)}</h2>`
    let list = ``

    for (let key in obj) {
        if (DEER.SUPPRESS.indexOf(key) > -1) { continue }
        let label = key
        let value = UTILS.getValue(obj[key], key)
        try {
            if ((value.image ?? value.trim()).length > 0) {
                list += (label === "depiction") ? `<img title="${label}" src="${value.image ?? value}" ${DEER.SOURCE}="${UTILS.getValue(obj[key].source, "citationSource")}">` : `<dt deer-source="${UTILS.getValue(obj[key].source, "citationSource")}">${label}</dt><dd>${value.image ?? value}</dd>`
            }
        } catch (err) {
            // Some object maybe or untrimmable somesuch
            // is it object/array?
            list += `<dt>${label}</dt>`
            if (Array.isArray(value)) {
                value.forEach((v, index) => {
                    let name = UTILS.getLabel(v, (v.type ?? v['@type'] ?? label + '' + index))
                    let negotiatedId = v["@id"] ?? v.id
                    list += (negotiatedId) ? `<dd><a href="#${negotiatedId}">${name}</a></dd>` : `<dd ${DEER.SOURCE}="${UTILS.getValue(v.source, "citationSource")}">${UTILS.getValue(v)}</dd>`
                })
            } else {
                // a single, probably
                // TODO: export buildValueObject() from UTILS for use here
                if (typeof value === "string") {
                    value = {
                        value: value,
                        source: {
                            citationSource: obj['@id'] ?? obj.id ?? "",
                            citationNote: "Primitive object from DEER",
                            comment: "Learn about the assembler for this object at https://github.com/CenterForDigitalHumanities/deer"
                        }
                    }
                }
                let v = UTILS.getValue(value)
                if (typeof v === "object") { v = UTILS.getLabel(v) }
                if (v === "[ unlabeled ]") { v = v['@id'] ?? v.id ?? "[ complex value unknown ]" }
                const negotiatedId = value['@id'] ?? value.id
                list += (negotiatedId) ? `<dd ${DEER.SOURCE}="${UTILS.getValue(value.source, "citationSource")}"><a href="${options.link ?? ""}#${negotiatedId}">${v}</a></dd>` : `<dd ${DEER.SOURCE}="${UTILS.getValue(value, "citationSource")}">${v}</dd>`
            }
        }
    }
    tmpl += (list.includes("</dd>")) ? `<dl>${list}</dl>` : ``
    return tmpl
}

export default class DeerRender {
    constructor(elem, deer = {}) {
        for (let key in DEER) {
            if (typeof DEER[key] === "string") {
                DEER[key] = deer[key] ?? config[key]
            } else {
                DEER[key] = Object.assign(config[key], deer[key])
            }
        }
        changeLoader.observe(elem, {
            attributes: true
        })
        this.$dirty = false
        this.id = elem.getAttribute(DEER.ID)
        this.collection = elem.getAttribute(DEER.COLLECTION)
        this.elem = elem

        try {
            if (!(this.id ?? this.collection)) {
                let err = new Error(this.id + " is not a valid id.")
                err.code = "NO_ID"
                throw err
            } else {
                if (this.id) {
                    this.id = (!this.id.includes("localhost")) ? this.id.replace(/^https?:/, 'https:') : this.id // avoid mixed content
                    limiter(() => fetch(this.id).then(response => response.json()).then(obj => RENDER.element(this.elem, obj)).catch(err => {
                        UTILS.broadcast(undefined, "expandError", document, { uri:this.id, error:err, message: `Could not get details for '${this.id}'` })
                        return err
                    }))
                } else if (this.collection) {
                    // Look not only for direct objects, but also collection annotations
                    // Only the most recent, do not consider history parent or children history nodes
                    let historyWildcard = { "$exists": true, "$size": 0 }
                    let queryObj = {
                        $or: [{
                            "targetCollection": this.collection
                        }, {
                            "body.targetCollection": this.collection
                        }, {
                            "body.partOf": this.collection
                        }],
                        "__rerum.history.next": historyWildcard
                    }
                    const listObj = {
                        name: this.collection,
                        itemListElement: []
                    }

                    getListPagedQuery.bind(this)(100)
                        .then(() => RENDER.element(this.elem, listObj))
                        .catch(err => {
                            console.error("Broke with listObj at ", listObj)
                            RENDER.element(this.elem, listObj)
                        })
                    /**
                     * Function to fetch paged query results for a list.
                     * @param {number} lim - The limit for the number of items per page.
                     * @param {number} it - The offset for pagination.
                     * @returns {Promise} - A promise that resolves to the paged query results.
                     */
                    function getListPagedQuery(lim, it = 0) {
                        const q = DEER.URLS.QUERY.replace("?limit=100&skip=0", "")
                        return fetch(`${q}?limit=${lim}&skip=${it}`, {
                            method: "POST",
                            mode: "cors",
                            headers: {
                                "Content-Type": "application/json; charset=utf-8"
                            },
                            body: JSON.stringify(queryObj)
                        }).then(response => {
                            if (!response.ok){
                                UTILS.handleErrorBlip(response)
                            }
                            return response.json()
                        })
                        .then(list => {
                            listObj.itemListElement = listObj.itemListElement.concat(list.map(anno => ({ '@id': anno.target ?? anno["@id"] ?? anno.id })))
                            this.elem.setAttribute(DEER.LIST, "itemListElement")
                            try {
                                listObj["@type"] = list[0]["@type"] ?? list[0].type ?? "ItemList"
                            } catch (err) { }
                            if (list.length ?? (list.length % lim === 0)) {
                                return getListPagedQuery.bind(this)(lim, it + list.length)
                            }
                        })
                        .catch(err => {
                            console.log(err)
                        })
                    }
                }
            }
        } catch (err) {
            let message = err
            switch (err.code) {
                case "NO_ID":
                    message = `` // No DEER.ID, so leave it blank
            }
            elem.innerHTML = message
        }

        let listensTo = elem.getAttribute(DEER.LISTENING)
        if (listensTo) {
            elem.addEventListener(DEER.EVENTS.CLICKED, e => {
                try {
                    if (e.detail.target.closest(DEER.VIEW + "," + DEER.FORM).getAttribute("id") === listensTo) elem.setAttribute(DEER.ID, e.detail.target.closest('[' + DEER.ID + ']').getAttribute(DEER.ID))
                } catch (err) { }
            })
            try {
                window[listensTo].addEventListener("click", e => UTILS.broadcast(e, DEER.EVENTS.CLICKED, elem))
            } catch (err) {
                console.error("There is no HTML element with id " + listensTo + " to attach an event to")
            }
        }

    }
}

/**
 * Go over each listed <deer-view> marked HTMLElement and process the UI requirements to draw and render to the DOM.
 * These views will not contain annotation information.  
 * 
 * Note that the resolution of this promise enforses a 200ms delay.  That is for the deerInitializer.js.  It allows
 * initializeDeerViews to be treated as an asyncronous event before initializeDeerForms interacts with the DOM from
 * resulting rendered <deer-view> marked HTMLElements.  We plan to streamline this process in the near future.  
 * @param {type} config A DEER configuration from deer-config.js
 * @return {Promise} A promise confirming all views were visited and rendered.
 */
export function initializeDeerViews(config) {
    return new Promise((res) => {
        const views = document.querySelectorAll(config.VIEW)
        Array.from(views).forEach(elem => new DeerRender(elem, config))
        document.addEventListener(DEER.EVENTS.NEW_VIEW, e => Array.from(e.detail.set).forEach(elem => new DeerRender(elem, config)))
        /**
         * Really each render should be a promise and we should return a Promise.all() here of some kind.
         * That would only work if DeerRender resulted in a Promise where we could return Promise.all(renderPromises).
         */
        setTimeout(res, 200) //A small hack to ensure all the HTML generated by processing the views enters the DOM before this says it has resolved.
        //Failed 5 times at 100
        //Failed 0 times at 200
    })
}

/**
 * Checks array of stored roles for any of the roles provided.
 * @param {Array} roles Strings of roles to check.
 * @returns Boolean user has one of these roles.
 */
function userHasRole(roles){
    if (!Array.isArray(roles)) { roles = [roles] }
    return Boolean(window.GOG_USER?.["http://rerum.io/user_roles"]?.roles.filter(r=>roles.includes(r)).length)
}
