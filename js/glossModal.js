/**
  * BRYAN
  * 
*/

class GlossModal extends HTMLElement {
    template = `
        <style>
            gloss-modal{
                display: none;
            }
            .window-shadow{

            }
            .modal{

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
                        Create a new Gloss for Gallery of Glosses.  It will be added to the collection of Glosses and made available for selection.
                    </p>

                    <form id="named-gloss-modal" deer-type="Gloss" deer-context="http://purl.org/dc/terms">
                        <input type="hidden" deer-key="targetCollection" value="GoG-Named-Glosses">
                        <input is="auth-creator" type="hidden" deer-key="creator" />
                        <div class="row">
                            <label class="col-3 col-2-md text-right">Gloss Text:</label>
                            <input type="hidden" deer-key="text" id="textObject">
                            <textarea id="glossText" placeholder="text content" rows="2" class="col-9 col-10-md"></textarea>

                            <label for="textLang" class="col-3 col-2-md text-right">Language:</label>
                            <select name="textLang" id="textLang" class="col-3 col-2-md">
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

                        <button type="button" id="checkForGlossesBtn"> Check for Existing Glosses </button>
                        <div id="glossResult"></div>

                        <input type="submit" value="Create" class="col is-hidden">
                    </form>

                    <footer class="is-left">
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

        // There are some initialization jobs, listed here
        // -- If there is a text selection, deer-key="text" takes on that value.
        // -- Might need to populate deer-key="creator"

        // Catch the entity creation announcement from DEER
        addEventListener('deer-updated', event => {
            const $elem = event.target
            //Only care about the named-gloss-modal form
            if($elem?.id  !== "named-gloss-modal") return

        })

        // 'Submit' click event handler
        this.querySelector(".button.primary").addEventListener("click", event => {
              $this.querySelector("input[type='submit']").click()
              // If DEER announces success, then the modal goes away because the Gloss was created.
              // If DEER announces failure, then...?
        })

        // 'Cancel' click event handler
        this.querySelector(".button.secondary").addEventListener("click", event => {
           $this.classList.add("is-hidden")     
        })
        
        const labelElem = this.querySelector('input[deer-key="title"]')
        const textElem = glossText
        const textListener = textElem.addEventListener('input', ev => {
            if (textElem.value?.length > 5) {
                const words = textElem.value.split(' ')
                let label = ''
                while (label.length < 20 && words.length > 0) {
                    label += words.shift() + " "
                }
                labelElem.value = label.trim()
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

        ;[glossText, textLang].forEach(elem => addEventListener('input', event => {
            textObject.value = {
                '@type': "Text",
                value: glossText.value,
                format: "text/plain",
                language: textLang
            }
        }))
    }
}

customElements.define('gloss-modal', GlossModal)
