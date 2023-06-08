class GlossFooter extends HTMLElement {
    template = `
    <footer>
    <a href="./index.html">🏠</a>
        <a href="./manuscripts.html">📚</a>
        <a href="./named-glosses.html">📑</a>
        <a rel="noopener noreferrer" title="View on GitHub"
            href="https://github.com/CenterForDigitalHumanities/glossing-entries" target="_blank">
            <svg height="16" class="octicon octicon-mark-github" viewBox="0 0 16 16" version="1.1" width="16"
                aria-hidden="true">
                <path fill-rule="evenodd"
                    d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z">
                </path>
            </svg>
        </a>
    </footer>
    `
    constructor() {
        super()
    }

    connectedCallback() {
        this.innerHTML = this.template
    }
}
customElements.define('gog-footer', GlossFooter)

class GlossHeader extends HTMLElement {
    #template = new DOMParser().parseFromString(`<template id="headerTemplate">
    <header>
    <link rel="stylesheet" href="css/gloss.css">
    <button is="auth-button" disabled="true">login</button>
    <img src="media/gog-logo.jpg" alt="banner">
    <a href="/"><h1 class="title">
        Gallery of Glosses
    </h1></a>
    <div class="tabs">
    <slot name="tabs">
    <style>
        :host {
            --bg-color: hsl(0, 0%, 100%);
            --bg-secondary-color: hsl(240, 14%, 96%);
            --color-primary: hsl(215 35% 50%);
            --color-accent: hsl(12.75deg 80% 40%);
            --color-lightGrey: hsl(218, 14%, 85%);
            --color-grey: hsl(231, 5%, 48%);
            --color-darkGrey: hsl(216, 4%, 26%);
            --color-error: hsl(0, 64%, 53%);
            --color-success: hsl(113, 81%, 41%);
            --grid-maxWidth: 120rem;
            --grid-gutter: 2rem;
            --font-size: 1.6rem;
        }
        ::slotted(a), slot a{
            border-bottom: 2px solid var(--color-lightGrey);
            background-color: var(--bg-color);
            color: var(--color-darkGrey);
            -ms-flex: 0 1 auto;
            flex: 0 1 auto;
            padding: 1rem 2rem;
            text-align: center;
            text-decoration: none;
            font-family: 'Eczar',serif;
            white-space: nowrap;
            color: var(--color-primary);
            transition: all .2s;
        }
        ::slotted(a:hover), slot a:hover {
            color: var(--color-accent)!important;
            background-color: var(--bg-secondary-color);
            border-bottom: 2px solid var(--color-darkGrey);
            border-color: var(--color-accent);
            opacity: 1;
        }
    </style>
        <a href="./named-glosses.html">✏️ Named Glosses</a>
        <a href="./manuscripts.html">📚 View Manuscripts</a>
    </div>
    </header></template>
        `,'text/html').head.firstChild
    constructor() {
        super()
        const shadowRoot = this.attachShadow({ mode: "open" })
        shadowRoot.appendChild(this.#template.content)
    }
}

customElements.define('gog-header', GlossHeader)
