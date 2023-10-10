//import "/js/mark.min.js"
/**
  * Process a T-PEN Manifest URI (Presentation API 2.1 only) for its transcription text.
  * Generate the UI around canvases (pages) and text (lines) so that a user can select text.
  * Store that text selection as a URI Fragment using #char.  It may be an array that spans multiple lines.
*/
class TpenLineSelector extends HTMLElement {
    template = `
        <style>
            tpen-line-selector{
                position: relative;
                display: block;
            }
           .tpenProjectLines{
                padding: 1em;
                box-shadow: -0.25em 0.25em 0.75em rgba(0,0,0,.5);
                word-break: break-word;
                margin-top: 1em;
            }
            .tpenProjectLines.no-select{
                user-select: none;
            }
            .serifText {
               font-family: "Eczar","Volkhov",serif !important;
           }
           div[tpen-line-id]{
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
           .tpenProjectLines.is-toggled{
                visibility: hidden;
                height: 0px;
           }
           .persists{
                background-color : var(--color-success);
           }
        </style>

        <h2 class="nomargin"> Select T-PEN Transcription Text </h2>
        <small class="cachedNotice text-primary"> Text highlighted yellow is already attached to a Gloss in the list.  Text highlighted green is the text selection of the identified Gloss text. </small>
        <input type="hidden" custom-key="selections" />
        <div title="Collapse Transcription Area" class="toggle is-hidden">&#9660;</div>
        <div class="tpenProjectLines col serifText"></div>
    `
    constructor() {
        super()
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if(name === "tpen-project" && newValue && oldValue !== newValue){
        this.connectedCallback()
      }
    }
    connectedCallback() {
        this.innerHTML = this.template
        const $this = this
        const tpenProjectURI = this.getAttribute("tpen-project") ? decodeURIComponent(this.getAttribute("tpen-project")) : null
        const tpenProjectLines = this.querySelector(".tpenProjectLines")
        if(!tpenProjectURI) return
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
        fetch(tpenProjectURI)
            .then(response => response.json())
            .then(ms => {
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
                    tpenProjectLines.appendChild(pageHeader)
                    tpenProjectLines.appendChild(pageToggle)
                    canvas.otherContent[0].resources.forEach(line => {
                        const lineElem = document.createElement("div")
                        const projectLineID = line["@id"].replace("/TPEN/", `/TPEN/project/${tpenProjectURI.split("/").pop()}/`)
                        lineElem.setAttribute("title", line["@id"])
                        lineElem.setAttribute("tpen-line-id", line["@id"])
                        lineElem.setAttribute("tpen-project-line-id", projectLineID)
                        lineElem.setAttribute("tpen-image-url", canvas.images[0].resource["@id"])
                        lineElem.setAttribute("tpen-image-fragment", line.on.split("#").pop())
                        lineElem.setAttribute("tpen-line-note", line._tpen_note)
                        lineElem.setAttribute("tpen-line-creator", line._tpen_creator)
                        const txt = line.resource["cnt:chars"] ? line.resource["cnt:chars"] : ""
                        lineElem.innerText = txt
                        if(!txt) lineElem.classList.add("emptyLine")
                        lineElem.onmouseup = captureSelectedText
                        pageContainer.appendChild(lineElem)
                    })
                    tpenProjectLines.appendChild(pageContainer)
                })
                const e = new CustomEvent("tpen-lines-loaded", {bubbles: true })
                $this.setAttribute("tpen-lines-loaded", "true")
                document.dispatchEvent(e)
            })
            .catch(err => {
                console.error(err)
                const e = new CustomEvent("tpen-lines-error", {bubbles: true })
                $this.setAttribute("tpen-lines-error", "true")
                document.dispatchEvent(e)
            })

        function captureSelectedText(e){
            const s = window.getSelection ? window.getSelection() : document.selection
            const customKey = $this.querySelector("input[custom-key='selections']")
            const filter = document.querySelector("input[filter]")
            const selectedText = s?.toString().trim() ?? ""
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

                let startEl = s.baseNode.parentElement.hasAttribute("tpen-line-id")
                    ? s.baseNode.parentElement
                    : s.extentNode.parentElement.closest("div[tpen-line-id]")

                let stopEl = s.extentNode.parentElement.hasAttribute("tpen-line-id")
                    ? s.extentNode.parentElement
                    : s.extentNode.parentElement.closest("div[tpen-line-id]")
    
                const stopID = stopEl.getAttribute("tpen-line-id")
                const baseOffset = s.baseOffset
                const extentOffset =  s.extentOffset
                $this.querySelectorAll(".togglePage").forEach(tog => tog.classList.remove("has-selection"))
                startEl.parentElement.previousElementSibling.classList.add("has-selection")
                stopEl.parentElement.previousElementSibling.classList.add("has-selection")

                if(stopID === startEl.getAttribute("tpen-line-id")){
                    // The entire selection happened in just this line.  It will not be empty.
                    selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=${baseOffset},${extentOffset}`)
                    linePreviews.push()
                }
                else{
                    // The selection happened over multiple lines.  We need to make a target out of each line.  There may be empty lines in-between.
                    if(!startEl.classList.contains("emptyLine")) selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=${baseOffset},${startEl.innerText.length-1}`)
                    startEl = startEl.nextElementSibling
                    while(startEl.getAttribute("tpen-line-id") !== stopID){
                        if(!startEl.classList.contains("emptyLine")){
                            selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=0,${startEl.innerText.length-1}`)
                        }
                        if(startEl.nextElementSibling){
                            startEl = startEl.nextElementSibling    
                        }
                        else{
                            //We are at the end of a page and are going on to the next page.  Get to the next page element and get the first line element.
                            startEl = startEl.closest(".pageContainer").nextElementSibling.nextElementSibling.nextElementSibling.firstChild
                        }
                    }  
                    if(!startEl.classList.contains("emptyLine")){
                        selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=0,${extentOffset}`)
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
                // Now highlight the lines for persistence
                let unmarkup = new Mark(".tpenProjectLines")
                unmarkup.unmark({"className" : "persists"})
                selections.forEach(line => {
                    try{
                        let lineid = line.split("#")[0]
                        let selection = line.split("#")[1].replace("char=", "").split(",").map(num => parseInt(num))
                        const lineElem = document.querySelector(`div[tpen-project-line-id="${lineid}"]`)
                        const textLength = lineElem.innerText.length
                        const lengthOfSelection = (textLength === selection[1]+1) 
                            ? (selection[1] - selection[0]) + 1
                            : (selection[1] - selection[0])
                        let markup = new Mark(lineElem)
                        markup.markRanges([{
                            start: selection[0],
                            length: lengthOfSelection
                        }],
                        {
                            "className" : "persists"
                        })     
                    }
                    catch(err){
                        console.error(err)
                    }
                })
                //remove browser's text selection because now they are Mark'd
                if (s) {
                    if (s.removeAllRanges) {
                        s.removeAllRanges()
                    } else if (s.empty) {
                        s.empty()
                    }
                }
            }
        }
    }
    static get observedAttributes() { return ['tpen-project'] }

}

customElements.define('tpen-line-selector', TpenLineSelector)
