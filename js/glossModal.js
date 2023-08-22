

import { default as utils } from './deer-utils.js'

/**
  * A button for activating the module.
  * Offers an event for when the module is hidden or shown.
*/
class GlossModalActivationButton extends HTMLElement {
    template = `
    <style>
        gloss-modal-button span{
            margin-right: 1em;
            margin-top: 0.5em;
            font-size: 11pt;
            font-family: "Eczar","Volkhov",serif;
        }
        gloss-modal-button input{
            padding: 3px !important;
            font-size: 10pt !important;
        }
    </style>
    <span class="">Don't see a matching Gloss?</span>  
    <input title="Create a new Gloss!" type="button" class="button primary" value="&plus; Add a New Gloss to Attach" /> 
    `

    constructor() {
        super()
    }
    connectedCallback() {
        this.innerHTML = this.template
        let $this = this
        this.querySelector("input[type='button']").addEventListener("click", toggleModal)

        /**
         * Check if the Witness form has a shelfmark value.
         */ 
        function hasShelfmarkRequirement(){
            if(witnessForm !== undefined){
                const s = witnessForm.querySelector("input[deer-key='identifier']")?.value
                if(s){
                    return true
                }  
            }
            return false
        }

        /**
         * Hide or show the modal (no animation).
         * Fire an event for whether the modal is hidden or visiable.
         */ 
        function toggleModal(event){
            // A proprietary handler for gloss-transcription.html to make sure the Shelfmark requirement is met before pulling up the Gloss modal.
            if(document.location.pathname.includes("gloss-transcription.html")){
                if(!hasShelfmarkRequirement()) {
                    alert("You must provide a Shelfmark value.")
                    return false
                }
            }

            const $button = event.target
            const modal = document.querySelector("gloss-modal")
            const action = modal.classList.contains("is-hidden") ? "remove" : "add"
            modal.classList[action]("is-hidden")
            const ev = (action === "add") ? "hidden" : "visible"
            utils.broadcast(undefined,`gloss-modal-${ev}`, modal, {})
        }
    }
}

customElements.define('gloss-modal-button', GlossModalActivationButton)


/**
  * A focused pop up containing the Gloss deer-form, similar to the form on ng.html.
  * It can be included on any HTML page.  It fires events for when the DEER form contained within has been saved.
*/
class GlossModal extends HTMLElement {
    template = `
        <style>
            gloss-modal{
                position: absolute;
                display: block;
                top: 1em;
                z-index: 2;
            }
            .window-shadow{
                position: fixed;
                background-color: rgba(0,0,0,0.5);
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            .modal{
                position: relative;
                top: 3em;
            }
            .modal form{

            }
        </style>
        <div class="window-shadow"> 
            <div class="modal container">
                <div class="card">
                    <header>
                      <h4>Create New Gloss</h4>
                    </header>
                    <p>
                        Create a new Gloss for Gallery of Glosses.  
                        When you create this Gloss it will be attached to the T-PEN Transcription text selection and appear in the Gallery of Glosses Gloss Collection.
                    </p>

                    <form name="gloss-modal-form" deer-type="Gloss_TEST" deer-context="http://purl.org/dc/terms">
                        <input type="hidden" deer-key="targetCollection" value="Glossing-Matthew-Named-Glosses">
                        <input is="auth-creator" type="hidden" deer-key="creator" />
                        <div class="row">
                            <label class="col-3 col-2-md text-right">Gloss Text:</label>
                            <input type="hidden" deer-key="text">
                            <textarea name="glossText" placeholder="text content" rows="2" class="col-9 col-10-md"></textarea>

                            <label for="textLang" class="col-3 col-2-md text-right">Language:</label>
                            <select name="textLang" class="col-3 col-2-md">
                                <option value="la" selected>Latin</option>
                                <option value="de">German</option>
                                <option value="fr">French</option>
                                <option value="en">English</option>
                            </select>
                        </div>
                        <div class="row">
                            <label class="col-3 col-2-md text-right">Canonical Reference Locator:</label>
                            <input type="text" deer-key="canonicalReference" placeholder='e.g., "Matthew 5:1"' class="col-9 col-4-md">
                        </div>
                        <div class="row">
                            <label class="col-3 col-2-md text-right">Target Text:</label>
                            <textarea deer-key="targetedText" rows="2" class="col-9 col-10-md" placeholder="target text"></textarea>
                            <label class="col-3 col-2-md text-right">Label for display:</label>
                            <input type="text" deer-key="title" placeholder="Short label" class="col-9 col-10-md">
                        </div>
                        <div class="row">
                            <gog-tag-widget class="col"> </gog-tag-widget>
                            <gog-theme-widget class="col"> </gog-theme-widget>
                        </div>

                        <button type="button" name="checkForGlossesBtn"> Check for Existing Glosses </button>
                        <div class="glossResult"></div>

                        <input type="submit" value="Create" class="col is-hidden">
                    </form>

                    <footer class="is-right">
                      <input type="button" value="Create Gloss" class="button primary"/>
                      <input type="button" value="Cancel" class="button secondary"/>
                    </footer>
                </div>
            </div>
        </div>
    `
    constructor() {
        super()
    }
    connectedCallback() {
        this.innerHTML = this.template
        const $this = this

        // -- Might need to populate deer-key="creator"?

        // Catch the entity creation announcement from DEER
        addEventListener('deer-updated', event => {
            const $elem = event.target
            //Only care about the gloss-modal form
            if($elem.getAttribute("name")  !== "gloss-modal-form") return

            // We don't want the typical DEER form stuff to happen.  This may have no effect, not sure.
            event.preventDefault()
            event.stopPropagation()

            // Announce a modal specific event with the details from the DEER announcement
            utils.broadcast(event, `gloss-modal-saved`, $this, event.detail ?? {})
        })

        // 'Submit' click event handler
        this.querySelector(".button.primary").addEventListener("click", event => {
              $this.querySelector("input[type='submit']").click()
        })

        // 'Cancel' click event handler
        this.querySelector(".button.secondary").addEventListener("click", event => {
           $this.classList.add("is-hidden")     
        })

        // Typically called by an event listener for 'gloss-modal-saved'.  Resets the modal so it is ready to create a new Gloss.
        this.reset = () => {
            const form = $this.querySelector("form")
            form.removeAttribute("deer-source")
            form.removeAttribute("deer-id")
            form.$isDirty = false

            form.querySelectorAll("input[deer-key]").forEach(el => {
                el.removeAttribute("deer-source")
                if(el.getAttribute("type") !== "hidden"){
                    el.removeAttribute("value")
                    el.value = ""
                    el.$isDirty = false    
                }
                // This one is hidden but needs to change
                if(el.getAttribute("deer-key") === "text"){
                    el.removeAttribute("deer-source")
                    el.removeAttribute("value")
                    el.value = ""
                    el.$isDirty = false
                }
            })

            form.querySelectorAll("textarea").forEach(el => {
                el.removeAttribute("deer-source")
                el.removeAttribute("value")
                el.value = ""
                el.$isDirty = false
            })

            const textLangElem = form.querySelector("select[name='textLang']")
            textLangElem.setAttribute("value","la")
            textLangElem.value = "la"

            form.querySelectorAll(".selectedEntities").forEach(el => {
                el.innerHTML = ""
            })

            form.querySelector(".glossResult").innerHTML = ""
            console.log("GLOSS FORM RESET")
        }
        
        const labelElem = this.querySelector('input[deer-key="title"]')
        const textElem = this.querySelector('textarea[name="glossText"]')
        const textLang = this.querySelector('select[name="textLang"]')
        const checkForGlossesBtn = this.querySelector('button[name="checkForGlossesBtn"]')
        const glossResult = this.querySelector('.glossResult')
        const textListener = textElem.addEventListener('input', ev => {
            if (textElem.value?.length > 5) {
                const words = textElem.value.split(' ')
                let label = ''
                while (label.length < 20 && words.length > 0) {
                    label += words.shift() + " "
                }
                labelElem.value = label.trim()
                labelElem.dispatchEvent(new Event('input', { bubbles: true }))
            }
        })

        labelElem.addEventListener('input', ev => {
            if (!textElem.value.startsWith(labelElem.value)) {
                textElem.removeEventListener('input', textListener)
            }
        })

        textElem.addEventListener('blur', ev => checkForGlossesBtn.click())
        checkForGlossesBtn.addEventListener('click', async ev => {
            const matches = await findMatchingIncipits(textElem.value.trim(), labelElem.value)
            glossResult.innerHTML = matches.length ? "<p>Potential matches found!</p>" : "<p>Gloss appears unique!</p>"
            matches.forEach(anno => {
                glossResult.insertAdjacentHTML('beforeend', `<a href="#${anno.id.split('/').pop()}">${anno.title}</a>`)
            })
        })

        ;[textElem, textLang].forEach(elem => addEventListener('input', event => {
            const textObject = $this.querySelector("input[deer-key='text']")
            textObject.value = {
                '@type': "Text",
                value: textElem.value,
                format: "text/plain",
                language: textLang.value
            }
            textObject.$isDirty = true
        }))

        utils.broadcast(undefined, "deer-form", this, { set: [this.querySelector("form")] })
    }
}

customElements.define('gloss-modal', GlossModal)
