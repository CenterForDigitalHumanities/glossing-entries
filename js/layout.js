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
        <a href="./glosses.html">📑</a>
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
    static #stylizeTab(dir="") {
        return `href="${dir}"${window.location.pathname === dir.slice(1) ? ' style="border-top: 5px solid var(--color-primary); padding-top: 5px;"' : ""}}`
    }
    #template = new DOMParser().parseFromString(`<template id="headerTemplate">
    <header>
        <style>
        .headerimg{
            pointer-events: none;
        }
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
            /*color: var(--color-accent)!important;
            background-color: var(--bg-secondary-color);
            border-bottom: 2px solid var(--color-darkGrey);
            border-color: var(--color-accent);
            opacity: 1;*/
            background-color: var(--color-primary);
            color: var(--bg-color);
        }
    </style>
    <link rel="stylesheet" href="css/gloss.css">
    <button class="button primary" is="auth-button">login</button>
    <img class="headerimg" src="media/gog-logo.jpg" alt="banner">
    <a href="/"><h1 class="title">
        Gallery of Glosses
    </h1></a>
    <div class="tabs">
    <slot name="tabs">
        <a ${GlossHeader.#stylizeTab("./glosses.html")}>✏️ Glosses</a>
        <a ${GlossHeader.#stylizeTab("./ng.html")}>🆕 New gloss</a>
        <a ${GlossHeader.#stylizeTab("./gloss-transcription.html")}>🔍 Detect glosses</a>
        <a ${GlossHeader.#stylizeTab("./manage-glosses.html")}>💾 Manage glosses</a>
        <a ${GlossHeader.#stylizeTab("./themes.html")}>🎨 Themes</a>
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
            //Enter or other line break actions.  Note not to overrule TAB for accessibility reasons.
            if(event.inputType === "insertLineBreak"){
                event.preventDefault()
                addBtn.click()
                return false
            }
            //Assuming comma means 'add so I can do another'.  Should any other key cause this?
            if([','].includes(event.data)) {
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
            //Enter or other line break actions.  Note not to overrule TAB for accessibility reasons.
            if(event.inputType === "insertLineBreak"){
                event.preventDefault()
                addBtn.click()
                return false
            }
            //Assuming comma means 'add so I can do another'.  Should any other key cause this?
            if([','].includes(event.data)) {
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
                border-radius: 0.2em;
                padding: 20px;
            }

            .glossWitnesses{
                margin-bottom: 0.2em;
            }

            .glossWitnesses li {
                display: inline-block;
                vertical-align: top;
                padding: 0.2em 1em;
                cursor: pointer;
                color: var(--color-primary);
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

            .witness-queued a {
                color: var(--color-grey);
                text-decoration: underline;
            }

            .bumper {
                margin-top: 1em;
            }

        </style>
        <h4> See Witness References </h4>
        <p> 
            Have a Witness or two in mind?  Provide shelfmarks below to create Witnesses when you submit this Gloss.<br>
            Witnesses queued to be created when you submit can be removed by clicking the '<span style="color:red;">x</span>' symbol.
        </p>
        <form id="GlossReferenceForm" class="row bg-light">
            <input type="text" class="col-8 col-4-md witnessInput" placeholder="New shelfmark goes here">
            <input class="addWitnessTag button secondary smaller col-4 col-3-md" type="submit" value="Add Witness Reference" >
        </form>
        <p class="bumper"> 
            Known and queued Witnesses of this Gloss are displayed below.  Click a known Witness for details about the Witness.
        </p>
        <ul class="glossWitnesses">
            <li class="wait"> Looking for Witnesses... </li>
        </ul>
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
        this.innerHTML = this.template
        const $this = this
        const witnessList = $this.querySelector(".glossWitnesses")
        const witnessInput = $this.querySelector(".witnessInput")
        const glossURI = $this.getAttribute("gloss-uri") ? decodeURIComponent($this.getAttribute("gloss-uri")) : null
        if(glossURI){
            const gloss_witness_annos_query = {
                "body.references.value" : glossURI,
                '__rerum.history.next':{ $exists: true, $type: 'array', $eq: [] },
                "__rerum.generatedBy" : httpsIdArray(config.GENERATOR)
            }
            getPagedQuery(100, 0, gloss_witness_annos_query)
            .then(gloss_witness_annos => {
                const newView = new Set()
                if(gloss_witness_annos.length){
                    $this.classList.remove("is-hidden")
                    // Get rid of 'non found' placeholder
                    witnessList.querySelector("li.wait")?.remove()
                    gloss_witness_annos.forEach((gloss_witness_anno, index) => {
                        const witnessURI = gloss_witness_anno.target
                        const li = document.createElement("li")
                        li.setAttribute("deer-id", witnessURI)
                        li.setAttribute("deer-source",  gloss_witness_anno["@id"])
                        const a = document.createElement("a")
                        a.classList.add("deer-view")
                        a.setAttribute("deer-template", "shelfmark")
                        a.setAttribute("deer-id", witnessURI)
                        a.setAttribute("target", "_blank")
                        a.innerHTML = "loading..." 
                        // Can only determine which witness interface to go to based on source annotation, if one exists.
                        const witness_source_annos_query = {
                            "body.source.value" : {"$exists":true},
                            "target" : httpsIdArray(witnessURI),
                            "__rerum.history.next":{ $exists: true, $type: "array", $eq: [] },
                            "__rerum.generatedBy" : httpsIdArray(config.GENERATOR)
                        }
                        fetch(`${config.URLS.QUERY}?limit=100&skip=0`, {
                            method: 'POST',
                            mode: 'cors',
                            headers:{
                                "Content-Type" : "application/json;charset=utf-8"
                            },
                            body: JSON.stringify(witness_source_annos_query)
                        })
                        .then(res => {
                            if (!res.ok) {
                                throw Error(res.statusText)
                            }
                            return res.json()
                        })
                        .then(witness_source_annos => {
                            let witnessSource = witness_source_annos.length ? witness_source_annos[0]?.body?.source?.value[0] : null
                            if(witnessSource?.includes("t-pen.org/TPEN/")){
                                a.setAttribute("href", `gloss-transcription.html#${witnessURI}`)
                            }
                            else{
                                a.setAttribute("href",`fragment-profile.html#${witnessURI}`)
                            }
                            li.appendChild(a)
                            witnessList.appendChild(li)
                            utils.broadcast(undefined, "deer-view", document, { set: [a] })  
                        })
                        .catch(err => {
                            console.error(err)
                            $this.innerHTML = `<b class="text-error"> Error communicating with RERUM. </b>`
                        }) 
                    })
                }
                else{
                    witnessList.querySelector("li").innerHTML = `<b> No Witnesses Found.  Create one now! </b>`    
                }
            })
            .catch(err => {
                console.error(err)
                $this.innerHTML = `<b class="text-error"> Could not load Witness References component. </b>`
            })    
        }
        else{
            witnessList.querySelector("li").innerHTML = `<b> Add Witness References Above! </b>`    
        }
        /**
         * Click event handler for Add Theme.  Takes the user input and adds the string to the Set if it isn't already included.
         * Includes pagination.
         * */
        this.addReference = function(event) {
            event.preventDefault()
            event.stopPropagation()
            const name = witnessInput.value
            if(!name) return
            witnessList.querySelector("li.wait")?.remove()
            const li = document.createElement("li")
            const a = document.createElement("a")
            li.classList.add("witness-queued")
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
        this.removeReference = function(event) {
            event.preventDefault()
            event.stopPropagation()
            event.target.closest("li").remove()
        }

        $this.querySelector("#GlossReferenceForm").addEventListener("submit", $this.addReference)
    }
    static get observedAttributes() { return ['gloss-uri'] }
}

customElements.define('gog-references-browser', ReferencesBrowser)
