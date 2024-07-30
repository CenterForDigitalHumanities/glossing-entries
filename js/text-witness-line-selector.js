/**
 * Defines a custom HTML element `<source-text-selector>` that processes a T-PEN Manifest URI (Presentation API 2.1 only)
 * or direct text to generate a user interface allowing text selections. The selected text is intended to be stored
 * as a URI fragment using #char, potentially spanning multiple lines.
 * 
 * Attributes:
 * - `source-uri`: A URI pointing to a resource containing the text for transcription.
 * - `source-text`: Directly provided text content to be used for transcription if no URI is provided.
 * 
 * CSS Styling:
 * - The selected text is highlighted with an orange background.
 * - Toggle buttons are provided to hide/show text.
 * 
 * Events:
 * - Custom events like `source-text-loaded` and `source-text-error` are dispatched to signal the load status
 *   or errors in fetching or processing the text.
 * 
 * Usage:
 * - Place this element within an HTML document with optional attributes `source-uri` or `source-text`.
 * - Use JavaScript to listen for custom events and interact with the selected text.
 */
class WitnessTextSelector extends HTMLElement {
    template = `
        <style>
            source-text-selector{
                position: relative;
                display: block;
            }
           .witnessText{
                background-color: orange;
                word-break: break-word;
           }
           div[source-text-id]{
                display: inline;
           }
           h4 {
                display: inline;
                user-select: none;
           }         
           .togglePage{
                position: absolute;
                cursor: pointer;
                display: inline;
                font-weight: bold;
                right: 1em;
                user-select: none;
           }
           .togglePage::before{
                content: "toggle page text ";
                font-size: 8pt;
                font-family: "Eczar","Volkhov",serif;
                user-select: none;
           }
          .toggle{
                position: absolute;
                cursor: pointer;
                top: 0;
                right: 0;
                font-weight: bold;
           }
           .toggle::before{
                content: "toggle all text ";
                font-family: "Eczar","Volkhov",serif;
                font-size: 8pt;
           }
           .witnessText.is-toggled{
                visibility: hidden;
                height: 0px;
           }
        </style>

        <h2> Select Witness Text </h2>
        <input type="hidden" custom-key="selections" />
        <div title="Collapse Witness Text Area" class="toggle is-hidden">&#9660;</div>
        <div class="witnessText col"></div>
    `
    constructor() {
        super()
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if((name === "source-uri" || name === "source-text") && newValue && oldValue !== newValue){
        this.connectedCallback(name)
      }
    }
    async connectedCallback(which) {
        this.innerHTML = this.template
        const $this = this
        const witnessURI = this.getAttribute("source-uri")
        const witnessText = this.getAttribute("source-text")
        if(!witnessURI && !witnessText) return

        const customKey = this.querySelector("input[custom-key='selections']")
        const witnessTextElem = this.querySelector(".witnessText")
        let textForUI = witnessText
        
        if(which === "source-uri"){
           textForUI = await fetch(witnessURI)
            .then(response => {
                if(response.ok){
                    const t = response.headers.get("content-type")
                    if(!t.includes("text/plain")){
                        const ev = new CustomEvent(`'${t}' is not a supported file type.`)
                        globalFeedbackBlip(ev, `'${t}' is not a supported file type.  Starting over...`, false)
                        setTimeout( () => {
                            startOver()
                        }, 2500)
                        return ""
                    }
                    return response.text()
                }
                else{
                    const err = new Error(`Could not get witness text from ${witnessURI}`)
                    throw err
                }
            })
            .catch(err => {
                console.error(err)
                const e = new CustomEvent("source-text-error", {bubbles: true })
                $this.setAttribute("source-text-error", "true")
                document.dispatchEvent(e)
                return ""
            })    
        }
        
        // Treat it as plain text
        const plaintext = document.createElement("div")
        plaintext.classList.add("textContent")
        let just_text = ""
        // Newlines (/r and /n) result in <br> separations when doing elem.innerText.  This makes it more difficult to do Selection selectors.
        just_text = textForUI.replace(/(\r\n|\n|\r)/gm, "")
        plaintext.innerText = just_text
        witnessTextElem.appendChild(plaintext)
        plaintext.onmousedown = clearMarks
        plaintext.onmouseup = captureSelectedPlainText

        function clearMarks(e){
            const lineElem = e.target
            let unmarkup = new Mark(lineElem)
            unmarkup.unmark({"className" : "persists"})
            unmarkup.unmark({"className" : "pre-select"})
        }

        /**
         * Capture the user selection data after they have used the cursor to select some text.
         * This can happen via a click-and-drag or a double click.  It can happen across line and page elements.
         * Only respect the 'left click' AKA 'main click'.
         * Selections which contain an existing <mark> are invalid.  
         * 
         * @param e The mouse up event from a user selecting text.
         */ 
        function captureSelectedPlainText(e){
            // Only when it's the 'left click' or noted primary button
            if(e.button > 0) return
            const lineElem = e.target
            // let unmarkup = new Mark(lineElem)
            // unmarkup.unmark({"className" : "persists"})

            let s = window.getSelection ? window.getSelection() : document.selection
            // Only if there is an actual text selection
            const selectedText = s.toString() ? s.toString() : ""
            if(!selectedText) {
                return
            }
            const $form = lineElem.closest("form")
            const customKey = $this.querySelector("input[custom-key='selections']")
            const filter = document.querySelector("input[filter]")

            // Build the selection object from which to set the selection input in the form.
            const baseOffset = s.baseOffset
            const extentOffset =  s.extentOffset
            const lengthOfSelection = extentOffset - baseOffset
            const fragmentSelector = `#char=${baseOffset},${extentOffset-1}`
            const resourceFragment = witnessURI + fragmentSelector

            // Set the selections input on the form
            if(!customKey.value.includes(resourceFragment)){
                customKey.value = resourceFragment
                customKey.$isDirty = true
                $form.$isDirty = true
            }

            // Set the Text input on the form
            const textInput = $form.querySelector("textarea[custom-text-key='text']")
            textInput.setAttribute("value", selectedText.trim())
            textInput.value = selectedText.trim()
            textInput.dispatchEvent(new Event('input', { bubbles: true }))

            // Generate a programmatic label and set the label input on the form
            const shelfmark = $form.querySelector("input[deer-key='identifier']").value

            // Put the first word of the select text into the filter
            const firstword = selectedText.trim().split(" ")[0]
            // The filter may not be in the DOM when the user is selecting text.
            if(ngCollectionList.hasAttribute("ng-list-loaded")){
                filter.value = firstword
                filter.setAttribute("value", firstword)
                filter.dispatchEvent(new Event('input', { bubbles: true }))
            }

            // Toggle all pages that aren't a part of the selection just made
            $this.querySelectorAll(".togglePage:not(.has-selection)").forEach(tog => {
                if(!tog.classList.contains("is-toggled")){
                    tog.click()
                }
            })    

            // Mark the user selection so it persists
            const markup = new Mark(lineElem)
                markup.markRanges([{
                    start: baseOffset,
                    length: lengthOfSelection
                }],
                {
                    "className" : "persists"
                })    

            // remove browser's text selection because it is Mark'd
            if (s) undoBrowserSelection(s)

        }

        const e = new CustomEvent("source-text-loaded", {bubbles: true })
        $this.setAttribute("source-text-loaded", "true")
        document.dispatchEvent(e)
        
    }

    static get observedAttributes() { return ['source-uri', 'source-text'] }
}

customElements.define('source-text-selector', WitnessTextSelector)
