import { default as utils } from './deer-utils.js'

/**
 * Custom HTML element `<witness-modal>` provides a pop-up modal for displaying gloss appearances.
 * It's designed for easy embedding in any HTML page, allowing interactive exploration of gloss details.
 *
 * Usage:
 * - Add `<witness-modal></witness-modal>` to your HTML for gloss interactions.
 * - Use the embedded DEER form for detailed gloss interactions.
 */
class WitnessModal extends HTMLElement {
    template = `
        <style>
            witness-modal{
                position: absolute;
                display: block;
                top: 1em;
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
            .modal{
                position: relative;
                top: 3em;
            }
            .close{
                position: absolute;
                top: 0.5em;
                right: 2em;
                cursor: pointer;
                text-decoration: underline;
            }
            .appearancesList li {
                display: inline-block;
                vertical-align: top;
                padding: 0em 1em;
                cursor: pointer;
                color: var(--color-primary);
            }
        </style>
        <div class="window-shadow"> 
            <div class="modal container">
                <div class="card">
                    <header>
                      <h4>Gloss Appearances Throughout Text</h4>
                      <div class="is-right close"> Close </div>
                    </header>
                    <p>
                        This Gloss can appear multiple times in the same text.  Select an appearance to view its details.
                    </p>
                    <ul class="appearancesList">

                    </ul
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
        /**
         * Hide or show the modal (no animation).
         * Fire an event for whether the modal is hidden or visiable.
         */ 
        $this.toggleModal = function(){
            let blip = new CustomEvent("Blip")
            const modal = document.querySelector("witness-modal")
            const action = modal.classList.contains("is-hidden") ? "remove" : "add"
            modal.classList[action]("is-hidden")
            const ev = (action === "add") ? "hidden" : "visible"
            utils.broadcast(undefined,`witness-modal-${ev}`, modal, {})
        } 

        $this.querySelector(".close").addEventListener("click", $this.toggleModal)
    }
}

customElements.define('witness-modal', WitnessModal)
