class TpenLineSelector extends HTMLElement {
    template = `
        <style>
           
        </style>
        <div class="selectedLines"></div>
        <div class="tpenProjectLines"></div>
    `
    constructor() {
        super()
    }
    attributeChangedCallback(name, oldValue, newValue) {
      if(name === "tpen-project"){
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
                ms.sequences[0].canvases.forEach(canvas => {
                    canvas.otherContent[0].resources.forEach(line => {
                        const lineElem = document.createElement("div")
                        lineElem.setAttribute("title", line["@id"])
                        lineElem.setAttribute("tpen-line-id", line["@id"].split("/").pop())
                        lineElem.setAttribute("tpen-line-note", line._tpen_note)
                        lineElem.setAttribute("tpen-line-creator", line._tpen_creator)
                        lineElem.innerText = line.resource["cnt:chars"]
                        lineElem.onmouseup = function(e) {
                            $this.querySelector(".selectedLines").innerText = document.getSelection() ?
                                document.getSelection().toString() : ""
                            const selectedLineElem = document.getSelection().baseNode.parentElement
                        }
                        this.querySelector(".tpenProjectLines").appendChild(lineElem)
                    })
                })
            })
            .catch(err => {
                console.error(err)
                this.querySelector(".tpenProjectLines").innerHTML = `<b class="text-error"> Could not get T-PEN project ${tpenProjectURI} </b>`
            })
    }
    static get observedAttributes() { return ['tpen-project'] }
}

customElements.define('tpen-line-selector', TpenLineSelector)