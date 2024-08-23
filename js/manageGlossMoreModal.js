import { default as deerUtils } from './deer-utils.js'

/**
  * A focused pop up containing extra management options for a Gloss..
  * Specifically designed for manage-glosses.html
*/
class ManageGlossMoreModal extends HTMLElement {
    template = `
        <style>
            small{
                display: block;
            }
            .button.is-small{
                padding: 0.4em;
                font-size: 0.95em;
            }
            .pubStatus{
                display: inline-block;
                position: relative;
                width: 1.75em;
                text-align: center;
                cursor: default;
            }
            input[filter="title"]{
                border: 2px solid var(--color-primary);
            }
            .manageModal{
                position: relative;
                display: block;
                top: 15vh;
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
        </style>

        <div class="window-shadow"> 
            <div class="manageModal container">
                <div class="card" id="mainModalContainer">
                    <div id="manageTags">
                        <header>
                            <h4>Gloss Tags</h4>
                        </header>
                        <p>Here you can choose to approve or reject the Gloss's tags for inclusion in TPEN's list of all Gloss tags.</p>
                        <p class="glossContent"></p>
                        <footer>
                            <a class="button" href="#">Review</a>
                            <p></p>
                            <input type="button" class="button" value="Approve"/>
                            <input type="button" class="button" value="Reject"/>
                        </footer>
                        <div class="is-right">
                            <input type="button" class="button closeModal" value="Close"/>
                        </div>
                    </div>
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
        this.close = () => {
            $this.classList.add("is-hidden")
        }

        // Create the modal dynamically from the chosen glosses data, provided as the parameter here.
        this.open = (glossData) => {
            // TODO esc to close?
            if(!glossData || !glossData["@id"]){
                const ev = new CustomEvent("Cannot manage this gloss")
                deerUtils.globalFeedbackBlip(ev, `Please wait for this Gloss to load.`, false)
                return
            }
            const glossID = glossData["@id"].replace(/^https?:/, 'https:')
            const published = glossData.published
            const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
            const fullGlossData = cachedFilterableEntities.get(glossID)

            const approveButton = `<input type="button" value="${"approve"}" class="approveCollection button success is-small" glossid="${glossID}" title="Add all tags to public list"/>`
            const rejectBtn = `<input type="button" value="reject" glossid="${glossID}" data-type="named-gloss" class="removeCollectionItem button error is-small" title="Remove all tags from public list">`

            $this.querySelector("a").setAttribute("href", `ng.html#${glossID}`)
            $this.querySelector("h4").innerText = "Manage Tags"
            $this.querySelector("p.glossContent").innerText = fullGlossData.tags?.value?.items.join(", ") ?? "No tags"
            $this.querySelector("footer").innerHTML = approveButton + rejectBtn

            // 'Close' functionality
            $this.querySelector(".closeModal").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()
                $this.close()     
            })                 

            // 'reject' functionality
            $this.querySelector(".removeCollectionItem").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()
                const fn = () => {
                    $this.classList.add("is-hidden")
                    removeEventListener("globalFeedbackFinished", fn)
                }
                addEventListener("globalFeedbackFinished", fn)

                // TODO: call some function here
            })

            // 'approve' functionality
            $this.querySelector(".approveCollection").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()                       
                
                // TODO: call some function here
            })

            $this.classList.remove("is-hidden")
        }
    }
}

addEventListener('deer-view-rendered', event => {
    console.log("test")
    console.log(event)
})

customElements.define('manage-gloss-more-modal', ManageGlossMoreModal)