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
           .witnessText, .selectedLines{
                background-color: orange;
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
      if(name === "witness-uri" && newValue && oldValue !== newValue){
        this.connectedCallback()
      }
    }
    connectedCallback() {
        this.innerHTML = this.template
        const $this = this
        const witnessURI = this.getAttribute("witness-uri")
        if(!witnessURI) return
        this.querySelector("div.toggle").addEventListener("click", event => {
            const container = event.target.nextElementSibling
            if(container.classList.contains("is-toggled")) {
                event.target.innerHTML = "&#9660;"
                event.target.classList.remove("is-toggled")
                container.classList.remove("is-toggled")
            }
            else{
                event.target.innerHTML = "&#9664;"
                event.target.classList.add("is-toggled")
                container.classList.add("is-toggled")
            }
        })
        fetch(witnessURI)
            .then(response => response.json())
            .then(ms => {
                let allLines = []
                const witnessText = $this.querySelector(".witnessText")
                ms.sequences[0].canvases.forEach((canvas, index) => {
                    const pageContainer = document.createElement("div")
                    pageContainer.classList.add("pageContainer")
                    const pageHeader = document.createElement("h4")
                    const pageToggle = document.createElement("div")
                    pageToggle.classList.add("togglePage")
                    pageToggle.setAttribute("title", "Collapse this page")
                    pageToggle.addEventListener("click", event => {
                        const container = event.target.nextElementSibling
                        if(container.classList.contains("is-toggled")) {
                            event.target.innerHTML = "&#9660;"
                            event.target.classList.remove("is-toggled")
                            container.classList.remove("is-toggled")
                        }
                        else{
                            event.target.innerHTML = "&#9664;"
                            event.target.classList.add("is-toggled")
                            container.classList.add("is-toggled")
                        }
                    })
                    pageToggle.innerHTML = `&#9660;`
                    pageHeader.setAttribute("tpen-canvas-id", canvas["@id"])
                    pageHeader.innerText = `${canvas.label ?? "No Page Label"} (Page ${index+1})`
                    witnessText.appendChild(pageHeader)
                    witnessText.appendChild(pageToggle)
                    if(canvas?.otherContent[0]?.resources) allLines.concat(canvas.otherContent[0].resources)
                    canvas.otherContent[0].resources.forEach(line => {
                        const lineElem = document.createElement("div")
                        lineElem.setAttribute("title", line["@id"])
                        lineElem.setAttribute("witness-text-id", line["@id"])
                        lineElem.setAttribute("tpen-image-url", canvas.images[0].resource["@id"])
                        lineElem.setAttribute("tpen-image-fragment", line.on.split("#").pop())
                        lineElem.setAttribute("witness-text-note", line._tpen_note)
                        lineElem.setAttribute("witness-text-creator", line._tpen_creator)
                        const txt = line.resource["cnt:chars"] ? line.resource["cnt:chars"] : ""
                        lineElem.innerText = txt
                        if(!txt) lineElem.classList.add("emptyLine")
                        lineElem.onmouseup = function(e) {
                            const s = document.getSelection()
                            const customKey = $this.querySelector("input[custom-key='selections']")
                            const filter = document.querySelector("input[filter]")
                            const selectedText = document.getSelection() ? document.getSelection().toString().trim() : ""
                            const firstword = selectedText.split(" ")[0]
                            if(selectedText){
                                // The filter may not be in the DOM when the user is selecting text.
                                // Only use the filter if it is !.is-hidden
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
                                let selections = []
                                let linePreviews = []
                                const stopID = document.getSelection().extentNode.parentElement.getAttribute("witness-text-id")
                                let el = document.getSelection().baseNode.parentElement
                                let stopEl = document.getSelection().extentNode.parentElement
                                $this.querySelectorAll(".togglePage").forEach(tog => tog.classList.remove("has-selection"))
                                el.parentElement.previousElementSibling.classList.add("has-selection")
                                stopEl.parentElement.previousElementSibling.classList.add("has-selection")
                                if(stopID === el.getAttribute("witness-text-id")){
                                    // The entire selection happened in just this line.  It will not be empty.
                                    selections.push(`${el.getAttribute("witness-text-id")}#char=${document.getSelection().baseOffset},${document.getSelection().extentOffset}`)
                                    linePreviews.push()
                                }
                                else{
                                    // The selection happened over multiple lines.  We need to make a target out of each line.  There may be empty lines in-between.
                                    if(!el.classList.contains("emptyLine")) selections.push(`${el.getAttribute("witness-text-id")}#char=${document.getSelection().baseOffset},${el.innerText.length-1}`)
                                    el = el.nextElementSibling
                                    while(el.getAttribute("witness-text-id") !== stopID){
                                        if(!el.classList.contains("emptyLine")){
                                            selections.push(`${el.getAttribute("witness-text-id")}#char=0,${el.innerText.length-1}`)
                                        }
                                        if(el.nextElementSibling){
                                            el = el.nextElementSibling    
                                        }
                                        else{
                                            //We are at the end of a page and are going on to the next page.  Get to the next page and get the firtst line
                                            el = el.parentElement.nextElementSibling.nextElementSibling.nextElementSibling.firstChild
                                        }
                                    }  
                                    if(!el.classList.contains("emptyLine")){
                                        selections.push(`${el.getAttribute("witness-text-id")}#char=0,${document.getSelection().extentOffset}`)
                                    }
                                }
                                if(customKey.value !== selections.join("__")){
                                    customKey.value = selections.join("__") 
                                    customKey.$isDirty = true
                                    $this.closest("form").$isDirty = true
                                }
                                $this.querySelectorAll(".togglePage:not(.has-selection)").forEach(tog => {
                                    if(!tog.classList.contains("is-toggled")){
                                        tog.click()
                                    }
                                })    
                                console.log("You made the following line selections")
                                console.log(selections)
                            }
                        }
                        pageContainer.appendChild(lineElem)
                    })
                    witnessText.appendChild(pageContainer)
                })
                const e = new CustomEvent("witness-texts-loaded", {bubbles: true })
                document.dispatchEvent(e)
                $this.setAttribute("witness-texts-loaded", "true")
            })
            .catch(err => {
                console.error(err)
                witnessText.innerHTML = `<b class="text-error"> Could not get T-PEN project ${witnessURI} </b>`
            })
    }
    static get observedAttributes() { return ['witness-uri'] }
}

customElements.define('witness-text-selector', WitnessTextSelector)
