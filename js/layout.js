import { default as config } from './deer-config.js'
import { default as utils } from './deer-utils.js'
class GlossFooter extends HTMLElement {
    template = `
    <footer>
    <style>
        footer {
            margin-top: 1.5em
        }
    </style>
    <a href="./index.html">🏠</a>
        <a href="./named-glosses.html">📑</a>
        <a rel="noopener noreferrer" title="View on GitHub"
            href="https://github.com/CenterForDigitalHumanities/glossing-entries" target="_blank">
            <svg height="16" class="octicon octicon-mark-github" viewBox="0 0 16 16" version="1.1" width="16"
                aria-hidden="true">
                <path fill-rule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z">
                </path>
            </svg>
        </a>
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
    #template = new DOMParser().parseFromString(`<template id="headerTemplate">
    <header>
    <link rel="stylesheet" href="css/gloss.css">
    <button is="auth-button">login</button>
    <img src="media/gog-logo.jpg" alt="banner">
    <a href="/"><h1 class="title">
        Gallery of Glosses
    </h1></a>
    <div class="tabs">
    <slot name="tabs">
    <style>
        :host {
            --bg-color: hsl(0, 0%, 100%);
            --bg-secondary-color: hsl(240, 14%, 96%);
            --color-primary: hsl(215 35% 50%);
            --color-accent: hsl(12.75deg 80% 40%);
            --color-lightGrey: hsl(218, 14%, 85%);
            --color-grey: hsl(231, 5%, 48%);
            --color-darkGrey: hsl(216, 4%, 26%);
            --color-error: hsl(0, 64%, 53%);
            --color-success: hsl(113, 81%, 41%);
            --grid-maxWidth: 120rem;
            --grid-gutter: 2rem;
            --font-size: 1.6rem;
        }
        ::slotted(a), slot a{
            border-bottom: 2px solid var(--color-lightGrey);
            background-color: var(--bg-color);
            color: var(--color-darkGrey);
            -ms-flex: 0 1 auto;
            flex: 0 1 auto;
            padding: 1rem 2rem;
            text-align: center;
            text-decoration: none;
            font-family: 'Eczar',serif;
            white-space: nowrap;
            color: var(--color-primary);
            transition: all .2s;
        }
        ::slotted(a:hover), slot a:hover {
            color: var(--color-accent)!important;
            background-color: var(--bg-secondary-color);
            border-bottom: 2px solid var(--color-darkGrey);
            border-color: var(--color-accent);
            opacity: 1;
        }
    </style>
        <a href="./named-glosses.html">✏️ Glosses</a>
        <a href="./ng.html">🆕 New gloss</a>
        <a href="./gloss-transcription.html">🔍 Detect glosses</a>
        <a href="./manage-glosses.html">💾 Manage glosses</a>
        <a href="./themes.html">🎨 Themes</a>
    </div>
    </header></template>
        `,'text/html').head.firstChild
    constructor() {
        super()
        const shadowRoot = this.attachShadow({ mode: "open" })
        shadowRoot.appendChild(this.#template.content)
    }
}

customElements.define('gog-header', GlossHeader)

class OSNotice extends HTMLElement {
    template  = `
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
        <label class="col-3 col-2-md text-right">Tag Name</label>
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
        this.querySelector(".tagInput").addEventListener("beforeinput",event=>{
            if([' ',',',null].includes(event.data)) {
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
        this.removeTag = function(event) {
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
        this.querySelector(".themeInput").addEventListener("beforeinput",event=>{
            if([' ',',',null].includes(event.data)) {
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
        this.removeTheme = function(event) {
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
            gog-references-browser{
                position: relative;
                display: block;
            }

            .glossWitnesses li {
                display: inline-block;
                vertical-align: top;
                padding: 0em 1em;
                cursor: pointer;
                color: var(--color-primary);
            }

            .glossWitnesses li::before{
                margin-right: 3px;
                font-size: 10pt;
                opacity: 0.8;
                position: relative;
                bottom: 1px;
                content: '('attr(count)')';
            }
        </style>
        <p> This Gloss can be found in the following texts.  A count will appear next to the texts which represents the number of recorded appearances of this Gloss in that text. </p>
        <ul class="glossWitnesses"> </ul>
    `
    constructor() {
        super()
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if(name === "gloss-uri" && newValue && oldValue !== newValue){
        this.connectedCallback()
      }
    }
    connectedCallback() {
        const $this = this
        this.innerHTML = this.template
        const witnessList = $this.querySelector(".glossWitnesses")
        const glossURI = this.getAttribute("gloss-uri") ? decodeURIComponent(this.getAttribute("gloss-uri")) : null
        if(!glossURI) return

        function activateWitnessModal(event){
            const modal = document.querySelector("witness-modal")
            const clicked_li = event.target.tagName === "SPAN" ? event.target.closest("li") : event.target
            const source_uri = clicked_li.getAttribute("source-uri")
            const witness_uris = clicked_li.getAttribute("appearances").split("__")
            const witnessListElem = modal.querySelector(".appearancesList")
            witnessListElem.innerHTML = ""
            witness_uris.forEach((witness, index) => {
                const li = `<li><a target="_blank" href="/gloss-transcription.html?tpen-project=${source_uri}#${witness}">Appearance ${index+1}</a></li>`
                witnessListElem.innerHTML += li
            })
            modal.toggleModal()
        }

        const gloss_witness_annos_query = {
            "body.references.value" : glossURI,
            '__rerum.history.next':{ $exists: true, $type: 'array', $eq: [] },
            "__rerum.generatedBy" : httpsIdArray(config.GENERATOR)
        }
        fetch(`${config.URLS.QUERY}?limit=100&skip=0`, {
            method: 'POST',
            mode: 'cors',
            headers:{
                "Content-Type" : "application/json;charset=utf-8"
            },
            body: JSON.stringify(gloss_witness_annos_query)
        })
        .then(res => {
            if (!res.ok) {
                throw Error(res.statusText)
            }
            return res.json()
        })
        .then(gloss_witness_annos => {
            const newView = new Set()
            if(gloss_witness_annos.length){
                $this.classList.remove("is-hidden")
                gloss_witness_annos.forEach((gloss_witness_anno, index) => {
                    const li = document.createElement("li")
                    li.setAttribute("count", "0")
                    const a = document.createElement("a")
                    const span = document.createElement("span")
                    const witnessURI = gloss_witness_anno.target
                    const query2 = {
                        "body.source.value" : {"$exists":true},
                        "target" : gloss_witness_anno.target,
                        '__rerum.history.next':{ $exists: true, $type: 'array', $eq: [] },
                        "__rerum.generatedBy" : httpsIdArray(config.GENERATOR)
                    }
                    fetch(`${config.URLS.QUERY}?limit=100&skip=0`, {
                        method: 'POST',
                        mode: 'cors',
                        headers:{
                            "Content-Type" : "application/json;charset=utf-8"
                        },
                        body: JSON.stringify(query2)
                    })
                    .then(res => {
                        if (!res.ok) {
                            throw Error(res.statusText)
                        }
                        return res.json()
                    })
                    .then(witness_source_annos => {
                        // Get the target's 'source' Annotation for a better label.  Should only be 1.
                        const witnessSource = witness_source_annos.length ? witness_source_annos[0].body.source.value[0] : null
                        const witnessURI = `${witness_source_annos.length ? witness_source_annos[0].target : ""}`
                        const sourceURI = witnessSource ? witnessSource : gloss_witness_anno.target
                        // Do not add duplicates
                        const existing = witnessList.querySelector(`li[source-uri="${sourceURI}"]`)
                        if(existing) {
                            const existing_li = existing.closest("li")
                            existing_li.setAttribute("count", parseInt(existing_li.getAttribute("count")) + 1)
                            existing_li.setAttribute("appearances", existing_li.getAttribute("appearances")+`__${witnessURI}`)
                            return
                        }
                        li.setAttribute("source-uri", sourceURI)
                        li.setAttribute("count", "1")
                        li.setAttribute("appearances", witnessURI)
                        li.addEventListener("click", activateWitnessModal, false)
                        span.classList.add("deer-view")
                        span.setAttribute("deer-template", "label")
                        span.setAttribute("deer-id", sourceURI)
                        span.innerHTML = "loading..."
                        li.appendChild(span)
                        witnessList.appendChild(li)
                        utils.broadcast(undefined, "deer-view", document, { set: [span] })    
                    })
                    .catch(err => {
                        return null
                    })
                })
            }
        })
        .catch(err => {
            console.error(err)
            $this.innerHTML = `<b class="text-error"> Could not get Gloss witnesses. </b>`
        })
    }
    static get observedAttributes() { return ['gloss-uri'] }
}

customElements.define('gog-references-browser', ReferencesBrowser)