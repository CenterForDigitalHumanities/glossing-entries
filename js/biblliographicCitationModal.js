/**
 * A focused pop up containing the Gloss deer-form, similar to the form on ng.html.
 * It can be included on any HTML page.  It fires events for when the DEER form contained within has been saved.
 */
class BibliographicCitationModal extends HTMLElement {
  template = `
        <style>
            .bib-citation-modal {
                display: none; 
                position: fixed;
                z-index: 1; 
                left: 0;
                top: 0;
                width: 100%; 
                height: 100%; 
                overflow: auto; 
                background-color: rgb(0,0,0); 
                background-color: rgba(0,0,0,0.4);
            }
            .bib-citation-modal-content {
                background-color: #fefefe;
                margin: 5% auto; 
                padding: 20px;
                border: 1px solid #888;
                width: 50%;
                box-shadow: 0 4px 8px 0 rgba(0,0,0,0.2), 0 6px 20px 0 rgba(0,0,0,0.19); 
                border-radius: 10px; 
            }
            .bib-citation-close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
            }
            .bib-citation-close:hover,
            .bib-citation-close:focus {
                color: black;
                text-decoration: none;
                cursor: pointer;
            }
            form#bibliographicCitationForm{
                font-family: Arial, sans-serif;
                margin: 1em auto;
                max-width: 100%;
                color: #333;
            }
            #bibliographicCitation-container {
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            #bibliographicCitationtoolbar {
                display: flex;
                justify-content: start;
                background-color: #f8f9fa;
                border-bottom: 1px solid #ccc;
                padding: 0.5em;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .toolbar-item {
                background-color: #ffffff;
                border: 1px solid #ccc;
                padding: 0.5em 1em;
                cursor: pointer;
                margin-right: 0.5em;
                font-size: 0.9rem;
                border-radius: 4px;
                transition: background-color 0.3s, box-shadow 0.3s;
            }
            .toolbar-item:hover, .toolbar-item.active {
                background-color: #0056b3;
                color: #fff;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .toolbar-item, .button {
                margin: 4px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
            }
            #bibliographicCitationEditor {
                padding: 1em;
                min-height: 200px;
                border: none;
                outline: none;
            }
            .referenceDiv {
                justify-content: center; 
                background-color: white; 
                padding: 20px; 
                gap: 20px; 
                flex-wrap: wrap; 
                border: 1px solid #ccc; 
                border-radius: 8px; 
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                margin: 20px 0; 
            }
            .referenceTag {
                margin-bottom: 15px;
            }
            .removeTag:after {
                content: '×';
                color: red;
                padding: 1px 1px 1px 7px;
                cursor: pointer;
            }
            .removeTag:hover {
                font-weight: bolder;
                font-size: 115%;
            }
            button.smaller {
                padding: 0px 5px;
                height: 2.2em;
            }
            .selectedEntities {
                display: flex;
                flex-direction: column;
                gap: 10px; 
            }
            .referenceCard {
                border: 1px solid #ccc;
                border-radius: 8px;
                padding: 20px;
                background-color: #fff;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
                display: flex;
                gap: 20px; 
                flex-direction: column;
                justify-content: space-between; 
                position: relative;
                overflow: hidden;
            }
            
            .referenceCard:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 12px rgba(0,0,0,0.2);
            }
            
            .referenceContent {
                white-space: normal; 
                word-wrap: break-word; 
                overflow-wrap: break-word;
                margin-top: 30px; 
                border-top: 1px solid #eee; 
                padding-top: 10px;
            }
            
            .referenceCard.expanded .referenceContent {
                display: block; 
            }
            
            .referencePreview {
                margin-top: 10px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: block;
                max-width: 100%;
            }

            .referenceContent,
            .referencePreview {
                padding: 10px 0;
            }
            
            .referenceHeader {
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
            }
            
            .referenceCardActions {
                position: absolute;
                right: 10px;
                top: 10px;
                display: flex;
                align-items: center; 
                justify-content: flex-end; 
                padding: 5px 0;
                padding-bottom: 10px;
                gap: 8px; 
            }
            
            .dropdownButton,
            .referenceEdit,
            .referenceRemove {
                background-color: #f9f9f9;  
                border: 1px solid #ccc;  
                border-radius: 4px;  
                cursor: pointer;
                color: #333;  
                font-size: 16px;
                padding: 6px 12px;  
                margin-left: 8px;
                transition: background-color 0.2s, color 0.2s, box-shadow 0.2s; 
            }
            
            .dropdownButton:focus,
            .referenceEdit:focus,
            .referenceRemove:focus {
                outline: none; 
                box-shadow: 0 0 0 2px #0056b3;  
            }
            
            .dropdownButton i,
            .referenceEdit i,
            .referenceRemove i {
                transition: color 0.3s ease; 
            }
            
            .dropdownButton:hover i,
            .referenceEdit:hover i,
            .referenceRemove:hover i {
                color: #0056b3; 
            }
            
            .referenceCard .dropdownButton {
                display: inline; 
            }
            
            .referenceCard.expanded .dropdownButton i {
                transform: rotate(180deg);
            }
            
            .referenceRemove {
                color: red;
            }
            
            .referenceRemove:hover {
                text-decoration: underline;
            }
        </style>
        <div class="referenceDiv is-hidden">
            <div class="col">
                <p class="col-12 col-12-md">Gloss References are displayed below. Click the caret to see the rest of the reference. Click the pencil icon to edit the reference. Click the trash icon to remove the reference.
                </p>
                <button class="smaller"> Add Bibliographic Reference </button>
                <div class="selectedEntities col-12 col-12-md">
                </div>
            </div>
        </div?>
        <div id="bibliographicCitationModal" class="bib-citation-modal">
            <div class="bib-citation-modal-content">
                <span class="bib-citation-close">&times;</span>
                <form id="bibliographicCitationForm" deer-type="BibliographicResource" deer-context="http://purl.org/dc/terms">
                    <div class="row">
                        <label for="bibliographicCitationEditor" class="col-12 text-left">Bibliographic Citation: &#10082;</label>
                    </div>
            
                    <div class="bibliographicCitation-container">
                        <div class="row" id="bibliographicCitationtoolbar">
                            <button type="button" class="toolbar-item" id="boldBtn" data-command="bold">Bold</button>
                            <button type="button" class="toolbar-item" id="italicBtn" data-command="italic">Italics</button>
                            <button type="button" class="toolbar-item" id="underlineBtn" data-command="underline">Underline</button>
                            <button type="button" class="toolbar-item" id="linkBtn">Link</button>
                            <button type="button" class="toolbar-item" id="subscriptBtn" data-command="subscript">Subscript</button>
                            <button type="button" class="toolbar-item" id="superscriptBtn" data-command="superscript">Superscript</button>
                        </div>
                    
                        <div class="row">
                            <div id="bibliographicCitationEditor" class="col-12 required" contenteditable="true"></div>
                        </div>
                    </div>
            
                    <div class="row">
                        <input type="hidden" deer-key="references" id="documentReference">
                        <input class="button primary" type="submit" value="Add Citation"/>
                    </div>
                </form>
            </div>
        </div>
    `
  constructor() {
    super()
  }
  connectedCallback() {
        const $this = this
        this.innerHTML = this.template
        const addBtn = this.querySelector("button")
        addBtn.addEventListener("click", addReference)
        
        /**
         * Click event handler for Add Reference.  Opens a modal.
         * Includes pagination.
         * */
        function addReference(event) {
            event.preventDefault()
            event.stopPropagation()
            document.getElementById('bibliographicCitationModal').style.display = 'block'
        }

        var span = document.getElementsByClassName("bib-citation-close")[0]

        span.onclick = function() {
            document.getElementById('bibliographicCitationModal').style.display = "none"
        }

        window.onclick = function(event) {
            var modal = document.getElementById('bibliographicCitationModal')
            var modalContent = document.querySelector('.bib-citation-modal-content')
            if (!modalContent.contains(event.target) && event.target == modal) {
                modal.style.display = "none"
            }
        }

        this.addEventListener('click', event => {
            const target = event.target
            const card = target.closest('.referenceCard')
            if (card) {
                if (event.target.classList.contains('dropdownButton') || event.target.closest('.dropdownButton')) {
                    const referenceCard = event.target.closest('.referenceCard')
                    referenceCard.querySelector('.referenceContent').classList.toggle('is-hidden')
                    referenceCard.querySelector('.referencePreview').classList.toggle('is-hidden')
                    const dropdownIcon = referenceCard.querySelector('.dropdownButton i')
                    dropdownIcon.classList.toggle('fa-caret-left')
                    dropdownIcon.classList.toggle('fa-caret-down')
                }
                else if (event.target.classList.contains('fa-edit') || event.target.parentElement.classList.contains('referenceEdit')) {
                    const citationId = event.target.closest('.referenceCard').querySelector('.referenceEdit').getAttribute('data-id')
                    this.editCitation(citationId)
                } else if (event.target.classList.contains('fa-trash') || event.target.parentElement.classList.contains('referenceRemove')) {
                    const citationId = event.target.closest('.referenceCard').querySelector('.referenceRemove').getAttribute('data-id')
                    this.removeCitation(citationId)
                }
            }
        })
    }

    editCitation(citationId) {
        // TODO: Implement the logic to populate the form for editing
        console.log("editing citation", citationId)
    }
    
    removeCitation(citationId) {
        // TODO: Implement the logic to remove the citation.
        console.log("removing citation", citationId)
    }

    updateCitations(citations) {
        const selectedEntities = this.querySelector('.selectedEntities')
        selectedEntities.innerHTML = ''

        citations.forEach(citation => {
            const citationContent = this.createCitationCard(citation)
            selectedEntities.insertAdjacentHTML('beforeend', citationContent)
        })
    }

    createCitationCard(citation) {
        const previewContent = citation.citation.length > 20
            ? citation.citation.substring(0, 20) + '…'
            : citation.citation
    
        return `
            <div class="referenceCard">
                
                <div class="referenceCardActions">
                    ${citation.citation.length > 20 ? 
                        `<button class="dropdownButton" data-id="${citation['@id']}" title="Toggle View">
                            <i class="fas fa-caret-left"></i>
                        </button>` : 
                    ''}
                    <button class="referenceEdit" data-id="${citation['@id']}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="referenceRemove" data-id="${citation['@id']}" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="referenceContent is-hidden">${citation.citation}</div>
                <div class="referencePreview">${previewContent}</div>
            </div>
        `
    }
}

customElements.define("bibliographic-citation-modal", BibliographicCitationModal)

