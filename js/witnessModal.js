import { default as utils } from './deer-utils.js'

/**
 * A custom HTML element `<witness-modal>` that provides a focused pop-up modal containing the Gloss form.
 * This modal is designed to be embedded in any HTML page and can interactively display details about multiple appearances of a gloss in a text.
 *
 * CSS Styling:
 * - The modal and its components (such as the close button and appearance list) are styled for visibility and interactivity.
 * - Background dimming is implemented to focus user attention on the modal content.
 *
 * Functionality:
 * - The modal can be toggled to show or hide based on user interactions, such as clicking the close button.
 * - Custom events are dispatched to signal the modal's visibility state to any listeners within the application.
 *
 * Usage:
 * - Place this element within an HTML document where you need to provide interactive details about gloss appearances.
 * - Utilize the embedded DEER form for detailed gloss interactions.
 *
 * Methods:
 * - `connectedCallback()`: Initializes the modal's HTML content and sets up event listeners for the close button.
 * - `toggleModal()`: Toggles the visibility of the modal and dispatches events based on the visibility state.
 *
 * Events:
 * - `witness-modal-hidden`: Fired when the modal is hidden.
 * - `witness-modal-visible`: Fired when the modal is visible.
 *
 * Example:
 * - To use this modal, simply add `<witness-modal></witness-modal>` to your HTML and interact with it through the provided API.
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
