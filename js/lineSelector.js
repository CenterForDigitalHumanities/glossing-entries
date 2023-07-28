class TpenLineSelector extends HTMLElement {
    template = `
        <style>
           .tpenProjectLines, .selectedLines{
                background-color: orange;
           }
           div[tpen-line-id]{
                display: inline;
           }
        </style>
        <input type="hidden" custom-key="selections" />
        <div class="tpenProjectLines col"></div>
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
        const tpenProjectURI = this.getAttribute("tpen-project")
        if(!tpenProjectURI) return
        fetch(tpenProjectURI)
            .then(response => response.json())
            .then(ms => {
                let allLines = []
                ms.sequences[0].canvases.forEach((canvas, index) => {
                    const pageHeader = document.createElement("h4")
                    pageHeader.setAttribute("tpen-canvas-id", canvas["@id"])
                    pageHeader.innerText = `${canvas.label ?? "No Page Label"} (Page ${index+1})`
                    $this.querySelector(".tpenProjectLines").appendChild(pageHeader)
                    if(canvas?.otherContent[0]?.resources) allLines.concat(canvas.otherContent[0].resources)
                    canvas.otherContent[0].resources.forEach(line => {
                        const lineElem = document.createElement("div")
                        lineElem.setAttribute("title", line["@id"])
                        lineElem.setAttribute("tpen-line-id", line["@id"])
                        lineElem.setAttribute("tpen-image-url", canvas.images[0].resource["@id"])
                        lineElem.setAttribute("tpen-image-fragment", line.on.split("#").pop())
                        lineElem.setAttribute("tpen-line-note", line._tpen_note)
                        lineElem.setAttribute("tpen-line-creator", line._tpen_creator)
                        const txt = line.resource["cnt:chars"] ? line.resource["cnt:chars"] : ""
                        lineElem.innerText = txt
                        if(!txt) lineElem.classList.add("emptyLine")
                        lineElem.onmouseup = function(e) {
                            const s = document.getSelection()
                            const customKey = $this.querySelector("input[custom-key]")
                            const filter = document.querySelector("input[filter]")
                            const selectedText = document.getSelection() ? document.getSelection().toString() : ""
                            const firstword = selectedText.split(" ")[0]
                            if(selectedText){
                                //The filter may not be in the DOM when the user is selecting text.
                                if(filter){
                                    filter.value = firstword
                                    filter.setAttribute("value", firstword)
                                    filter.dispatchEvent(new Event('input', { bubbles: true }))
                                }
                                const textInput = document.querySelector("textarea[custom-text-key='text']")
                                textInput.value = selectedText
                                textInput.$isDirty = true                             
                                let selections = []
                                let linePreviews = []
                                const stopID = document.getSelection().extentNode.parentElement.getAttribute("tpen-line-id")
                                let el = document.getSelection().baseNode.parentElement
                                if(stopID === el.getAttribute("tpen-line-id")){
                                    // The entire selection happened in just this line.  It will not be empty.
                                    selections.push(`${el.getAttribute("tpen-line-id")}#char=${document.getSelection().baseOffset},${document.getSelection().extentOffset}`)
                                    linePreviews.push()
                                }
                                else{
                                    // The selection happened over multiple lines.  We need to make a target out of each line.  There may be empty lines in-between.
                                    if(!el.classList.contains("emptyLine")) selections.push(`${el.getAttribute("tpen-line-id")}#char=${document.getSelection().baseOffset},${el.innerText.length-1}`)
                                    el = el.nextElementSibling
                                    while(el.getAttribute("tpen-line-id") !== stopID){
                                        if(!el.classList.contains("emptyLine")){
                                            selections.push(`${el.getAttribute("tpen-line-id")}#char=0,${el.innerText.length-1}`)
                                        }
                                        el = el.nextElementSibling
                                    }  
                                    if(!el.classList.contains("emptyLine")){
                                        selections.push(`${el.getAttribute("tpen-line-id")}#char=0,${document.getSelection().extentOffset}`)
                                    }
                                }
                                if(customKey.value !== selections.join("__")){
                                    customKey.value = selections.join("__") 
                                    customKey.$isDirty = true
                                    $this.closest("form").$isDirty = true
                                }    
                                console.log("You made the following line selections")
                                console.log(selections)
                            }
                        }
                        $this.querySelector(".tpenProjectLines").appendChild(lineElem)
                    })
                })
                let e = new CustomEvent("tpen-lines-loaded", {bubbles: true })
                document.dispatchEvent(e)
                $this.setAttribute("tpen-lines-loaded", "true")
            })
            .catch(err => {
                console.error(err)
                $this.querySelector(".tpenProjectLines").innerHTML = `<b class="text-error"> Could not get T-PEN project ${tpenProjectURI} </b>`
            })
    }
    static get observedAttributes() { return ['tpen-project'] }
}

customElements.define('tpen-line-selector', TpenLineSelector)
// let witness = 
// {
//     "@context" : "http://purl.org/dc/terms",
//     "@type" : "Text",
//     "additionalType" : "NamedGlossTextualWitness",
//     // TPEN transcription lines will always be plain text
//     "text" : {
//         "language" : "",
//         "format" : "",      
//         "value" : "Value from two different lines"
//     },
//     "shelfmark" : "",
//     "uri" : "",
//     "line_selections" : [
//         "tpen/line/12345#char=0,11",
//         "tpen/line/67890#char=0,5"
//     ],
//     // If it splits a column, you have two depictions
//     "depiction_boundings": ["canvasImage#xywh=minX, minY,(maxX-minX),(maxY-minY)"],
//     // Depiction is supposed to resolve to an Image Resource.  You can use the IIIF Image API pattern, or xywh= in cases of non-IIIF images
//     "metadata" : [],
//     "references": []
// }