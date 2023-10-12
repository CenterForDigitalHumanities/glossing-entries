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
                margin-right: 0.25em;
           }
           div[tpen-line-id].emptyLine{
                margin-right: unset;
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
                        lineElem.onmousedown = function(e){
                            if(event.button > 0) return
                            // The green <mark> has to be removed before selection occurs or the range indexes will not line up.
                            let unmarkup = new Mark(".tpenProjectLines")
                            unmarkup.unmark({"className" : "persists"})
                        }
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
            // Only when it's the 'left click' or noted primary button
            if(e.button > 0) return
            const lineElem = e.target.tagName === "MARK" ? e.target.parentElement : e.target
            let s = window.getSelection ? window.getSelection() : document.selection
            // Only if there is an actual text selection
            const selectedText = s.toString() ? s.toString() : ""
            if(!selectedText) return

            // If the users selection contains a <mark>, it is an invalid selection.
            if(s.baseNode.parentElement.tagName === "MARK" || s.extentNode.parentElement.tagName === "MARK"){
                const ev = new CustomEvent("Your selection contained text marked for another selection.  Make a different selection.")
                globalFeedbackBlip(ev, `Your selection contained text marked for another selection.  Make a different selection.`, false)
                //remove browser's text selection
                if (s) {
                    if (s.removeAllRanges) {
                        s.removeAllRanges()
                    } else if (s.empty) {
                        s.empty()
                    }
                }
                return
            }
            // The "page toggle" element needs to know this page contains the selection for the page collapse UI
            $this.querySelectorAll(".togglePage").forEach(tog => tog.classList.remove("has-selection"))
            lineElem.parentElement.previousElementSibling.classList.add("has-selection")
            const customKey = $this.querySelector("input[custom-key='selections']")
            const filter = document.querySelector("input[filter]")
            
            // For each line elem in this selection, get rid of the <mark>.  Then rebuild the selection.
            let selections = []

            const startEl = s.baseNode.parentElement.hasAttribute("tpen-line-id")
                ? s.baseNode.parentElement
                : s.baseNode.parentElement.closest("div[tpen-line-id]")

            const stopEl = s.extentNode.parentElement.hasAttribute("tpen-line-id")
                ? s.extentNode.parentElement
                : s.extentNode.parentElement.closest("div[tpen-line-id]")

            const stopID = stopEl.getAttribute("tpen-line-id")

            let restore_strings = {}
            let unmarkup = new Mark(startEl)

            if(stopID === startEl.getAttribute("tpen-line-id")){
                // The entire selection happened in just this line. unmark then remark after the selection.
                restore_strings[startEl.getAttribute("tpen-line-id")] = []
                // For each thing you want to unmark, grab the text so we can remark it
                for(const mark of startEl.querySelectorAll(".pre-select")){
                    restore_strings[startEl.getAttribute("tpen-line-id")].push(mark.textContent)
                }
                unmarkup.unmark({
                    "className" : "pre-select",
                    "done" : function(){
                        s = window.getSelection ? window.getSelection() : document.selection
                    }
                })
            }
            else{
                // The selection happened over multiple lines.  Unmark in each line, then re mark
                unmarkup = new Mark(startEl)
                unmarkup.unmark({"className" : "pre-select"})
                let nextEl = startEl.nextElementSibling
                while(nextEl.getAttribute("tpen-line-id") !== stopID){
                    if(nextEl.nextElementSibling){
                        nextEl = nextEl.nextElementSibling
                    }
                    else{
                        //We are at the end of a page and are going on to the next page.  Get to the next page element and get the first line element.
                        nextEl = nextEl.closest(".pageContainer").nextElementSibling.nextElementSibling.nextElementSibling.firstChild
                    }
                    unmarkup = new Mark(nextEl)
                    unmarkup.unmark({"className" : "pre-select"})
                }  
                unmarkup = new Mark(stopEl)
                unmarkup.unmark({
                    "className" : "pre-select",
                    "done" : function(){
                        s = window.getSelection ? window.getSelection() : document.selection
                    }
                })
            }

            // Now build the selection
            const baseOffset = s.baseOffset
            const extentOffset =  s.extentOffset
            if(stopID === startEl.getAttribute("tpen-line-id")){
                // The entire selection happened in just this line.  It will not be empty.
                selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=${baseOffset},${extentOffset-1}`)
            }
            else{
                // The selection happened over multiple lines.  We need to make a target out of each line.  There may be empty lines in-between.
                if(!startEl.classList.contains("emptyLine")) selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=${baseOffset},${startEl.textContent.length-1}`)
                startEl = startEl.nextElementSibling
                while(startEl.getAttribute("tpen-line-id") !== stopID){
                    if(!startEl.classList.contains("emptyLine")){
                        selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=0,${startEl.textContent.length-1}`)
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
                    selections.push(`${startEl.getAttribute("tpen-project-line-id")}#char=0,${extentOffset-1}`)
                }
            }

            
            const firstword = selectedText.trim().split(" ")[0]
            // The filter may not be in the DOM when the user is selecting text.
            if(ngCollectionList.hasAttribute("ng-list-loaded")){
                filter.value = firstword
                filter.setAttribute("value", firstword)
                filter.dispatchEvent(new Event('input', { bubbles: true }))
            }

            const textInput = document.querySelector("textarea[custom-text-key='text']")
            textInput.setAttribute("value", selectedText.trim())
            textInput.value = selectedText.trim()
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
            selections.forEach(line => {
                try{
                    let lineid = line.split("#")[0]
                    let selection = line.split("#")[1].replace("char=", "").split(",").map(num => parseInt(num))
                    const lineElem = document.querySelector(`div[tpen-project-line-id="${lineid}"]`)
                    const textLength = lineElem.textContent.length
                    const lengthOfSelection = (selection[0] === selection[1]) 
                        ? 1
                        : (selection[1] - selection[0]) + 1
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

            // restore the marks that were there before the user did the selection
            for(const lineid in restore_strings){
                const restoreMarkElem = document.querySelector(`div[tpen-line-id="${lineid}"]`)
                const markit = new Mark(restoreMarkElem)
                const strings = restore_strings[lineid]
                strings.forEach(str => {
                    markit.mark(str, {
                        diacritics : true,
                        separateWordSearch : false,
                        className : "pre-select",
                        acrossElements : true,
                        accuracy: "exactly"
                    })    
                })
            }
        }
    }
    static get observedAttributes() { return ['tpen-project'] }

}

customElements.define('tpen-line-selector', TpenLineSelector)
