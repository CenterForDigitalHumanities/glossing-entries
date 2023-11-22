import { default as utils } from './deer-utils.js'

class ConfirmModal extends HTMLDialogElement {
    template = `
        <style>
            .confirm-dialog {
            display: block;
            position: absolute;
            border: 2px solid var(--color-primary);
            border-radius: .6em;
            padding: 1em;
            width: 25em;
            text-align: center;
            box-shadow: 0em 1em 3em lightgrey;
            z-index: 5;
            }
            button {
            color: #fff;
            background-color: var(--color-primary);
            border: 1px solid transparent;
            padding: .75em;
            width: 5em;
            border-radius: .5em;
            font-weight: bold;
            cursor: pointer;
            }
        </style>
    
        <dialog id="confirm-dialog">
            <form method="dialog">
                <div id="confirm-message">

                </div>
                <div class="confirm-buttons">
                    <button value="ok" id="confirmOK">OK</button>
                    <button value="cancel" id="confirmCancel">Cancel</button>
                </div>
            </form>
        </dialog>

    `
    constructor() {
        super()
    }

    confirmation(message) {
        let userChoice = null

        let dialog = document.getElementById("confirm-dialog") // grab the hidden confirm dialog box

        let dialogMessage = document.getElementById("confirm-message")
        let h2 = document.createElement("h2") /// create and add custom message to confirm box
        h2.textContent = message
        dialogMessage.appendChild(h2)

        dialog.showModal() // show the confirm box

        document.getElementById("confirmOK").onclick = function() {
            userChoice = true
            dialog.close()
        }

        document.getElementById("confirmCancel").onclick = function() {
            userChoice = false
            dialog.close()
        }

        return userChoice
    }
    
}

customElements.define('confirm-modal', ConfirmModal)