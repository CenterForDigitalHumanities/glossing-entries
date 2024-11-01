import { default as config } from './deer-config.js'
import { default as utils } from './deer-utils.js'
class GlossFooter extends HTMLElement {
    template = `
    <footer>
        <style>
            footer {
                margin-top: 2em;
                padding: 1em;
                background-color: var(--bg-secondary-color);
                font-size: 0.9em;
            }
            .footer-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 1em;
            }
            .footer-section {
                margin: 0.5em;
            }
            .footer-section h3 {
                font-size: 1.1em;
                margin-bottom: 0.5em;
            }
            footer a {
                color: var(--color-primary);
                text-decoration: none;
            }
            footer a:hover {
                text-decoration: underline;
            }
            .github-link svg {
                vertical-align: middle;
            }
            .footer-nav {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            .footer-nav li {
                margin-bottom: 0.5em;
            }
        </style>
        <div class="footer-grid">
            <div class="footer-section">
                <h3>Navigation</h3>
                <ul class="footer-nav">
                    <li><a href="./index.html">Home</a></li>
                    <li><a href="./glosses.html">Browse Glosses</a></li>
                    <li><a href="./manuscripts.html">Browse Manuscripts</a></li>
                    <li><a href="./manage-glosses.html">Manage Glosses</a></li>
                    <li><a href="./gloss-metadata.html">Add New Gloss</a></li>
                </ul>
            </div>
            <div class="footer-section">
                <h3>About</h3>
                <p><a href="https://galleryofglosses.org/docs/about">About the Project</a></p>
                <p><a class="github-link" href="https://github.com/CenterForDigitalHumanities/glossing-entries" target="_blank">
                    <svg height="16" viewBox="0 0 16 16" version="1.1" width="16" aria-hidden="true">
                        <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                    </svg>
                    Source Code
                </a></p>
                <p><a href="https://centerfordigitalhumanities.github.io/blog">
                Research Computing Group updates
                </a></p>
                <p><a href="https://galleryofglosses.org/docs/acknowledgements">Project Team</a></p>
            </div>
            <div class="footer-section">
                <h3>Acknowledgments</h3>
                <p>This project is supported by the College of Arts & Sciences and the Research Computing Group at 
                Saint Louis University and generous funding from the (USA) National Endowment for the Humanities</p>
                <div class="row is-center">
                    <img class="col" src="https://galleryofglosses.org/assets/images/slu-primary-blue-rgb.png" alt="Saint Louis University Logo" style="width: 100px;">
                    <img class="col" src="https://galleryofglosses.org/assets/images/NEH-seal.jpg" alt="NEH Logo" style="width: 100px;">
                </div>
            </div>
        </div>
    </footer>
    `
    constructor() {
        super()
    }

    connectedCallback() {
        this.innerHTML = this.template
    }
}
customElements.define('gog-footer', GlossFooter)

class GlossHeader extends HTMLElement {
    static #stylizeTab(dir = "") {
        return `href="${dir}"${window.location.pathname === dir.slice(1) ? ' style="border-top: 5px solid var(--color-primary); padding-top: 5px;"' : ""}}`
    }
    #template = new DOMParser().parseFromString(`<template id="headerTemplate">
        <link rel="stylesheet" href="/css/gloss.css">
    <header>
<a href="/" class="brand is-vertical-align is-full-width is-center">
        <img src="images/gog-logo.png" alt="Gallery of Glosses Logo">
        &nbsp;{ data entry }
    </a>
        <button class="button primary" is="auth-button">login</button>
    </header></template>
        `, 'text/html').head.firstChild
    constructor() {
        super()
        const shadowRoot = this.attachShadow({ mode: "open" })
        shadowRoot.appendChild(this.#template.content)
    }
}

customElements.define('gog-header', GlossHeader)

class OSNotice extends HTMLElement {
    template = `
    <div class="osNotice bg-basic"> 
        <style>
            .osNotice{
                position: fixed;
                bottom: 1em;
                right: 1em;
                font-family: monospace;
                font-size: 10pt;
                font-weight: bold;
            }
        </style>
        This site is open source.  <a target="_blank" href="https://github.com/CenterForDigitalHumanities/glossing-entries">Improve this page</a>
    </div>`

    constructor() {
        super()
    }

    connectedCallback() {
        this.innerHTML = this.template
    }
}

customElements.define('os-notice', OSNotice)

class TagWidget extends HTMLElement {
    template = `
        <style>
            .themeTag {
                margin-bottom: 15px;
            }
            .removeTag:after {
                content: 'x';
                color: red;
                padding: 1px 1px 1px 7px;
                cursor: pointer;

            }
            .removeTag:hover {
                font-weight: bolder;
                font-size: 115%;
            }

            button.smaller {
                padding: 0px 5px;
                height: 2.2em;
            }
            .selectedEntities {
                border-left: 1px dotted black;
                border-bottom: 1px dotted black;
                border-right: 1px dotted black;
                padding: 4px;
            }
        </style>
        <p class="col-12 col-12-md">Gloss tags are displayed below the input. Click the red 'x' to remove the tag.
        </p>
        <input type="hidden" deer-key="tags" deer-input-type="Set">
            <details>
                <summary><label class="col-3 col-2-md text-right">
            Tag Name </label></summary>
                Identify a key term or feature of the gloss, e.g. 'incarnatio' or 'OT citation' or 'linguistic observation'. 
                You can also identify specific citations to other texts or allegations as tags, e.g. 'X 3.16.4'.
            </details>
        <input type="text" class="col-9 col-4-md tagInput" placeholder="Add one tag at a time">
        <button class="smaller"> Add Tag </button>
        <div class="selectedEntities col-12 col-12-md"></div>
    `
    constructor() {
        super()
    }
    connectedCallback() {
        const $this = this
        this.innerHTML = this.template
        const addBtn = this.querySelector("button")
        this.querySelector(".tagInput").addEventListener("beforeinput", event => {
            //Enter or other line break actions.  Note not to overrule TAB for accessibility reasons.
            if (event.inputType === "insertLineBreak") {
                event.preventDefault()
                addBtn.click()
                return false
            }
            //Assuming comma means 'add so I can do another'.  Should any other key cause this?
            if ([','].includes(event.data)) {
                event.preventDefault()
                addBtn.click()
                return false
            }
        })
        addBtn.addEventListener("click", addTag)

        /**
         * Click event handler for Add Tag.  Takes the user input and adds the string to the Set if it isn't already included.
         * Includes pagination.
         * */
        function addTag(event) {
            event.preventDefault()
            event.stopPropagation()
            let selectedTagsArea = $this.querySelector(".selectedEntities")
            const tagInput = event.target.previousElementSibling
            let tracked_tags = $this.querySelector("input[deer-key='tags']")
            tracked_tags.value = tracked_tags.value.toLowerCase()
            const delim = (tracked_tags.hasAttribute("deer-array-delimeter")) ? tracked_tags.getAttribute("deer-array-delimeter") : ","
            const newTagName = tagInput.value.toLowerCase().trim()
            let arr_tag_names = tracked_tags.value ? tracked_tags.value.split(delim) : []
            if (newTagName && arr_tag_names.indexOf(newTagName) === -1) {
                selectedTagsArea.innerHTML = ""
                arr_tag_names.push(newTagName)
                arr_tag_names.forEach(name => {
                    let tag = `<span class="tag is-small">${name}<span class="removeTag" tag-name="${name}"></span></span>`
                    selectedTagsArea.innerHTML += tag
                })
                selectedTagsArea.querySelectorAll(".removeTag").forEach(el => {
                    el.addEventListener("click", $this.removeTag)
                })
                tagInput.value = ""
                const str_arr = arr_tag_names.join(delim)
                tracked_tags.value = str_arr
                tracked_tags.setAttribute("value", str_arr)
                tracked_tags.$isDirty = true
            }
            else {
                tagInput.value = ""
            }
        }

        /**
         * Click event handler for .removeTag when the user clicks the little x. 
         * Removes tag from the set of known tags (if included, it really should be though.)
         * Includes pagination.
         * This function is exposed so that the HTML pages can call upon it during pagination moments. 
         * */
        this.removeTag = function (event) {
            event.preventDefault()
            event.stopPropagation()
            const tagName = event.target.getAttribute("tag-name").toLowerCase()
            let selectedTagsArea = $this.querySelector(".selectedEntities")
            let tracked_tags = $this.querySelector("input[deer-key='tags']")
            tracked_tags.value = tracked_tags.value.toLowerCase()
            let delim = (tracked_tags.hasAttribute("deer-array-delimeter")) ? tracked_tags.getAttribute("deer-array-delimeter") : ","
            let arr_tag_names = tracked_tags.value ? tracked_tags.value.split(delim) : []
            if (arr_tag_names.indexOf(tagName) > -1) {
                selectedTagsArea.innerHTML = ""
                arr_tag_names.splice(arr_tag_names.indexOf(tagName), 1)
                arr_tag_names.forEach(name => {
                    let tag = `<span class="tag is-small">${name}<span tag-name="${name}" class="removeTag"></span></span>`
                    selectedTagsArea.innerHTML += tag
                })
                selectedTagsArea.querySelectorAll(".removeTag").forEach(el => {
                    el.addEventListener("click", $this.removeTag)
                })
                let str_arr = arr_tag_names.join(delim)
                tracked_tags.value = str_arr
                tracked_tags.setAttribute("value", str_arr)
                tracked_tags.$isDirty = true
            }
            else {
                $this.querySelector(".tagInput").value = ""
            }
        }
    }
}

customElements.define('gog-tag-widget', TagWidget)

class ThemeWidget extends HTMLElement {
    template = `
        <style>
            .themeWidget {
                margin-bottom: 15px;
            }
            .removeTheme:after {
                content: 'x';
                color: red;
                padding: 1px 1px 1px 7px;
                cursor: pointer;

            }
            .removeTheme:hover {
                font-weight: bolder;
                font-size: 115%;
            }

            button.smaller {
                padding: 0px 5px;
                height: 2.2em;
            }
            .selectedEntities {
                border-left: 1px dotted black;
                border-bottom: 1px dotted black;
                border-right: 1px dotted black;
                padding: 4px;
            }
        </style>
        <p class="col-12 col-12-md">Gloss themes are displayed below the input. Click the red 'x' to remove the theme.
        </p>
        <input type="hidden" deer-key="themes" deer-input-type="Set">
        <label class="col-3 col-2-md text-right">Theme Name</label>
        <input type="text" class="col-9 col-4-md themeInput" placeholder="Add one theme at a time">
        <button class="smaller"> Add Theme </button>
        <div class="selectedEntities col-12 col-12-md"></div>
    `
    constructor() {
        super()
    }
    connectedCallback() {
        const $this = this
        this.innerHTML = this.template
        const addBtn = this.querySelector("button")
        this.querySelector(".themeInput").addEventListener("beforeinput", event => {
            //Enter or other line break actions.  Note not to overrule TAB for accessibility reasons.
            if (event.inputType === "insertLineBreak") {
                event.preventDefault()
                addBtn.click()
                return false
            }
            //Assuming comma means 'add so I can do another'.  Should any other key cause this?
            if ([','].includes(event.data)) {
                event.preventDefault()
                addBtn.click()
                return false
            }
        })
        addBtn.addEventListener("click", addTheme)
        /**
         * Click event handler for Add Theme.  Takes the user input and adds the string to the Set if it isn't already included.
         * Includes pagination.
         * */
        function addTheme(event) {
            event.preventDefault()
            event.stopPropagation()
            let selectedThemesArea = $this.querySelector(".selectedEntities")
            const themeInput = event.target.previousElementSibling
            let tracked_themes = $this.querySelector("input[deer-key='themes']")
            tracked_themes.value = tracked_themes.value.toLowerCase()
            const delim = (tracked_themes.hasAttribute("deer-array-delimeter")) ? tracked_themes.getAttribute("deer-array-delimeter") : ","
            const newThemeName = themeInput.value.toLowerCase().trim()
            let arr_theme_names = tracked_themes.value ? tracked_themes.value.split(delim) : []
            if (newThemeName && arr_theme_names.indexOf(newThemeName) === -1) {
                selectedThemesArea.innerHTML = ""
                arr_theme_names.push(newThemeName)
                arr_theme_names.forEach(name => {
                    let theme = `<span class="tag is-small">${name}<span class="removeTheme" theme-name="${name}"></span></span>`
                    selectedThemesArea.innerHTML += theme
                })
                selectedThemesArea.querySelectorAll(".removeTheme").forEach(el => {
                    el.addEventListener("click", $this.removeTheme)
                })
                themeInput.value = ""
                const str_arr = arr_theme_names.join(delim)
                tracked_themes.value = str_arr
                tracked_themes.setAttribute("value", str_arr)
                tracked_themes.$isDirty = true
            }
            else {
                themeInput.value = ""
            }
        }

        /**
         * Click event handler for .removeTheme when the user clicks the little x. 
         * Removes theme from the set of known themes (if included, it really should be though.)
         * Includes pagination.
         * This function is exposed so that the HTML pages can call upon it during pagination moments. 
         * */
        this.removeTheme = function (event) {
            event.preventDefault()
            event.stopPropagation()
            const themeName = event.target.getAttribute("theme-name").toLowerCase()
            let selectedThemesArea = $this.querySelector(".selectedEntities")
            let tracked_themes = $this.querySelector("input[deer-key='themes']")
            tracked_themes.value = tracked_themes.value.toLowerCase()
            let delim = (tracked_themes.hasAttribute("deer-array-delimeter")) ? tracked_themes.getAttribute("deer-array-delimeter") : ","
            let arr_theme_names = tracked_themes.value ? tracked_themes.value.split(delim) : []
            if (arr_theme_names.indexOf(themeName) > -1) {
                selectedThemesArea.innerHTML = ""
                arr_theme_names.splice(arr_theme_names.indexOf(themeName), 1)
                arr_theme_names.forEach(name => {
                    let theme = `<span class="tag is-small">${name}<span class="removeTheme"></span></span>`
                    selectedThemesArea.innerHTML += theme
                })
                selectedThemesArea.querySelectorAll(".removeTheme").forEach(el => {
                    el.addEventListener("click", $this.removeTheme)
                })
                let str_arr = arr_theme_names.join(delim)
                tracked_themes.value = str_arr
                tracked_themes.setAttribute("value", str_arr)
                tracked_themes.$isDirty = true
            }
            else {
                $this.querySelector(".themeInput").value = ""
            }
        }
    }
}

customElements.define('gog-theme-widget', ThemeWidget)

class ReferencesBrowser extends HTMLElement {
    template = `
        <style>
            .glossWitnesses{
                margin-bottom: 0.2em;
            }

            .glossWitnesses li {
                display: inline-block;
                vertical-align: top;
                padding: 0.2em 1em;
                cursor: pointer;
                color: var(--color-primary);
                text-transform: inherit;
            }

            .remove-witness:after {
                content: "x";
                color: red;
                padding: 1px 1px 1px 7px;
                cursor: pointer;

            }
            .remove-witness:hover {
                font-weight: bolder;
            }

            button.smaller {
                padding: 0px 5px;
                height: 2.2em;
            }

        </style>
        <div class="card">
        <h4> Manuscript References </h4>
        <form id="GlossReferenceForm" class="data-input">
        <div class="grouped">
            <p class="col">
                <label for="addShelfMarkQuick">Provide shelfmarks below to connect Manuscripts when you submit this Gloss.</label>
                <input id="addShelfMarkQuick" type="text" class=" witnessInput" placeholder="New shelfmark goes here">
               </p>
                <input class="addWitnessTag button" type="submit" value="Add Manuscript Reference" >
            </div>
        </form>
        <div class="is-hidden">
        <p> 
            Below you will see shelfmarks for Manuscripts that contain this Gloss.  
            Remove by clicking the <span style="color:red;">x</span>.
        </p>
        <ul class="glossWitnesses">
            <li class="wait"> Looking for Witnesses... </li>
        </ul>
        </div>
        </div>
    `
    constructor() {
        super()
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === "gloss-uri" && newValue && oldValue !== newValue) {
            this.connectedCallback()
        }
    }
    connectedCallback() {
        this.innerHTML = this.template
        const $this = this

        /**
         * Get all ManuscriptWitness entity URIs that reference this Gloss.
         * @param source A String that is either a text body or a URI to a text resource.
         * @return An Array of Manuscript Witness URIs
         */
        async function getAllManuscriptWitnessesOfGloss(glossURI) {
            const historyWildcard = { "$exists": true, "$size": 0 }

            const gloss_witness_annos_query = {
                "body.references.value": httpsIdArray(glossURI),
                '__rerum.history.next': { $exists: true, $type: 'array', $eq: [] },
                "__rerum.generatedBy": httpsIdArray(__constants.generator)
            }
            let fragmentUriSet = await getPagedQuery(100, 0, gloss_witness_annos_query)
                .then(async (annos) => {
                    const fragments = annos.map(async (anno) => {
                        const entity = await fetch(anno.target).then(resp => resp.json()).catch(err => { throw err })
                        if (entity["@type"] && entity["@type"] === "WitnessFragment") {
                            return anno.target
                        }
                        // This will end up in the Set
                        return undefined
                    })
                    const fragmentsOnly = await Promise.all(fragments).catch(err => { throw err })
                    return new Set(fragmentsOnly)
                })
                .catch(err => {
                    console.error(err)
                    throw err
                })
            // Remove the undefined entry if present
            fragmentUriSet.delete(undefined)
            if (fragmentUriSet.size === 0) {
                console.log(`There are no Manuscript Witnesses that reference the Gloss '${glossURI}'`)
                return new Set()
            }
            // There are many fragments that reference this Gloss.  Those fragments are all a part of different Manuscript Witnesses.
            // Put all of thise different Manuscript Witnesses into a Set to return.
            let allManuscriptWitnesses = new Set()
            for await (const fragmentURI of [...fragmentUriSet.values()]) {
                //each fragment has partOf Annotations letting you know the Manuscripts it is a part of.
                const partOfAnnosQuery = {
                    "body.partOf.value": { "$exists": true },
                    "target": httpsIdArray(fragmentURI),
                    "__rerum.history.next": historyWildcard,
                    "__rerum.generatedBy": httpsIdArray(__constants.generator)
                }
                let manuscriptUriSet = await fetch(`${__constants.tiny}/query?limit=1&skip=0`, {
                    method: "POST",
                    mode: 'cors',
                    headers: {
                        "Content-Type": "application/json;charset=utf-8"
                    },
                    body: JSON.stringify(partOfAnnosQuery)
                })
                    .then(response => response.json())
                    .then(async (annos) => {
                        const manuscripts = annos.map(async (anno) => {
                            const entity = await fetch(anno.body.partOf.value).then(resp => resp.json()).catch(err => { throw err })
                            if (entity["@type"] && entity["@type"] === "ManuscriptWitness") {
                                return anno.body.partOf.value
                            }
                            // This will end up in the Set
                            return undefined
                        })
                        const manuscriptWitnessesOnly = await Promise.all(manuscripts).catch(err => { throw err })
                        return new Set(manuscriptWitnessesOnly)
                    })
                    .catch(err => {
                        console.error(err)
                        throw err
                    })
                manuscriptUriSet.delete(undefined)
                if (manuscriptUriSet.size === 0) {
                    console.error(`There is no Manuscript Witness for fragment '${fragmentURI}'`)
                    continue
                }
                else if (manuscriptUriSet.size > 1) {
                    console.error("There are many Manuscript Witnesses when we only expect one.")
                    continue
                }
                allManuscriptWitnesses = new Set([...allManuscriptWitnesses, ...manuscriptUriSet])
            }

            return [...allManuscriptWitnesses]
        }
        /**
         * Click event handler for Add Theme.  Takes the user input and adds the string to the Set if it isn't already included.
         * Includes pagination.
         * */
        this.addReference = async function (event) {
            event.preventDefault()
            event.stopPropagation()
            const name = witnessInput.value
            if (!name) return
            let dup = false
            // Don't add a second reference to the same thing.  We cannot make two Witnesses of the same identifier.
            const existing = witnessList.querySelectorAll("a")
            witnessList.closest('div').classList.remove("is-hidden")
            for (const a of existing) {
                if (a.innerText === name) {
                    dup = true
                    break
                }
            }
            if (dup) {
                const e = new CustomEvent("No Duplicates")
                globalFeedbackBlip(e, `Duplicate Witnesses are not allowed.  Change the shelfmark.`, false)
                return
            }
            let matchedWitnessURI = await getManuscriptWitnessFromShelfmark(name.trim())
            if (!matchedWitnessURI) matchedWitnessURI = ""
            witnessList.querySelector("li.wait")?.remove()
            const li = document.createElement("li")
            const a = document.createElement("a")
            li.classList.add("witness-queued", "tag", "text-primary", "bd-primary")
            li.setAttribute("matched-manuscript", matchedWitnessURI)
            li.setAttribute("title", "This Witness is queued")
            a.setAttribute("target", "_blank")
            a.setAttribute("deer-id", "")
            a.innerHTML = `${name}`
            li.appendChild(a)
            const span = document.createElement("span")
            span.setAttribute("title", "remove from queue")
            span.classList.add("remove-witness")
            span.addEventListener("click", $this.removeReference)
            li.appendChild(span)
            witnessList.appendChild(li)
            witnessInput.value = ""
        }

        /**
         * Click event handler for .removeTheme when the user clicks the little x. 
         * Removes theme from the set of known themes (if included, it really should be though.)
         * Includes pagination.
         * This function is exposed so that the HTML pages can call upon it during pagination moments. 
         * */
        this.removeReference = function (event) {
            event.preventDefault()
            event.stopPropagation()
            event.target.closest("li").remove()
        }

        $this.querySelector("#GlossReferenceForm").addEventListener("submit", $this.addReference)

        if ($this.hasAttribute("view-only")) {
            $this.querySelectorAll(".data-input").forEach(e => e.classList.add("is-hidden"))
        }
        const witnessList = $this.querySelector(".glossWitnesses")
        const witnessInput = $this.querySelector(".witnessInput")
        const glossURI = $this.getAttribute("gloss-uri") ? decodeURIComponent($this.getAttribute("gloss-uri")) : null
        if (!glossURI) {
            witnessList.querySelector("li").innerHTML = `<b class="data-input"> Add Manuscript References Above! </b>`
            return
        }
        witnessList.closest('div').classList.remove("is-hidden")
        getAllManuscriptWitnessesOfGloss(glossURI)
            .then(manuscripts => {
                if (manuscripts.length > 0) {
                    witnessList.innerHTML = ""
                    $this.classList.remove("is-hidden")
                    for (const manuscriptURI of manuscripts) {
                        const li = document.createElement("li")
                        li.setAttribute("deer-id", manuscriptURI)
                        const a = document.createElement("a")
                        a.classList.add("deer-view")
                        a.setAttribute("deer-template", "shelfmark")
                        a.setAttribute("deer-id", manuscriptURI)
                        a.setAttribute("target", "_blank")
                        a.setAttribute("href", `manuscript-profile.html#${manuscriptURI}`)
                        a.innerHTML = "loading..."
                        li.appendChild(a)
                        witnessList.appendChild(li)
                        utils.broadcast(undefined, "deer-view", document, { set: [a] })
                    }
                }
                else {
                    witnessList.querySelector("li").innerHTML = `<b class="data-input"> No Witness References Found.  Add One Above! </b>`
                }
                if ($this.hasAttribute("view-only")) {
                    $this.querySelectorAll(".data-input").forEach(e => e.classList.add("is-hidden"))
                }
            })

    }
    static get observedAttributes() { return ['gloss-uri'] }
}

customElements.define('gog-references-browser', ReferencesBrowser)
