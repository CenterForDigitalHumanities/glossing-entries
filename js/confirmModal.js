import { default as utils } from './deer-utils.js'

class ConfirmModal extends HTMLElement {
    template = `
        <style>
            .modal-container {
            display: block;
            position: absolute;
            border: 2px solid var(--color-primary);
            border-radius: .6em;
            padding: 1em;
            width: 25em;
            text-align: center;
            box-shadow: 0em 1em 3em lightgrey;
            z-index: -1;
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
    
        <div class="modal-container">
            <h2>{insert notice to be confirmed here}</h2>
            <button id="Yes">Yes</button>
            <button id="No">No</button>
        </div>

    `
    constructor() {
        super()
    }
}