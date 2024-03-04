import { default as utils } from './deer-utils.js'

/**
  * A focused pop up for confirming or denying a choice.
  * This can be included on any HTML page.  This appears when a user attempts to do something such as deleting a gloss.
*/

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
                font-size: 1.5em;
            }
        </style>
        <div id="confirm-full">
            <div id="confirm-dialog">
                <div id="confirm-message-container">
                    <p id="confirm-message"></p>
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