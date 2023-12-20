

import { default as utils } from './deer-utils.js'

/**
  * A focused pop up containing the Gloss deer-form, similar to the form on ng.html.
  * It can be included on any HTML page.  It fires events for when the DEER form contained within has been saved.
*/
class ManageGlossModal extends HTMLElement {
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
                width: 20px;
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
                <div class="card">
                    <header>
                        <h4>Gloss Title</h4>
                    </header>
                    <p>Check below for available statuses and actions for this Gloss.</p>
                    <footer>
                        <a class="button" href="#">Review</a>
                        <input type="button" class="button" value="Publish"/>
                        <input type="button" class="button" value="More..."/>
                        <input type="button" class="button" value="Delete"/>
                    </footer>
                    <div class="is-right">
                        <input type="button" class="button closeModal" value="Close"/>
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
        this.open = (glossData) => {
            // TODO esc to close?
            if(!glossData || !glossData["@id"]){
                const ev = new CustomEvent("Cannot manage this gloss")
                UTILS.globalFeedbackBlip(ev, `Cannot open management widget.  No gloss data.`, false)
            }
            const glossID = glossData["@id"]
            const glossTitle = glossData.title
            const published = glossData.published
            const glossText = glossData.text

            const removeBtn = `<input type="button" value="delete" glossid="${glossID}" data-type="named-gloss" class="removeCollectionItem button is-small" title="Delete This Entry">`
            const visibilityBtn = `<input type="button" value="${published ? "unpublish" : "publish"}" class="togglePublic button is-small" glossid="${glossID}" title="Toggle public visibility"/>`
            const moreOptionsBtn = `<input type="button" value="more..." glossid="${glossID}" class="otherModalBtn button is-small" title="See detailed modal for this Gloss">`
            const reviewBtn = `<a class="button is-small" href="ng.html#${glossID}">review</a>`

            $this.querySelector("a").setAttribute("href", `ng.html#${glossID}`)
            $this.querySelector("h4").innerText = glossTitle
            $this.querySelector("p").innerText = glossText
            $this.querySelector("footer").innerHTML = reviewBtn + visibilityBtn + moreOptionsBtn + removeBtn

            $this.querySelector(".closeModal").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()
                $this.close()     
            })                 

            $this.querySelector(".removeCollectionItem").addEventListener('click', ev => {
                addEventListener("globalFeedbackFinished", fin => {
                    ev.target.closest(".window-shadow").classList.add("is-hidden")
                    removeEventListener("globalFeedbackFinished")
                })
                ev.preventDefault()
                ev.stopPropagation()
                const itemID = ev.target.getAttribute("glossid")
                const itemType = ev.target.getAttribute("data-type")
                removeFromCollectionAndDelete(itemID, itemType)
            })

            $this.querySelector(".togglePublic").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()                       
                const uri = ev.target.getAttribute("glossid")
                const included = elem.listCache.has(uri)
                const statusElem = document.querySelector(`.pubStatus[glossid="${uri}"]`)
                ev.target.classList[included ? "remove" : "add"]("is-included")
                elem.listCache[included ? "delete" : "add"](uri)
                if(included){
                    statusElem.innerHTML = "❌"
                    ev.target.value = "publish"
                }
                else{
                    statusElem.innerHTML = "✓"
                    ev.target.value = "unpublish"
                }
                saveList.removeAttribute("disabled")
                const shout = new CustomEvent("Gloss Publication Mark")
                globalFeedbackBlip(shout, `This Gloss is now marked to be ${included ? "removed from" : "added to"} the public list.  Don't forget to submit your changes.`, true)
                //ev.target.closest(".window-shadow").classList.add("is-hidden")
            })

            $this.querySelector(".otherModalBtn").addEventListener('click', ev => {
                 addEventListener("globalFeedbackFinished", fin => {
                    ev.target.closest(".window-shadow").classList.add("is-hidden")
                    removeEventListener("globalFeedbackFinished")
                })
                const shout = new CustomEvent("Other Functionality")
                globalFeedbackBlip(shout, `Other Management Functionality!`, true)
            })

            $this.classList.remove("is-hidden")
        }
    }
}

customElements.define('manage-gloss-modal', ManageGlossModal)
