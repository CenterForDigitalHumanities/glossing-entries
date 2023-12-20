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
                if (!obj?.["@id"]) {
                    id = id.replace(/^https?:/,'https:') // avoid mixed content
                    obj = await fetch(id).then(response => response.json()).catch(error => error)
                    if (obj) {
                        localStorage.setItem(obj["@id"] ?? obj.id, JSON.stringify(obj))
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
                        let loadId = e.detail["@id"]
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
 * Retreive the best label for object and return it formatted as HTML to be drawn.  
 * @param {Object} obj some obj to be labeled
 * @param {Object} options for lookup
 */
DEER.TEMPLATES.linky = function (obj, options = {}) {
    try {
        let link = obj[options.key]
        return link ? `<a href="${UTILS.getValue(link)}" title="Open in a new window" target="_blank"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAQElEQVR42qXKwQkAIAxDUUdxtO6/RBQkQZvSi8I/pL4BoGw/XPkh4XigPmsUgh0626AjRsgxHTkUThsG2T/sIlzdTsp52kSS1wAAAABJRU5ErkJggg=="></a>` : ``
    } catch (err) {
        return null
    }
}

DEER.TEMPLATES.thumbs = function (obj, options = {}) {
    return {
        html: obj["tpen://base-project"] ? `<div class="is-full-width"> <h3> ... loading images ... </h3> </div>` : ``,
        then: (elem) => {
            fetch("https://t-pen.org/TPEN/manifest/" + obj["tpen://base-project"].value)
                .then(response => response.json())
                .then(ms => elem.innerHTML = `
                ${ms.sequences[0].canvases.slice(0, 10).reduce((a, b) => a += `<img class="thumbnail" src="${b.images[0].resource['@id']?.replace('full/full','full/,120')}">`, ``)}
        `)
        }
    }
}

DEER.TEMPLATES.pageLinks = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
    return obj.sequences[0].canvases.reduce((a, b, i) => a += `<a class="button" href="?page=${i + 1}#${obj["@id"]}">${b.label}</a>`, ``)
}

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
                    <a href="./layout.html?partOf=${elem.getAttribute("deer-partof")}#${ms['@id']}">(edit layout)</a>
                    <a href="./align-glosses.html#${ms['@id']}">(align Glosses)</a>
                    <div class="pull-right col-6">
                        <img src="${b.images[0].resource['@id']}">
                    </div>
                        ${b.otherContent[0].resources.reduce((aa, bb) => aa += `
                        <span class="line" title="${bb["@id"]}">${bb.resource["cnt:chars"].length ? bb.resource["cnt:chars"] : "[ empty line ]"}</span>
                        `, ``)}
                </div>
                `, ``)}
        `)
        }
    }
}

DEER.TEMPLATES.glossAssignments = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
    return {
        html: `Loading Glosses&hellip;`,
        then: elem => {
            UTILS.listFromCollection(options.collection)
                .then(glosses => {
                    elem.innerHTML = glosses.reduce((a, b, i) => a += `<button role="button" 
            class="deer-view glossBtn" 
            deer-id="${b['@id']}" 
            deer-template="label"
            >${b['@id'] ?? i + 1}</button>`, ``)
                    elem.querySelectorAll('.glossBtn').forEach(el => {
                        new DeerRender(el)
                        el.addEventListener('click', ev => {

                            document.querySelectorAll('line.selected').forEach(line => {
                                el.glossAssignments.add(line.getAttribute('title'))
                                const badge = line.querySelector('.gloss-badge')
                                if (badge.getAttribute('data-badge-uri')) {
                                    const nextbadge = badge.cloneNode()
                                    nextbadge.innerHTML = el.innerHTML
                                    nextbadge.setAttribute('data-badge-uri', el.getAttribute('deer-id'))
                                    AttachClickToRemoveHandler(nextbadge)
                                    badge.after(nextbadge)
                                } else {
                                    badge.innerHTML = el.innerHTML
                                    badge.setAttribute('data-badge-uri', el.getAttribute('deer-id'))
                                    AttachClickToRemoveHandler(badge)
                                }
                                line.classList.remove('selected', 'just')
                            })
                            saveBtn.style.visibility = "visible"

                        })

                        el.glossAssignments = new Set()
                    })
                })
        }
    }
}

function AttachClickToRemoveHandler(elem) {
    elem.addEventListener('click', ev => {
        ev.stopPropagation()
        saveBtn.style.visibility = "visible"
        if (elem.parentElement.querySelectorAll('.gloss-badge').length > 1) {
            elem.remove()
            return
        }
        document.querySelector(`.glossBtn[deer-id='${elem.getAttribute('data-badge-uri')}']`)?.glossAssignments.delete(elem.closest('line').getAttribute('title'))
        elem.removeAttribute('data-badge-uri')
        elem.innerHTML = ''
    })
}

DEER.TEMPLATES.glossLines = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
    //TODO we need to know the GlossID here as well.
    let c = obj.sequences[0].canvases[options.index ?? 0]

    return {
        html: `
        <div class="page">
            <h3>${c.label}</h3>
            <div class="col">
                <script>
                    function batchLine(change) {
                        [...document.getElementsByTagName("line")].forEach(l=>{l.classList[change]("selected");l.classList.remove("just")})
                    }
                </script>
                <a class="tag is-small" data-change="add">Select All</a>
                <a class="tag is-small" data-change="remove">Deselect All</a>
                <a class="tag is-small" data-change="toggle">Invert All</a>
            </div>
            <div class="col">
                <button id="saveBtn" role="button" style="visibility:hidden;">Save Changes</button>
            </div>
                ${c.otherContent[0].resources.reduce((aa, bb, i) => aa += `
                <line title="${bb['@id']}" index="${i}">${bb.resource["cnt:chars"].length ? bb.resource["cnt:chars"] : "[ empty line ]"}<i class="gloss-badge tag is-small bd-dark bg-light text-dark"></i></line>
                `, ``)}
        </div>
        `,
        then: elem => {
            const allLines = elem.getElementsByTagName("line")
            for (const l of allLines) { l.addEventListener("click", selectLine) }

            function selectLine(event) {
                const lastClick = document.querySelector("line.just")
                const line = event.target.closest("line")
                if (lastClick && event.shiftKey) {
                    // band-select
                    const change = lastClick.classList.contains("selected") // change is constant
                        ? "add"
                        : "remove"
                    const lookNext = parseInt(lastClick.getAttribute("index")) < parseInt(line.getAttribute("index"))
                        ? "nextElementSibling"
                        : "previousElementSibling"
                    let changeLine = lastClick
                    do {
                        changeLine = changeLine[lookNext]
                        changeLine.classList[change]("selected")
                    } while (changeLine !== line)
                } else {
                    line.classList.toggle("selected")
                }
                if (lastClick) { lastClick.classList.remove("just") }
                line.classList.add("just")
            }


            /**
             * Logic for select/deselect all
             */
            const controls = elem.querySelectorAll("a.tag:not(.gloss-location)")
            for (const b of controls) {
                b.addEventListener("click", e => {
                    const change = glossNumDropdown.value
                    Array.from(allLines).filter(el => !el.classList.contains("located")).forEach(l => { l.classList[change]("selected"); l.classList.remove("just") })
                })
            }

            const selected = elem.querySelectorAll(".selected")
            for (const s of selected) {
                s.classList.add("located", assignment)
                s.classList.remove("just", "selected")
            }
            for (const s of selected) {
                s.classList.remove("just", "selected")
            }

            saveBtn.addEventListener("click", connectLinesWithNamedGloss)

            function connectLinesWithNamedGloss() {
                const glossBtns = document.querySelectorAll('.glossBtn')
                let allGlosses = [...glossBtns].map(page => {

                    const glossLine = {
                        "@context": "http://iiif.io/api/presentation/3/context.json",
                        "@type": "AnnotationPage",
                        "partOf": {
                            "id": location.hash.substr(1),
                            "type": "Manifest"
                        },
                        target: page.getAttribute('deer-id'),
                        motivation: "linking",
                        "items": [...page.glossAssignments].map(uri => {
                            return {
                                body: uri,
                                target: page.getAttribute('deer-id'),
                                motivation: "linking",
                                '@type': "Annotation",
                                creator : window.GOG_USER["http://store.rerum.io/agent"]                            }
                        }),
                        creator : window.GOG_USER["http://store.rerum.io/agent"] 
                    }

                    if (page.dataset.glossPages) {
                        glossLine['@id'] = page.dataset.glossPages
                    }

                    return fetch(page.dataset.glossPages ? DEER.URLS.OVERWRITE : DEER.URLS.CREATE, {
                        method: page.dataset.glossPages ? 'PUT' : 'POST',
                        mode: 'cors',
                        body: JSON.stringify(glossLine),
                        headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                        }
                    }).then(res => {
                        if (!res.ok) {
                            throw Error(res.statusText)
                        }
                        return res.json()
                    })
                })

                Promise.all(allGlosses)
                    .then(glosses => {
                        glosses.map(gloss => {
                            document.querySelector(`[deer-id='${gloss.new_obj_state.target}']`).setAttribute('data-gloss-pages', gloss.new_obj_state['@id'])
                        })
                        const ev = new CustomEvent("Gloss assignment Update")
                        UTILS.globalFeedbackBlip(ev, `Gloss assignment updated successfully.`, true)
                        saveBtn.style.visibility = "hidden"
                    })
                    .catch(err => {
                        const event = new CustomEvent("Gloss assignment Update")
                        UTILS.globalFeedbackBlip(event, `Gloss assignment failed.`, false)
                    })

            }
            function renderGlossDesignations() {
                const historyWildcard = { $exists: true, $type: 'array', $eq: [] }
                const query = {
                    motivation: "linking",
                    'partOf.id': UTILS.httpsIdArray(location.hash.substr(1)),
                    '__rerum.history.next': historyWildcard
                }

                fetch(`${DEER.URLS.QUERY}?limit=100&skip=0`, {
                    method: 'POST',
                    mode: 'cors',
                    headers:{
                        "Content-Type" : "application/json;charset=utf-8"
                    },
                    body: JSON.stringify(query)
                }).then(res => {
                    if (!res.ok) {
                        throw Error(res.statusText)
                    }
                    return res.json()
                }).then(glosses => {
                    glosses.forEach(gloss => {
                        const page = document.querySelector(`[deer-id='${gloss.target}']`)
                        page.setAttribute('data-gloss-pages', gloss['@id'])
                        gloss.items.forEach(gl => {
                            const line = document.querySelector(`line[title='${gl.body}']`)
                            if (!line) { return }
                            page.glossAssignments.add(gl.body)
                            const badge = line.querySelector('.gloss-badge')
                            if (badge.getAttribute('data-badge-uri')) {
                                const nextbadge = badge.cloneNode()
                                nextbadge.innerHTML = page.innerHTML
                                nextbadge.setAttribute('data-badge-uri', page.getAttribute('deer-id'))
                                AttachClickToRemoveHandler(nextbadge)
                                badge.after(nextbadge)
                            } else {
                                badge.innerHTML = page.innerHTML
                                badge.setAttribute('data-badge-uri', page.getAttribute('deer-id'))
                                AttachClickToRemoveHandler(badge)
                            }
                        })
                    })
                })
                    .catch(err => {
                        const ev = new CustomEvent("Location annotation query")
                        UTILS.globalFeedbackBlip(ev, `Please reload. This crashed. ${err}`, false)
                    })
            }
            renderGlossDesignations()
        }
    }
}

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

DEER.TEMPLATES.lines_new = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
    const index = options.index && !isNaN(options.index) ? options.index : 0
    let c = obj.sequences[0].canvases[index]
    return {
        html: `
        <div class="page">
            <h3>${c.label}</h3>
            <div class="row">
            <a class="col tag gloss-location ulm" data-change="upper left margin">🡤 margin</a>
                <a class="col tag gloss-location um" data-change="upper margin">🡡 margin</a>
                <a class="col tag gloss-location urm" data-change="upper right margin">🡥 margin</a>
            </div>
            <div class="row">
                <a class="col tag gloss-location llm" data-change="lower left margin">🡧 margin</a>
                <a class="col tag gloss-location lm" data-change="lower margin">🡣 margin</a>
                <a class="col tag gloss-location lrm" data-change="lower right margin">🡦 margin</a>
            </div>
            <div class="row">
                <a class="col tag gloss-location ti" data-change="top intralinear">⇞ intralinear</a>
                <a class="col tag gloss-location li" data-change="lower intralinear">⇟ intralinear</a>
            </div>
            <div class="col">
                <script>
                    function batchLine(change) {
                        [...document.getElementsByTagName("line")].forEach(l=>{l.classList[change]("selected");l.classList.remove("just")})
                    }
                </script>
                <a class="tag is-small" data-change="add">Select All</a>
                <a class="tag is-small" data-change="remove">Deselect All</a>
                <a class="tag is-small" data-change="toggle">Invert All</a>
            </div>
            <div class="col">
                <button id="saveBtn" role="button" style="visibility:hidden;">Save Changes</button>
            </div>
                ${c.otherContent[0].resources.reduce((aa, bb, i) => aa += `
                <line title="${bb['@id'].split('/').pop()}" index="${i}">${bb.resource["cnt:chars"].length ? bb.resource["cnt:chars"] : "[ empty line ]"}<i class="unassign tag is-small bg-light text-dark">⭯</i></line>
                `, ``)}
        </div>
        `,
        then: elem => {
            const POSITIONS = {
                ulm: "upper left margin",
                um: "upper margin",
                urm: "upper right margin",
                llm: "lower left margin",
                lm: "lower margin",
                lrm: "lower right margin",
                ti: "top intralinear",
                li: "lower intralinear"
            }
            const allLines = elem.querySelectorAll("line")
            for (const l of allLines) { l.addEventListener("click", selectLine) }
            function selectLine(event) {
                const lastClick = document.querySelector("line.just")
                const line = event.target.closest("line")

                if (lastClick && event.shiftKey) {
                    // band-select
                    const change = lastClick.classList.contains("selected") // change is constant
                        ? "add"
                        : "remove"
                    const lookNext = parseInt(lastClick.getAttribute("index")) < parseInt(line.getAttribute("index"))
                        ? "nextElementSibling"
                        : "previousElementSibling"
                    let changeLine = lastClick
                    do {
                        changeLine = changeLine[lookNext]
                        if (!changeLine.classList.contains("located")) {
                            changeLine.classList[change]("selected")
                        }
                    } while (changeLine !== line)
                } else if (!line.classList.contains("located")) {
                    line.classList.toggle("selected")
                }

                if (lastClick) { lastClick.classList.remove("just") }

                if (!line.classList.contains("located")) {
                    line.classList.add("just")
                }
                saveBtn.style.visibility = "visible"
            }

            const controls = elem.querySelectorAll("a.tag:not(.gloss-location)")
            for (const b of controls) {
                b.addEventListener("click", e => {
                    const change = e.target.getAttribute("data-change")
                    Array.from(allLines).filter(el => !el.classList.contains("located")).forEach(l => { l.classList[change]("selected"); l.classList.remove("just") })
                })
            }
            const locations = elem.querySelectorAll("a.gloss-location")
            for (const l of locations) {
                l.addEventListener("click", e => {
                    const assignment = e.target.getAttribute("data-change")
                    const selected = elem.querySelectorAll(".selected")
                    for (const s of selected) {
                        s.classList.add("located", assignment.split(/\s/).reduce((response, word) => response += word.slice(0, 1), ''))
                        s.classList.remove("just", "selected")
                    }
                })
            }
            const classes = Object.keys(POSITIONS)
            const unassignmentButtons = elem.querySelectorAll("i.unassign")
            for (const r of unassignmentButtons) {
                r.addEventListener("click", e => {
                    e.preventDefault()
                    e.stopPropagation()
                    const forLine = e.target.closest("line")
                    if (forLine === null) { return false }
                    const location = Array.from(forLine.classList).filter(val => classes.includes(val))?.[0]
                    let thisLine = forLine
                    while (thisLine?.classList.contains(location)) {
                        thisLine.classList.remove(location, "located", "selected", "just")
                        thisLine = thisLine.nextElementSibling
                    }
                    saveBtn.style.visibility = "visible"
                })
            }
            const selected = elem.querySelectorAll(".selected")
            for (const s of selected) {
                s.classList.add("located", assignment.split(/\s/).reduce((response, word) => response += word.slice(0, 1), ''))
                s.classList.remove("just", "selected")
            }
            saveBtn.addEventListener("click", saveLocations)
            /**
             * Each Marginalia option has its own Annotation which collects lines together for that Margin.
             * This way, the lines can be the target of the marginalia Annotation.
             */ 
            function saveLocations() {
                let locations = {
                    "ulm" : [],
                    "urm" : [],
                    "um" :  [],
                    "llm" : [],
                    "lm" :  [],
                    "lrm" : [],
                    "ti" :  [],
                    "li" :  []
                }
                allLines.forEach(line => {
                    const location = Array.from(line.classList).filter(val => classes.includes(val))?.[0]
                    if(location){
                        locations[location].push(line.getAttribute("title"))    
                    }
                })
                let allMarginPromises=[]
                for(let margin in locations){
                    const marginAnno = {
                        "@id": document.querySelector("div.page").getAttribute(`data-${margin}`),
                        "@type": "Annotation",
                        "@context": "http://www.w3.org/ns/anno.jsonld",
                        target: locations[margin],
                        forCanvas: c["@id"],
                        body: { "location": margin},
                        motivation: "classifying",
                        "locationing": true,
                        creator : window.GOG_USER["http://store.rerum.io/agent"] 
                    }
                    const marginPromise = fetch(DEER.URLS.OVERWRITE, {
                            method: 'PUT',
                            mode: 'cors',
                            body: JSON.stringify(marginAnno),
                            headers: {
                            "Content-Type": "application/json; charset=utf-8",
                            "Authorization": `Bearer ${window.GOG_USER.authorization}`
                            }
                        }).then(res => {
                            if (!res.ok) {
                                throw Error(res.statusText)
                            }
                            return res.json()
                        }).catch(err => {
                            return err
                        })
                    allMarginPromises.push(marginAnno)
                }
                
                const ev = new CustomEvent("Locations Update")
                Promise.all(allMarginPromises)
                .then(results => {
                    UTILS.globalFeedbackBlip(ev, `Locations updated successfully.`, true)
                    saveBtn.style.visibility = "hidden"
                })
                .catch(err => {
                    UTILS.globalFeedbackBlip(ev, `Locations update failed.`, false)
                })
            }
            function highlightLocations() {
                const pageElement = document.querySelector("div.page")
                const historyWildcard = { $exists: true, $type: 'array', $eq: [] }

                const query = {
                    forCanvas: UTILS.httpsIdArray(c['@id']),
                    motivation: "classifying",
                    'body.location': { $exists: true },
                    '__rerum.history.next': historyWildcard
                }

                fetch(`${DEER.URLS.QUERY}?limit=100&skip=0`, {
                    method: 'POST',
                    mode: 'cors',
                    headers:{
                        "Content-Type" : "application/json;charset=utf-8"
                    },
                    body: JSON.stringify(query)
                }).then(res => {
                    if (!res.ok) {
                        throw Error(res.statusText)
                    }
                    return res.json()
                }).then(annotations => {
                    //Now separate them out by margin
                    let existingMarginAnnos = {
                        "ulm" : annotations.filter(anno => anno.body.location === "ulm")?.[0]?.["@id"] ?? false,
                        "urm" : annotations.filter(anno => anno.body.location === "urm")?.[0]?.["@id"] ?? false,
                        "um" :  annotations.filter(anno => anno.body.location === "um")?.[0]?.["@id"] ?? false,
                        "llm" : annotations.filter(anno => anno.body.location === "llm")?.[0]?.["@id"] ?? false,
                        "lm" :  annotations.filter(anno => anno.body.location === "lm")?.[0]?.["@id"] ?? false,
                        "lrm" : annotations.filter(anno => anno.body.location === "lrm")?.[0]?.["@id"] ?? false,
                        "ti" :  annotations.filter(anno => anno.body.location === "ti")?.[0]?.["@id"] ?? false,
                        "li" :  annotations.filter(anno => anno.body.location === "li")?.[0]?.["@id"] ?? false,
                    }
                    //Now for each of those that are false, we need to make the Annotation that will represent it
                    for(let margin in existingMarginAnnos){
                        if(existingMarginAnnos[margin]){
                            drawAssignment(margin, annotations.filter(anno => anno["@id"] === existingMarginAnnos[margin])[0])
                            pageElement.setAttribute(`data-${margin}`, existingMarginAnnos[margin])
                        }
                        else{
                            const locationAnnotation = {
                                "@type": "Annotation",
                                "@context": "http://www.w3.org/ns/anno.jsonld",
                                forCanvas: c['@id'],
                                target: [],
                                body: { location: margin },
                                motivation: "classifying",
                                "locationing" : true,
                                creator : window.GOG_USER["http://store.rerum.io/agent"] 
                            }
                            console.log("I will create")
                            console.log(locationAnnotation)
                            fetch(DEER.URLS.CREATE, {
                                method: 'POST',
                                mode: 'cors',
                                headers: {
                                    'Content-Type': 'application/ld+json; charset=utf-8',
                                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                                },
                                body: JSON.stringify(locationAnnotation)
                            }).then(res => {
                                if (!res.ok) {
                                    throw Error(res.statusText)
                                }
                                return res.json()
                            }).then(loc => {
                                const ev = new CustomEvent("Marginalia locations loaded")
                                UTILS.globalFeedbackBlip(ev, `Marginalia locations loaded`, true)
                                pageElement.setAttribute(`data-${margin}`, loc.new_obj_state['@id'])
                            })
                            .catch(err => console.error(err))    
                        }
                    }
                })
                .catch(err => {
                    const ev = new CustomEvent("Location annotation query")
                    UTILS.globalFeedbackBlip(ev, `Please reload. This crashed. ${err}`, false)
                })

                //This now accepts a margin anno
                //The targets are each line id
                //The body is {location:"margin"}
                //whichMargin is "margin" ready for you.
                function drawAssignment(whichMargin, marginAnno) {
                    for (const line of marginAnno.target) {
                        const el = document.querySelector(`line[title="${line}"]`)
                        if (!el) { continue }
                        const locatedClass = `located ${whichMargin}`
                        el.className = locatedClass
                    }
                }
            }
            highlightLocations()
        }
    }
}

DEER.TEMPLATES.lines = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
    let c = obj.sequences[0].canvases[options.index ?? 0]
    return {
        html: `
        <div class="page">
            <h3>${c.label}</h3>
            <div class="row">
            <a class="col tag gloss-location ulm" data-change="upper left margin">🡤 margin</a>
                <a class="col tag gloss-location um" data-change="upper margin">🡡 margin</a>
                <a class="col tag gloss-location urm" data-change="upper right margin">🡥 margin</a>
            </div>
            <div class="row">
                <a class="col tag gloss-location llm" data-change="lower left margin">🡧 margin</a>
                <a class="col tag gloss-location lm" data-change="lower margin">🡣 margin</a>
                <a class="col tag gloss-location lrm" data-change="lower right margin">🡦 margin</a>
            </div>
            <div class="row">
                <a class="col tag gloss-location ti" data-change="top intralinear">⇞ intralinear</a>
                <a class="col tag gloss-location li" data-change="lower intralinear">⇟ intralinear</a>
            </div>
            <div class="col">
                <script>
                    function batchLine(change) {
                        [...document.getElementsByTagName("line")].forEach(l=>{l.classList[change]("selected");l.classList.remove("just")})
                    }
                </script>
                <a class="tag is-small" data-change="add">Select All</a>
                <a class="tag is-small" data-change="remove">Deselect All</a>
                <a class="tag is-small" data-change="toggle">Invert All</a>
            </div>
            <div class="col">
                <button id="saveBtn" role="button" style="visibility:hidden;">Save Changes</button>
            </div>
                ${c.otherContent[0].resources.reduce((aa, bb, i) => aa += `
                <line title="${bb['@id'].split('/').pop()}" index="${i}">${bb.resource["cnt:chars"].length ? bb.resource["cnt:chars"] : "[ empty line ]"}<i class="unassign tag is-small bg-light text-dark">⭯</i></line>
                `, ``)}
        </div>
        `,
        then: elem => {
            const POSITIONS = {
                ulm: "upper left margin",
                um: "upper margin",
                urm: "upper right margin",
                llm: "lower left margin",
                lm: "lower margin",
                lrm: "lower right margin",
                ti: "top intralinear",
                li: "lower intralinear"
            }
            const allLines = elem.querySelectorAll("line")
            for (const l of allLines) { l.addEventListener("click", selectLine) }
            function selectLine(event) {
                const lastClick = document.querySelector("line.just")
                const line = event.target.closest("line")

                if (lastClick && event.shiftKey) {
                    // band-select
                    const change = lastClick.classList.contains("selected") // change is constant
                        ? "add"
                        : "remove"
                    const lookNext = parseInt(lastClick.getAttribute("index")) < parseInt(line.getAttribute("index"))
                        ? "nextElementSibling"
                        : "previousElementSibling"
                    let changeLine = lastClick
                    do {
                        changeLine = changeLine[lookNext]
                        if (!changeLine.classList.contains("located")) {
                            changeLine.classList[change]("selected")
                        }
                    } while (changeLine !== line)
                } else if (!line.classList.contains("located")) {
                    line.classList.toggle("selected")
                }

                if (lastClick) { lastClick.classList.remove("just") }

                if (!line.classList.contains("located")) {
                    line.classList.add("just")
                }
                saveBtn.style.visibility = "visible"
            }

            const controls = elem.querySelectorAll("a.tag:not(.gloss-location)")
            for (const b of controls) {
                b.addEventListener("click", e => {
                    const change = e.target.getAttribute("data-change")
                    Array.from(allLines).filter(el => !el.classList.contains("located")).forEach(l => { l.classList[change]("selected"); l.classList.remove("just") })
                })
            }
            const locations = elem.querySelectorAll("a.gloss-location")
            for (const l of locations) {
                l.addEventListener("click", e => {
                    const assignment = e.target.getAttribute("data-change")
                    const selected = elem.querySelectorAll(".selected")
                    for (const s of selected) {
                        s.classList.add("located", assignment.split(/\s/).reduce((response, word) => response += word.slice(0, 1), ''))
                        s.classList.remove("just", "selected")
                    }
                })
            }
            const classes = Object.keys(POSITIONS)
            const unassignmentButtons = elem.querySelectorAll("i.unassign")
            for (const r of unassignmentButtons) {
                r.addEventListener("click", e => {
                    e.preventDefault()
                    e.stopPropagation()
                    const forLine = e.target.closest("line")
                    if (forLine === null) { return false }
                    const location = Array.from(forLine.classList).filter(val => classes.includes(val))?.[0]
                    let thisLine = forLine
                    while (thisLine?.classList.contains(location)) {
                        thisLine.classList.remove(location, "located", "selected", "just")
                        thisLine = thisLine.nextElementSibling
                    }
                    saveBtn.style.visibility = "visible"
                })
            }
            const selected = elem.querySelectorAll(".selected")
            for (const s of selected) {
                s.classList.add("located", assignment.split(/\s/).reduce((response, word) => response += word.slice(0, 1), ''))
                s.classList.remove("just", "selected")
            }
            saveBtn.addEventListener("click", saveLocations)
            function saveLocations() {
                const locationMap = new Map()
                allLines.forEach(line => {
                    const location = Array.from(line.classList).filter(val => classes.includes(val))?.[0]
                    locationMap.set(line.getAttribute("title"), location ?? false)
                })

                const locationAnnotationId = document.querySelector("div.page").getAttribute("data-marginalia")
                if (!locationAnnotationId) {
                    throw new Error("URI for Annotation Location could not be found.")
                }

                /**
                 * TODO: This is a dirty trick to make this save reliably. The annotation should be targeted to 
                 * just the lines within the Canvas and this map should be iterated through instead.
                 */
                const locationAnnotation = {
                    "@id": locationAnnotationId,
                    "@type": "Annotation",
                    "@context": "http://www.w3.org/ns/anno.jsonld",
                    target: c['@id'],
                    body: { locations: Object.fromEntries(locationMap.entries()) },
                    motivation: "classifying",
                    creator : window.GOG_USER["http://store.rerum.io/agent"] 
                }
                fetch(DEER.URLS.OVERWRITE, {
                    method: 'PUT',
                    mode: 'cors',
                    body: JSON.stringify(locationAnnotation),
                    headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    }
                }).then(res => {
                    if (!res.ok) {
                        throw Error(res.statusText)
                    }
                    const ev = new CustomEvent("Locations Update")
                    UTILS.globalFeedbackBlip(ev, `Locations updated successfully.`, true)
                    saveBtn.style.visibility = "hidden"
                    return res.json()
                }).catch(err => {
                    const ev = new CustomEvent("Locations Update")
                    UTILS.globalFeedbackBlip(ev, `Locations update failed.`, false)
                })
            }
            function highlightLocations() {
                const pageElement = document.querySelector("div.page")
                const historyWildcard = { $exists: true, $type: 'array', $eq: [] }

                const query = {
                    target: UTILS.httpsIdArray(['@id']),
                    motivation: "classifying",
                    'body.locations': { $exists: true },
                    '__rerum.history.next': historyWildcard
                }

                fetch(`${DEER.URLS.QUERY}?limit=100&skip=0`, {
                    method: 'POST',
                    mode: 'cors',
                    headers:{
                        "Content-Type" : "application/json;charset=utf-8"
                    },
                    body: JSON.stringify(query)
                }).then(res => {
                    if (!res.ok) {
                        throw Error(res.statusText)
                    }
                    return res.json()
                }).then(annotations => {
                    if (annotations.length === 0) {
                        // no results
                        const locationAnnotation = {
                            "@type": "Annotation",
                            "@context": "http://www.w3.org/ns/anno.jsonld",
                            target: c['@id'],
                            body: { locations: {} },
                            motivation: "classifying",
                            creator : window.GOG_USER["http://store.rerum.io/agent"] 
                        }

                        fetch(DEER.URLS.CREATE, {
                            method: 'POST',
                            mode: 'cors',
                            headers: {
                                'Content-Type': 'application/ld+json; charset=utf-8',
                                "Authorization": `Bearer ${window.GOG_USER.authorization}`
                            },
                            body: JSON.stringify(locationAnnotation)
                        }).then(res => {
                            if (!res.ok) {
                                throw Error(res.statusText)
                            }
                            return res.json()
                        }).then(loc => {
                            const ev = new CustomEvent("Marginalia locations loaded")
                            UTILS.globalFeedbackBlip(ev, `Marginalia locations loaded`, true)
                            pageElement.setAttribute("data-marginalia", loc.new_obj_state['@id'])
                        })
                            .catch(err => console.error(err))

                    } else {
                        drawAssignment(annotations[0].body.locations)
                        pageElement.setAttribute("data-marginalia", annotations[0]['@id'])
                    }
                })
                    .catch(err => {
                        const ev = new CustomEvent("Location annotation query")
                        UTILS.globalFeedbackBlip(ev, `Please reload. This crashed. ${err}`, false)
                    })

                function drawAssignment(glossLines) {
                    for (const line in glossLines) {
                        const el = document.querySelector(`line[title="${line}"]`)
                        if (!el) { continue }
                        const locatedClass = glossLines[line] ? `located ${glossLines[line]}` : ""
                        el.className = locatedClass
                    }
                }
            }
            highlightLocations()
        }
    }
}




DEER.TEMPLATES.managedlist_updated = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses managers.</h4>` }
    try {
        // If the collection doesn't have a name, something has gone wrong.
        if(!obj.name) return
        let tmpl = ` 
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
            .statusFacets li{

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
        `
        let managedListCache = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
        let numloaded = 0
        let total = 0
        const type = obj.name.includes("Named-Glosses") ? "named-gloss" : "manuscript"
        const filterObj = {}
    
        if (options.list) {
            tmpl += `<ul>`
            const deduplicatedList = UTILS.removeDuplicates(obj[options.list], '@id')
            total = deduplicatedList.length                
            deduplicatedList.forEach((val, index) => {
                    // Define buttons outside the if-else scope
                    const glossID = val["@id"].replace(/^https?:/, 'https:')
                    const publishedStatus = `<span glossid="${val['@id']}" class="pubStatus">??</span>`

                    if(managedListCache.get(glossID)){
                        const cachedObj = managedListCache.get(glossID)
                        let filteringProps = Object.keys(cachedObj)
                        // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem (already have the data).
                        let li = `<li deer-id="${val["@id"]}" data-expanded="true" `
                        // Add all Gloss object properties to the <li> element as attributes to match on later
                        filteringProps.forEach( (prop) => {
                            // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                            if(prop === "text"){
                                const t = cachedObj[prop]?.value?.textValue ?? ""
                                cachedObj[prop].value = t
                            }
                            if(typeof UTILS.getValue(cachedObj[prop]) === "string" || typeof UTILS.getValue(cachedObj[prop]) === "number") {
                                const value = UTILS.getValue(cachedObj[prop])+"" //typecast to a string
                                prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                const attr = `data-${prop}`
                                if(prop === "title" && !value){
                                    value = "[ unlabeled ]"
                                    li += `data-unlabeled="true" `
                                }
                                li += `${attr}="${value}" `
                            }
                        })
                        if(!filteringProps.includes("title")) {
                            li += `data-title="[ unlabeled ]" data-unlabeled="true"`
                        }
                        li += `>
                            ${publishedStatus}
                            <a class="galleryEntry" glossid="${val["@id"]}">
                                <span>${UTILS.getLabel(cachedObj) ? UTILS.getLabel(cachedObj) : "Label Unprocessable"}</span>
                            </a>
                        </li>`
                        tmpl += li
                        numloaded++
                    } else {
                        // This object was not cached so we do not have its properties.
                        tmpl += 
                        `<div deer-template="managedFilterableListItem" deer-link="ng.html#" class="deer-view" deer-id="${val["@id"]}">
                            <li>
                                ${publishedStatus}
                                <a class="galleryEntry" glossid="${val["@id"]}">
                                    <deer-view deer-id="${val["@id"]}" deer-template="label">Loading Gloss #${index + 1}</deer-view>
                                </a>
                            </li>
                        </div>`
                    }
                }
            )
            tmpl += `</ul>`
        } else {
            console.log("There are no items in this list to draw.")
            console.log(obj)
        }
        
        return {
            html: tmpl,
            then: async elem => {
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
                    const items = elem.querySelectorAll('li')
                    items.forEach(li => {
                        const templateContainer = li.parentElement.hasAttribute("deer-template") ? li.parentElement : null
                        const elem = templateContainer ?? li
                        let action = "add"
                        for (const prop in query) {
                            if (li.hasAttribute(`data-${prop}`)) {
                                action = li.getAttribute(`data-${prop}`).toLowerCase().includes(query[prop].toLowerCase()) ? "remove" : "add"
                            }
                            elem.classList[action](`is-hidden`, `un${action}-item`)
                            setTimeout(() => elem.classList.remove(`un${action}-item`), 500)
                            if (action === "remove") break
                        }
                    })
                }

                let url = new URL(elem.getAttribute("deer-listing"))
                url.searchParams.set('nocache', Date.now())
                fetch(url).then(r => r.json())
                .then(list => {
                    elem.listCache = new Set()
                    list.itemListElement?.forEach(item => elem.listCache.add(item['@id']))
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
                })
                                
                function overwriteList() {
                    let mss = []
                    let missing = false
                    elem.listCache.forEach(uri => {
                        let labelElement = document.querySelector(`li[deer-id='${uri}'] span`)
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
                        console.warn("Cannot overwrite list while glosses are still loading.")
                        alert("Cannot overwrite list while glosses are still loading. Please wait until all glosses are loaded.")
                        return
                    }

                    const list = {
                        '@id': elem.getAttribute("deer-listing"),
                        '@context': 'https://schema.org/',
                        '@type': "ItemList",
                        name: elem.getAttribute("deer-listing") ?? "Gallery of Glosses",
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
                        alert("Save successful!")
                        console.log("Saved data:", data)
                    })
                    .catch(err => {
                        alert(`Failed to save: ${err.message}`)
                        console.error(err)
                    });
                }
            }
        }
    } catch (err) {
        console.log("Could not build list template.")
        console.error(err)
        return null
    }
}




DEER.TEMPLATES.managedlist_old = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses managers.</h4>` }
    try {
        // If the collection doesn't have a name, something has gone wrong.
        if(!obj.name) return
        let tmpl = ` 
        <style>
            .cachedNotice{
            margin-top: -1em;
            display: block;
            }

            .cachedNotice a{
            cursor: pointer;
            }

            .totalsProgress{
            text-align: center;
            background-color: rgba(0, 0, 0, 0.1);
            padding-top: 4px;
            font-size: 13pt;
            }
        </style>
        <h2> Glosses </h2>
        <small class="cachedNotice is-hidden text-primary"> These Glosses were cached.  To reload the data <a class="newcache tag is-small">click here</a>. </small>
        <input filter="title" type="text" placeholder="&hellip;Type to filter by incipit, text, or targeted text" class="is-hidden serifText">
        <div class="progressArea">
            <p class="filterNotice is-hidden"> Gloss filter detected.  Please note that Glosses will appear as they are fully loaded. </p>
            <div class="totalsProgress" count="0"> {loaded} out of {total} loaded (0%).  This may take a few minutes.  You may click to select any Gloss loaded already.</div>
        </div>`
        let managedListCache = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
        let numloaded = 0
        const type = obj.name.includes("Named-Glosses") ? "named-gloss" : "manuscript"

        let total = 0
        const filterPresent = !!UTILS.getURLParameter("gog-filter")
        const filterObj = filterPresent ? decodeContentState(UTILS.getURLParameter("gog-filter").trim()) : {}
    
        if (options.list) {
            tmpl += `<ul>`
            const hide = filterPresent ? "is-hidden" : ""
            const deduplicatedList = UTILS.removeDuplicates(obj[options.list], '@id')
            total = deduplicatedList.length                
            deduplicatedList.forEach((val, index) => {
                    // Define buttons outside the if-else scope
                    const glossID = val["@id"].replace(/^https?:/, 'https:')
                    
                    const removeBtn = `<a href="${val['@id']}" data-type="${type}" class="removeCollectionItem" title="Delete This Entry">&#x274C;</a>`
                    const visibilityBtn = `<a class="togglePublic" href="${val['@id']}" title="Toggle public visibility"> 👁 </a>`

                    if(managedListCache.get(glossID)){
                        const cachedObj = managedListCache.get(glossID)
                        let filteringProps = Object.keys(cachedObj)
                        // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem (already have the data).
                        let li = `<li class="${hide}" deer-id="${val["@id"]}" data-expanded="true" `
                        // Add all Gloss object properties to the <li> element as attributes to match on later
                        filteringProps.forEach( (prop) => {
                            // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                            if(typeof UTILS.getValue(cachedObj[prop]) === "string" || typeof UTILS.getValue(cachedObj[prop]) === "number") {
                                const value = UTILS.getValue(cachedObj[prop])+"" //typecast to a string
                                prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                const attr = `data-${prop}`
                                li += `${attr}="${value}" `
                                if(value.includes(filterObj[prop])){
                                    li = li.replace(hide, "")
                                }
                            }
                        })
                        li += `>
                            ${visibilityBtn}
                            <a href="${options.link}${val["@id"]}">
                                <span>${UTILS.getLabel(cachedObj) ? UTILS.getLabel(cachedObj) : "Label Unprocessable"}</span>
                            </a>
                            ${removeBtn}
                        </li>`
                        tmpl += li
                        numloaded++
                    } else {
                        // This object was not cached so we do not have its properties.
                        
                        tmpl += 
                        `<div deer-template="managedFilterableListItem" deer-link="${options.link}" class="${hide} deer-view" deer-id="${val["@id"]}">
                            <li>
                                ${visibilityBtn}
                                <a href="${options.link}${val["@id"]}">
                                    <deer-view deer-id="${val["@id"]}" deer-template="label">Loading Gloss #${index + 1}</deer-view>
                                </a>
                                ${removeBtn}
                            </li>
                        </div>`
                    }
                }
            )
            tmpl += `</ul>`
        } else {
            console.log("There are no items in this list to draw.")
            console.log(obj)
        }
        
        return {
            html: tmpl,
            then: async elem => {
                elem.$contentState = ""
                if (filterPresent) {
                    elem.querySelector(".filterNotice").classList.remove("is-hidden")
                    elem.$contentState = UTILS.getURLParameter("gog-filter").trim()
                }
                const totalsProgress = elem.querySelector(".totalsProgress")

                const filter = elem.querySelector('input')
                const cachedNotice = elem.querySelector(".cachedNotice")
                const progressArea = elem.querySelector(".progressArea")

                totalsProgress.innerText = `${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%).  This may take a few minutes.  You may click to select any Gloss loaded already.`
                totalsProgress.setAttribute("total", total)
                totalsProgress.setAttribute("count", numloaded)

                elem.querySelector(".newcache").addEventListener("click", ev => {
                    localStorage.clear()
                    location.reload()
                })
 
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
                    progressArea.classList.add("is-hidden")
                    elem.querySelectorAll("input[filter]").forEach(i => {
                        // The filters that are used now need to be selected or take on the string or whatevs
                        i.classList.remove("is-hidden")
                        if(filterObj.hasOwnProperty(i.getAttribute("filter"))){
                            i.value = filterObj[i.getAttribute("filter")]
                            i.setAttribute("value", filterObj[i.getAttribute("filter")])
                        }
                        i.dispatchEvent(new Event('input', { bubbles: true }))
                    })
                    if(filterPresent){
                        debounce(filterGlosses(elem.$contentState))
                    }
                }
                function debounce(func, timeout = 500) {
                    let timer
                    return (...args) => {
                        clearTimeout(timer)
                        timer = setTimeout(() => { func.apply(this, args) }, timeout)
                    }
                }
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
                    const items = elem.querySelectorAll('li')
                    items.forEach(li => {
                        const templateContainer = li.parentElement.hasAttribute("deer-template") ? li.parentElement : null
                        const elem = templateContainer ?? li
                        if (!elem.classList.contains("is-hidden")) {
                            elem.classList.add("is-hidden")
                        }
                        for (const prop in query) {
                            if (li.hasAttribute(`data-${prop}`)) {
                                const action = li.getAttribute(`data-${prop}`).toLowerCase().includes(query[prop].toLowerCase()) ? "remove" : "add"
                                elem.classList[action](`is-hidden`, `un${action}-item`)
                                setTimeout(() => elem.classList.remove(`un${action}-item`), 500)
                                if (action === "remove") break
                            }
                        }
                    })

                    const url = new URL(window.location.href)
                    if(query.title){
                        url.searchParams.set("gog-filter", queryString)
                        window.history.replaceState(null, null, url)   
                    }
                    else{
                        url.searchParams.delete("gog-filter")
                        window.history.replaceState(null, null, url)
                    }
                }

                let url = new URL(elem.getAttribute("deer-listing"))
                url.searchParams.set('nocache', Date.now())
                fetch(url).then(r => r.json())
                .then(list => {
                    elem.listCache = new Set()
                    
                    list.itemListElement?.forEach(item => elem.listCache.add(item['@id']))
                    
                    for (const a of document.querySelectorAll('.togglePublic')) {
                        const include = elem.listCache.has(a.getAttribute("href")) ? "add" : "remove"
                        a.classList[include]("is-included")
                    }
                })
                .then(() => {
                    document.querySelectorAll(".removeCollectionItem").forEach(el => el.addEventListener('click', (ev) => {
                        ev.preventDefault()
                        ev.stopPropagation()
                        const itemID = el.getAttribute("href")
                        const itemType = el.getAttribute("data-type")
                        removeFromCollectionAndDelete(itemID, itemType)
                    }))
                    document.querySelectorAll('.togglePublic').forEach(a => a.addEventListener('click', ev => {
                        ev.preventDefault()
                        ev.stopPropagation()                       
                        const uri = a.getAttribute("href")
                        const included = elem.listCache.has(uri)
                        a.classList[included ? "remove" : "add"]("is-included")
                        elem.listCache[included ? "delete" : "add"](uri)
                        saveList.style.visibility = "visible"
                    }))
                    saveList.addEventListener('click', overwriteList)
                })
                
                function overwriteList() {
                    let mss = []
                    let missing = false
                    elem.listCache.forEach(uri => {
                        let labelElement = document.querySelector(`li[deer-id='${uri}'] span`) || document.querySelector(`div[deer-id='${uri}'] span`)
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
                        console.warn("Cannot overwrite list while glosses are still loading.")
                        alert("Cannot overwrite list while glosses are still loading. Please wait until all glosses are loaded.")
                        return
                    }

                    const list = {
                        '@id': elem.getAttribute("deer-listing"),
                        '@context': 'https://schema.org/',
                        '@type': "ItemList",
                        name: elem.getAttribute("deer-listing") ?? "Gallery of Glosses",
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
                        alert("Save successful!")
                        console.log("Saved data:", data)
                    })
                    .catch(err => {
                        alert(`Failed to save: ${err.message}`)
                        console.error(err)
                    });
                }

                /**
                 * An archetype entity is being deleted.  Delete it and some choice Annotations connected to it.
                 * 
                 * Might want to update the name of this to be delete from collection instead of delete this
                 * 
                 * 
                 * @param event {Event} A button/link click event
                 * @param type {String} The archtype object's type or @type.
                 */ 
                async function removeFromCollectionAndDelete(id, type) {
                    event.preventDefault()

                    // This won't do 
                    if(!id){
                        alert(`No URI supplied for delete.  Cannot delete.`)
                        return
                    }
                    const thing = 
                        (type === "manuscript") ? "Manuscript" :
                        (type === "named-gloss") ? "Gloss" :
                        (type === "Range") ? "Gloss" : null


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
                            "body.partOf.value": UTILS.httpsIdArray(id),
                            "__rerum.generatedBy" : UTILS.httpsIdArray(DEER.GENERATOR),
                            "__rerum.history.next" : historyWildcard
                        }
                        const allGlossIds = await UTILS.getPagedQuery(100, 0, allGlossesOfManuscriptQueryObj)
                        .then(annos => annos.map(anno => anno.target))
                        .catch(err => {
                            alert("Could not gather Glosses to delete.")
                            console.log(err)
                            return null
                        })
                        // This is bad enough to stop here, we will not continue on towards deleting the entity.
                        if(allGlossIds === null) {return}

                        const allGlosses = allGlossIds.map(glossUri => {
                            return fetch(config.URLS.DELETE, {
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
                                const ev = new CustomEvent("RERUM error")
                                globalFeedbackBlip(ev, `There was an issue removing a connected Gloss: ${glossUri}`, false)
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
                            const ev = new CustomEvent("RERUM error")
                            globalFeedbackBlip(ev, 'There was an issue removing Connected Glosses.', false)
                        })
                    }

                    // Get all Annotations throughout history targeting this object that were generated by this application.
                    const allAnnotationsTargetingEntityQueryObj = {
                        target: UTILS.httpsIdArray(id),
                        "__rerum.generatedBy" : UTILS.httpsIdArray(DEER.GENERATOR)
                    }
                    const allAnnotationIds = await UTILS.getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
                    .then(annos => annos.map(anno => anno["@id"]))
                    .catch(err => {
                        alert("Could not gather Annotations to delete.")
                        console.log(err)
                        return null
                    })
                    // This is bad enough to stop here, we will not continue on towards deleting the entity.
                    if(allAnnotationIds === null) return

                    const allAnnotations = allAnnotationIds.map(annoUri => {
                        return fetch(config.URLS.DELETE, {
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
                            const ev = new CustomEvent("RERUM error")
                            globalFeedbackBlip(ev, `There was an issue removing an Annotation: ${annoUri}`, false)
                        })
                    })
                    
                    // In this case, we don't have to wait on these.  We can run this and the entity delete syncronously.
                    Promise.all(allAnnotations).then(success => {
                        console.log("Connected Annotationss successfully removed.")
                    })
                    .catch(err => {
                        // OK they may be orphaned.  We will continue on towards deleting the entity.
                        console.warn("There was an issue removing connected Annotations.")
                        console.log(err)
                    })

                    // Now the entity itself
                    fetch(config.URLS.DELETE, {
                        method: "DELETE",
                        body: JSON.stringify({"@id":id}),
                        headers: {
                            "Content-Type": "application/json; charset=utf-8",
                            "Authorization": `Bearer ${window.GOG_USER.authorization}`
                        }
                    })
                    .then(r => {
                        if(r.ok){
                            document.querySelector(`[deer-id="${id}"]`).closest("li").remove()
                        }
                        else{
                            return Promise.reject(Error(r.text))
                        }
                    })
                    .catch(err => { 
                        alert(`There was an issue removing the ${thing} with URI ${id}.  This item may still appear in collections.`)
                        console.log(err)
                        const ev = new CustomEvent("RERUM error")
                        globalFeedbackBlip(ev, `There was an issue removing the ${thing} with URI ${id}.  This item may still appear in collections.`, false)
                    })
                }
            }
        }
    } catch (err) {
        console.log("Could not build list template.")
        console.error(err)
        return null
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
                    list += (v["@id"]) ? `<dd><a href="#${v["@id"]}">${name}</a></dd>` : `<dd ${DEER.SOURCE}="${UTILS.getValue(v.source, "citationSource")}">${UTILS.getValue(v)}</dd>`
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
                list += (value['@id']) ? `<dd ${DEER.SOURCE}="${UTILS.getValue(value.source, "citationSource")}"><a href="${options.link ?? ""}#${value['@id']}">${v}</a></dd>` : `<dd ${DEER.SOURCE}="${UTILS.getValue(value, "citationSource")}">${v}</dd>`
            }
        }
    }
    tmpl += (list.includes("</dd>")) ? `<dl>${list}</dl>` : ``
    return tmpl
}

DEER.TEMPLATES.list = function (obj, options = {}) {
    let tmpl = `<h2>${UTILS.getLabel(obj)}</h2>`
    if (options.list) {
        tmpl += `<ul>`
        obj[options.list].forEach((val, index) => {
            let name = UTILS.getLabel(val, (val.type ?? val['@type'] ?? index))
            tmpl += (val["@id"] && options.link) ? `<li ${DEER.ID}="${val["@id"]}"><a href="${options.link}${val["@id"]}">${name}</a></li>` : `<li ${DEER.ID}="${val["@id"]}">${name}</li>`
        })
        tmpl += `</ul>`
    }
    return tmpl
}

/**
 * The TEMPLATED renderer to draw JSON to the screen
 * @param {Object} obj some json of type Person to be drawn
 * @param {Object} options additional properties to draw with the Person
 */
DEER.TEMPLATES.person = function (obj, options = {}) {
    try {
        let tmpl = `<h2>${UTILS.getLabel(obj)}</h2>`
        let dob = DEER.TEMPLATES.prop(obj, { key: "birthDate", label: "Birth Date" }) ?? ``
        let dod = DEER.TEMPLATES.prop(obj, { key: "deathDate", label: "Death Date" }) ?? ``
        let famName = (obj.familyName && UTILS.getValue(obj.familyName)) ?? "[ unknown ]"
        let givenName = (obj.givenName && UTILS.getValue(obj.givenName)) ?? ""
        tmpl += (obj.familyName ?? obj.givenName) ? `<div>Name: ${famName}, ${givenName}</div>` : ``
        tmpl += dob + dod
        tmpl += `<a href="#${obj["@id"]}">JSON</a>`
        return tmpl
    } catch (err) {
        return null
    }
}

/**
 * The TEMPLATED renderer to draw Manuscript PageRanges to the screen
 * @param {Object} obj some json of type Person to be drawn
 * @param {Object} options additional properties to draw with the Person
 */
DEER.TEMPLATES.pageRanges = function (obj, options = {}) {
    // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
    return {
        then: (elem) => {
            let queryObj = { "body.isPartOf.value": UTILS.httpsIdArray(obj['@id']) }
            fetch(`${DEER.URLS.QUERY}?limit=100&skip=0`, {
                method: "POST",
                mode: "cors",
                headers:{
                    "Content-Type" : "application/json;charset=utf-8"
                },
                body: JSON.stringify(queryObj)
            })
                .then(response => response.json())
                .then(pointers => {
                    let list = []
                    pointers.map(tc => list.push(fetch(tc.target ?? tc["@id"] ?? tc.id).then(response => response.json().catch(err => { __deleted: console.log(err) }))))
                    return Promise.all(list).then(l => l.filter(i => !i.hasOwnProperty("__deleted")))
                })
                .then(pages => pages.reduce((a, b) => b += `<deer-view deer-id="${a['@id'] ?? a.id}" deer-template="gloss">range</deer-view>`, ``))
                .then(html => elem.innerHTML = html)
                .then(() => setTimeout(UTILS.broadcast(undefined, DEER.EVENTS.NEW_VIEW, elem, { set: elem.querySelectorAll("[deer-template]") }), 0))
        },
        html: `ranges incoming`
    }
}

/**
 * The TEMPLATED renderer to draw Manuscript PageRanges to the screen
 * @param {Object} obj some json of type Person to be drawn
 * @param {Object} options additional properties to draw with the Person
 */
// DEER.TEMPLATES.canvasDropdown = function (obj, options = {}) {
//     return null
//     try {
//         let tmpl = `<form deer-type="Range" deer-context="http://iiif.io/api/image/3/context.json">
//         <input type="hidden" deer-key="isPartOf" value="${obj['@id']}">
//         <input type="hidden" deer-key="motivation" value="supplementing">

// startFolio
// endFolio
// Disposition
// Illuminated Initials
// Gloss ID
// General Target
// Specific Target
// Gloss Type
// Gloss Location

//         <input type="submit">
//         </form>`

//         return tmpl
//     } catch (err) {
//         return null
//     }
//     return null
// }


/**
 * The TEMPLATED renderer to draw JSON to the screen
 * @param {Object} obj some json of type Event to be drawn
 * @param {Object} options additional properties to draw with the Event
 */
DEER.TEMPLATES.event = function (obj, options = {}) {
    try {
        let tmpl = `<h1>${UTILS.getLabel(obj)}</h1>`
        return tmpl
    } catch (err) {
        return null
    }
}

const limiter = pLimit(4)

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
                    this.id = (!this.id.includes("localhost")) ? this.id.replace(/^https?:/,'https:') : this.id // avoid mixed content
                    limiter(() => fetch(this.id).then(response => response.json()).then(obj => RENDER.element(this.elem, obj)).catch(err => err))
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
