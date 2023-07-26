class TpenLineSelector extends HTMLElement {
    template = `
        <style>
           .tpenProjectLines, .selectedLines{
                background-color: orange;
           }
        </style>
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
                ms.sequences[0].canvases.forEach((canvas, index) => {
                    const pageHeader = document.createElement("h4")
                    pageHeader.setAttribute("tpen-canvas-id", canvas["@id"])
                    pageHeader.innerText = `${canvas.label ?? "No Page Label"} (Page ${index+1})`
                    $this.querySelector(".tpenProjectLines").appendChild(pageHeader)
                    canvas.otherContent[0].resources.forEach(line => {
                        const lineElem = document.createElement("div")
                        lineElem.setAttribute("title", line["@id"])
                        lineElem.setAttribute("tpen-line-id", line["@id"])
                        lineElem.setAttribute("tpen-line-note", line._tpen_note)
                        lineElem.setAttribute("tpen-line-creator", line._tpen_creator)
                        const txt = line.resource["cnt:chars"] ? line.resource["cnt:chars"] : ""
                        lineElem.innerText = txt
                        if(!txt) lineElem.classList.add("emptyLine")
                        lineElem.onmouseup = function(e) {
                            const s = document.getSelection()
                            const filter = document.querySelector('input[filter]')
                            const selectedText = document.getSelection() ? document.getSelection().toString() : ""
                            const firstword = selectedText.split(" ")[0]
                            filter.value = firstword
                            filter.setAttribute("value", firstword)
                            filter.dispatchEvent(new Event('input', { bubbles: true }))
                            if(selectedText){
                                let witness = {
                                    "@context" : "http://purl.org/dc/terms",
                                    "@type" : "Text",
                                    "additionalType" : "NamedGlossTextualWitness",
                                    "text" : "",
                                    "shelfmark" : "",
                                    "uri" : "",
                                    "depiction" : "",
                                    "language" : "",
                                    "metadata" : [],
                                    "selections" : []
                                }
                                const stopID = document.getSelection().extentNode.parentElement.getAttribute("tpen-line-id")
                                let el = document.getSelection().baseNode.parentElement
                                if(stopID === el.getAttribute("tpen-line-id")){
                                    // The entire selection happened in just this line.  It will not be empty.
                                    witness.selections.push(`${el.getAttribute("tpen-line-id")}#char=${document.getSelection().baseOffset},${document.getSelection().extentOffset}`)
                                }
                                else{
                                    // The selection happened over multiple lines.  We need to make a target out of each line.  There may be empty lines in-between.
                                    if(!el.classList.contains("emptyLine")) witness.selections.push(`${el.getAttribute("tpen-line-id")}#char=${document.getSelection().baseOffset},${el.innerText.length-1}`)
                                    el = el.nextElementSibling
                                    while(el.getAttribute("tpen-line-id") !== stopID){
                                        if(!el.classList.contains("emptyLine")){
                                            witness.selections.push(`${el.getAttribute("tpen-line-id")}#char=0,${el.innerText.length-1}`)
                                        }
                                        el = el.nextElementSibling
                                    }  
                                    if(!el.classList.contains("emptyLine")){
                                        witness.selections.push(`${el.getAttribute("tpen-line-id")}#char=0,${document.getSelection().extentOffset}`)
                                    }
                                }
                                console.log(witness)
                            }
                        }
                        $this.querySelector(".tpenProjectLines").appendChild(lineElem)
                    })
                })
            })
            .catch(err => {
                console.error(err)
                $this.querySelector(".tpenProjectLines").innerHTML = `<b class="text-error"> Could not get T-PEN project ${tpenProjectURI} </b>`
            })
    }
    static get observedAttributes() { return ['tpen-project'] }
}

customElements.define('tpen-line-selector', TpenLineSelector)