/**
  * Process a T-PEN Manifest URI (Presentation API 2.1 only) for its transcription text.
  * Generate the UI around canvases (pages) and text (lines) so that a user can select text.
  * Store that text selection as a URI Fragment using #char.  It may be an array that spans multiple lines.
*/
class WitnessTextSelector extends HTMLElement {
    template = `
        <style>
            witness-text-selector{
                position: relative;
                display: block;
            }
           .witnessText{
                background-color: orange;
                word-break: break-word;
           }
           div[witness-text-id]{
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
      if((name === "witness-uri" || name === "witness-text") && newValue && oldValue !== newValue){
        this.connectedCallback(name)
      }
    }
    async connectedCallback(which) {
        this.innerHTML = this.template
        const $this = this
        const witnessURI = this.getAttribute("witness-uri")
        const witnessText = this.getAttribute("witness-text")
        if(!witnessURI && !witnessText) return

        const customKey = this.querySelector("input[custom-key='selections']")
        const witnessTextElem = this.querySelector(".witnessText")
        let textForUI = witnessText
        
        if(which === "witness-uri"){
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
                const e = new CustomEvent("witness-text-error", {bubbles: true })
                $this.setAttribute("witness-text-error", "true")
                document.dispatchEvent(e)
                return ""
            })    
        }
        
        // Treat it as plain text
        const plaintext = document.createElement("div")
        let just_text = ""
        // Newlines (/r and /n) result in <br> separations when doing elem.innerText.  This makes it more difficult to do Selection selectors.
        just_text = textForUI.replace(/(\r\n|\n|\r)/gm, "")
        plaintext.innerText = just_text
        witnessTextElem.appendChild(plaintext)

        plaintext.onmouseup = function(e) {
            const s = document.getSelection()
            const filter = document.querySelector("input[filter]")
            const selectedText = document.getSelection() ? document.getSelection().toString() : ""
            const firstword = selectedText.split(" ")[0]
            let selections = []
            if(selectedText){
                // The filter may not be in the DOM when the user is selecting text.
                // Only use the filter if it is !.is-hidden
                selections.push(`${selectedText}#char=${document.getSelection().baseOffset},${document.getSelection().extentOffset}`)
                if(filter && !filter.classList.contains("is-hidden")){
                    filter.value = firstword
                    filter.setAttribute("value", firstword)
                    filter.dispatchEvent(new Event('input', { bubbles: true }))
                }

                const textInput = document.querySelector("textarea[custom-text-key='text']")
                textInput.setAttribute("value", selectedText)
                textInput.value = selectedText
                textInput.dispatchEvent(new Event('input', { bubbles: true }))

                let witnessLabel = selectedText.slice(0, 16)
                const labelElem = document.querySelector("input[deer-key='label']")
                const shelfmark = document.querySelector("input[deer-key='identifier']").value
                // Generate a programmatic label
                if(witnessLabel){
                    if(shelfmark){
                        witnessLabel += `...(${shelfmark})`
                    }
                    else{
                        witnessLabel += `...(${Date.now()})`
                    }    
                    if(labelElem.value !== witnessLabel){
                        labelElem.value = witnessLabel
                        labelElem.setAttribute("value", witnessLabel)
                        labelElem.dispatchEvent(new Event('input', { bubbles: true }))
                    }
                }
                else{
                   // A side effect of this is that a label cannot be unset by a typical DEER form update.
                   labelElem.value = "" 
                   labelElem.setAttribute("value", "")
                   labelElem.$isDirty = false
                }     
                if(customKey.value !== selectedText){
                    customKey.value = selections.join("__")
                    customKey.$isDirty = true
                    $this.closest("form").$isDirty = true
                }               
                console.log("You made the following text selection")
                console.log(selections)
            }
        }
        const e = new CustomEvent("witness-text-loaded", {bubbles: true })
        $this.setAttribute("witness-text-loaded", "true")
        document.dispatchEvent(e)
        
    }
    static get observedAttributes() { return ['witness-uri', 'witness-text'] }
}

customElements.define('witness-text-selector', WitnessTextSelector)
