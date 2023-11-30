import { default as utils } from './deer-utils.js'

class ConfirmModal extends HTMLElement {
    template = `
        <style>
            #confirm-full {
                height: 100%;
                width: 100%;
                top: 0;
                left: 0;
                position: fixed;
                background-color: rgba(0,0,0,0.5);
                z-index: 4;
            }

            #confirm-dialog {
                background: white;
                border: 2px solid var(--color-primary);
                border-radius: .6em;
                padding: 1em;
                width: 25em;
                text-align: center;
                box-shadow: 0px 8px 16px -6px rgba(0,0,0,0.54);
                z-index: 5;
                margin: auto;
                position: fixed;
                top: 25%;
                right: 25%;
                left: 25%;
            }
            .confirmButton {
                color: #fff;
                background-color: var(--color-primary);
                border: 1px solid transparent;
                padding: .75em;
                width: 5em;
                border-radius: .5em;
                font-weight: bold;
                margin-top: .5em;
            }
            #confirm-message {
                color: var(--color-primary);
                font-weight: bold;
            }
        </style>

        <div id="confirm-full">
            <div id="confirm-dialog">
                <div id="confirm-message-container">
                    <h2 id="confirm-message"></h2>
                </div>
                <div class="confirm-buttons">
                    <button id="confirmOK" class="confirmButton">OK</button>
                    <button id="confirmCancel" class="confirmButton">Cancel</button>
                </div>
            </div>
        </div>
    `
    constructor() {
        super()
    }

    connectedCallback() {
        this.innerHTML = this.template
    }
   
}

customElements.define('confirm-modal', ConfirmModal)