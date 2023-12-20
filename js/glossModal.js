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
         * Check if the Witness form has text selection (for a text value).
         */ 
        function hasTextRequirement(){
            if(witnessForm !== undefined){
                const s = witnessForm.querySelector("input[custom-key='selections']")?.value
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
            let blip = new CustomEvent("Blip")
            if(document.location.pathname.includes("gloss-transcription")){
                // There must be a shelfmark
                if(!hasShelfmarkRequirement()){
                    //alert("You must provide a Shelfmark value.")
                    blip = new CustomEvent("You must provide a Shelfmark value.")
                    utils.globalFeedbackBlip(blip, `You must provide a Shelfmark value.`, false)
                    return
                }
                // There must be a selection
                if(!hasTextRequirement()){
                    //alert("Select some text first")
                    blip = new CustomEvent("Select some text first.")
                    utils.globalFeedbackBlip(blip, `Select some text first.`, false)
                    return   
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
                top: 0;
                max-height: 95%; 
                overflow-y: auto;
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

                    <form name="gloss-modal-form" deer-type="Gloss" deer-context="http://purl.org/dc/terms">
                        <input type="hidden" deer-key="targetCollection" value="GoG-Named-Glosses">
                        <input is="auth-creator" type="hidden" deer-key="creator" />
                        <div class="row">
                            <label class="col-3 col-2-md text-right">Gloss Text:</label>
                            <textarea custom-text-key="text" name="glossText" placeholder="text content" rows="2" class="col-9 col-10-md"></textarea>
                            <label for="textLang" class="col-3 col-2-md text-right">Language:</label>
                            <select custom-text-key="language" name="textLang" class="col-3 col-2-md">
                                <option value="la" selected>Latin</option>
                                <option value="de">German</option>
                                <option value="fr">French</option>
                                <option value="en">English</option>
                            </select>
                            <label title="Select the checkbox if the text contains markup tags like HTML or XML" class="col-12 col-6-md text-left">
                                The text contains <code>&lt; tags &gt;</code><input type="checkbox" custom-text-key="format" value="text/plain" />
                            </label>
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

                        <div class="row">
                            <div class="col">
                                <p> Before submitting you can check for existing Glosses that may already contain the text provided above. </p>
                                <button type="button" name="checkForGlossesBtn"> Check for Existing Glosses </button>
                                <div class="glossResult"></div>
                            </div>
                        </div>

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
        const $form = this.querySelector("form")
        const textWitnessID = window.location.hash.substr(1)

        // Catch the entity creation announcement from DEER
        addEventListener('deer-updated', event => {
            const $elem = event.target

            //Only care about the gloss-modal form
            if($elem.getAttribute("name")  !== "gloss-modal-form") return

            // We don't want the typical DEER form stuff to happen.  This may have no effect, not sure.
            event.preventDefault()
            event.stopPropagation()

            // We need to save the custom text Annotation for the gloss
            const customTextElems = [
                $elem.querySelector("input[custom-text-key='format']"),
                $elem.querySelector("select[custom-text-key='language']"),
                $elem.querySelector("textarea[custom-text-key='text']")
            ]
            if(customTextElems.filter(el => el.$isDirty).length > 0){
                // One of the text properties has changed so we need the text object
                const format = customTextElems[0].value
                const language = customTextElems[1].value
                const text = customTextElems[2].value
                let textanno = {
                    "@context": "http://www.w3.org/ns/anno.jsonld",
                    "@type": "Annotation",
                    "body": {
                        "text":{
                            "format" : format,
                            "language" : language,
                            "textValue" : text
                        }
                    },
                    "target": event.detail["@id"],
                    "creator" : window.GOG_USER["http://store.rerum.io/agent"]
                }
                const el = customTextElems[2]
                if(el.hasAttribute("deer-source")) textanno["@id"] = el.getAttribute("deer-source")
                    
                fetch(`${__constants.tiny}/${el.hasAttribute("deer-source")?"update":"create"}`, {
                    method: `${el.hasAttribute("deer-source")?"PUT":"POST"}`,
                    mode: 'cors',
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    },
                    body: JSON.stringify(textanno)
                })
                .then(res => res.json())
                .then(a => {
                    customTextElems[0].setAttribute("deer-source", a["@id"])
                    customTextElems[1].setAttribute("deer-source", a["@id"])
                    customTextElems[2].setAttribute("deer-source", a["@id"])
                })
                .catch(err => {
                    console.error(`Could not generate 'text' property Annotation`)
                    console.error(err)
                })
                .then(success => {
                    console.log("GLOSS FULLY SAVED")
                    const ev = new CustomEvent("Thank you for your Gloss Submission!")
                    globalFeedbackBlip(ev, `Thank you for your Gloss Submission!`, true)
                    // Announce a modal specific event with the details from the DEER announcement
                    utils.broadcast(event, `gloss-modal-saved`, $this, event.detail ?? {})
                })
                .catch(err => {
                    console.error("ERROR PROCESSING SOME FORM FIELDS")
                    console.error(err)
                    // Announce a modal specific event with the details from the DEER announcement
                    utils.broadcast(event, `gloss-modal-error`, $this, event.detail ?? {})
                })
            }
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
            $form.removeAttribute("deer-source")
            $form.removeAttribute("deer-id")
            $form.$isDirty = false

            $form.querySelectorAll("input[deer-key]").forEach(el => {
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

            $form.querySelectorAll("textarea").forEach(el => {
                el.removeAttribute("deer-source")
                el.removeAttribute("value")
                el.value = ""
                el.$isDirty = false
            })

            const textLangElem = form.querySelector("select[name='textLang']")
            textLangElem.setAttribute("value","la")
            textLangElem.value = "la"

            $form.querySelectorAll(".selectedEntities").forEach(el => {
                el.innerHTML = ""
            })

            $form.querySelector(".glossResult").innerHTML = ""
            console.log("GLOSS FORM RESET")
        }

        if(!textWitnessID){
            // These items have default values that are dirty on fresh forms.
            $form.querySelector("select[custom-text-key='language']").$isDirty = true
            $form.querySelector("input[custom-text-key='format']").$isDirty = true
        }

        // mimic isDirty detection for these custom inputs
        $form.querySelector("select[custom-text-key='language']").addEventListener("change", ev => {
            ev.target.$isDirty = true
            $form.$isDirty = true
        })
        $form.querySelector("textarea[custom-text-key='text']").addEventListener("input", ev => {
            ev.target.$isDirty = true
            $form.$isDirty = true
        })
        // Note that this HTML element is a checkbox
        $form.querySelector("input[custom-text-key='format']").addEventListener("click", ev => {
            if(ev.target.checked){
                ev.target.value = "text/html"
                ev.target.setAttribute("value", "text/html")
            }
            else{
                ev.target.value = "text/plain"
                ev.target.setAttribute("value", "text/plain")
            }
            ev.target.$isDirty = true
            $form.$isDirty = true
        })
            
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
            labelElem.$isDirty = true
        })

        //textElem.addEventListener('blur', ev => checkForGlossesBtn.click())
        checkForGlossesBtn.addEventListener('click', async ev => {
            const matches = await findMatchingIncipits(textElem.value.trim(), labelElem.value)
            glossResult.innerHTML = matches.length ? "<p>Potential matches found!</p>" : "<p>Gloss appears unique!</p>"
            matches.forEach(anno => {
                glossResult.insertAdjacentHTML('beforeend', `<a href="#${anno.id.split('/').pop()}">${anno.title}</a>`)
            })
        })

        utils.broadcast(undefined, "deer-form", this, { set: [$form] })
    }
}

customElements.define('gloss-modal', GlossModal)
