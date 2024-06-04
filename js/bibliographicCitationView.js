/**
 * A focused pop up containing the Gloss deer-form, similar to the form on ng.html.
 * It can be included on any HTML page.  It fires events for when the DEER form contained within has been saved.
 */
class BibliographicCitationView extends HTMLElement {
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
                padding: 40px;
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
                margin-top: 37.59px; 
                border-top: 1px solid #eee; 
                padding-top: 10px;
            }
            .referenceCard.expanded .referenceContent {
                display: block; 
            }
            .referencePreview {
                margin-top: 5px;
                margin-bottom: 5px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: block;
                max-width: 100%;
            }
            .referenceContent,
            .referencePreview {
                padding-left: 10px;
                padding-right: 10px;
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
                top: 6px;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .actionButton {
                background-color: #f9f9f9;  
                border: 1px solid #ccc;  
                border-radius: 2px;  
                cursor: pointer;
                color: #333;  
                font-size: 14px; 
                padding: 4px 8px;   
                line-height: 1; 
                transition: background-color 0.2s, color 0.2s, box-shadow 0.2s;
            }
            .actionButton:hover {
                background-color: #e1e1e1; 
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); 
            }
            .actionButton i {
                transition: color 0.3s ease;
            }
            .actionButton:hover i {
                color: #0056b3; 
            }
            .actionButton:focus {
                outline: none;
                box-shadow: 0 0 0 2px #0056b3; 
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
            .text-muted {
                color: gray;
                font-size: 10px;
            }
        </style>
        <div class="referenceDiv is-hidden">
            <div class="col-12 col-12-md">
                <h4> Modify Citations </h4>
                <p>
                    Gloss References are displayed below. Click the caret to see the rest of the reference. 
                    Click the pencil icon to edit the reference. Click the trash icon to remove the reference.<br>
                    <i>Citations are created immediately when you click 'Add Citation'.</i>
                </p>
                <button id="openCitationModalButton" class="smaller"> New Citation </button>
                <div class="selectedEntities">
                </div>
            </div>
        </div>
        <div id="bibliographicCitationModal" class="bib-citation-modal">
            <div class="bib-citation-modal-content">
                <span class="bib-citation-close">&times;</span>
                <form id="bibliographicCitationForm" deer-type="BibliographicResource" deer-context="http://purl.org/dc/terms">
                    <div class="row">
                        <label for="bibliographicCitationEditor" class="col-12 text-left">Bibliographic Citation:</label>
                        <p class="text-left text-muted">If typing manually, it is recommended to type the content first, then highlight, then click the buttons to transform the highlighted content.  </p>
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
                            <div spellcheck="false" id="bibliographicCitationEditor" class="col-12 required" contenteditable="true"></div>
                        </div>
                    </div>
            
                    <div class="row">
                        <input type="hidden" deer-key="references" id="documentReference">
                        <input id="citationSubmitButton" class="button primary" type="submit" value="Add Citation"/>
                    </div>
                </form>
            </div>
        </div>
    `
  constructor() {
    super()
    this.citationsMap = {}
  }
  connectedCallback() {
    this.innerHTML = this.template

    const span = this.querySelector(".bib-citation-close")

    span.onclick = () => {
        this.querySelector("#bibliographicCitationModal").style.display = "none"
    }

    const modal = this.querySelector("#bibliographicCitationModal")
    const modalContent = this.querySelector(".bib-citation-modal-content")

    window.addEventListener("mousedown", (event) => {
        if (!modalContent.contains(event.target) && event.target !== modalContent) {
          this.isClickOutsideModal = true
        } else {
          this.isClickOutsideModal = false
        }
      })
  
    window.addEventListener("mouseup", (event) => {
        if (this.isClickOutsideModal && !modalContent.contains(event.target) && event.target === modal) {
            modal.style.display = "none"
        }
        this.isClickOutsideModal = false
    })

    const openModalButton = this.querySelector("#openCitationModalButton")
    const documentReferenceInput = this.querySelector("#documentReference")
    const editor = this.querySelector("#bibliographicCitationEditor")

    openModalButton.addEventListener("click", (ev) => {
        ev.preventDefault()
        ev.stopPropagation()
    
        documentReferenceInput.value = ""
        
        editor.innerHTML = ""
        this.setModalButtonLabel("Add Citation")
        modal.style.display = "block"
    })

    let hash = window.location.hash
    if (hash.startsWith("#")) {
      hash = window.location.hash.substring(1)
      if (!(hash.startsWith("http:") || hash.startsWith("https:"))) {
        // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
        let e = new CustomEvent("expandError", { detail: { uri: hash }, bubbles: true })
        this.dispatchEvent(e)
        return
      }
    }

    if (hash) {
      this.querySelector(".referenceDiv").classList.remove("is-hidden")
      queryBibliographicCitations(hash).then((citations) => {
        this.updateCitations(citations)
      })
    }

    this.addEventListener("click", async (event) => {
      const target = event.target
      const card = target.closest(".referenceCard")
      if (card) {
        if (event.target.classList.contains("dropdownButton") || event.target.closest(".dropdownButton")) {
          const referenceCard = event.target.closest(".referenceCard")
          referenceCard.querySelector(".referenceContent").classList.toggle("is-hidden")
          referenceCard.querySelector(".referencePreview").classList.toggle("is-hidden")
          const dropdownIcon = referenceCard.querySelector(".dropdownButton i")
          dropdownIcon.classList.toggle("fa-caret-left")
          dropdownIcon.classList.toggle("fa-caret-down")
        } else if (event.target.classList.contains("referenceEdit") || event.target.closest(".referenceEdit")) {
          const citationId = event.target.closest(".referenceCard").getAttribute("data-id")
          this.editCitation(citationId)
        } else if (event.target.classList.contains("referenceRemove") || event.target.closest(".referenceRemove")) {
          const citationId = event.target.closest(".referenceCard").getAttribute("data-id")
          this.removeCitation(citationId)
        }
      }
    })

    const citationForm = this.querySelector("#bibliographicCitationForm")
    citationForm.addEventListener("submit", async function (e) {
      e.preventDefault()
      const editorContent = editor.innerHTML
      const citationId = documentReferenceInput.value

      try {
        if (citationId) {
          await updateBibliographicCitation(editorContent, hash, citationId)
        } else {
          await addBibliographicCitationToGloss(editorContent, hash)
        }

        modal.style.display = "none"
        editor.innerHTML = ""
        documentReferenceInput.value = ""
      } catch (error) {
        console.error("Failed to process citation:", error)
      }
    })

    this.setupEditor()
  }

  setupEditor() {
    const editor = this.querySelector("#bibliographicCitationEditor")
    const buttons = this.querySelectorAll(".toolbar-item")
  
    buttons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault()
        this.formatCommand(button.dataset.command)
      })
    })
  
    editor.addEventListener("keyup", () => this.updateButtonStates())
    editor.addEventListener("mouseup", () => this.updateButtonStates())
  }
  
  formatCommand(command) {
    document.execCommand(command, false, null)
    this.updateButtonStates()
  }
  
  updateButtonStates() {
    const buttons = this.querySelectorAll(".toolbar-item")
    buttons.forEach(button => {
      const command = button.dataset.command
      if (document.queryCommandState(command)) {
        button.classList.add("active")
      } else {
        button.classList.remove("active")
      }
    })
  }

  setModalButtonLabel(label) {
    const submitButton = this.querySelector("#citationSubmitButton")
    submitButton.value = label
  }

  /**
   * Opens the citation modal for editing an existing citation. It loads the content of the citation into
   * the editor and sets the form to reflect an update operation.
   *
   * @param {String} citationId - The unique identifier (IRI) of the citation to edit.
   */
  editCitation(citationId) {
    const citationContent = this.citationsMap[citationId]

    const editor = this.querySelector("#bibliographicCitationEditor")
    editor.innerHTML = citationContent

    const documentReferenceInput = this.querySelector("#documentReference")
    documentReferenceInput.value = citationId

    this.setModalButtonLabel("Update Citation")

    this.querySelector("#bibliographicCitationModal").style.display = "block"
  }

  /**
   * Deletes a citation and updates the UI to reflect the change. If the citation is successfully deleted,
   * it refreshes the list of citations displayed.
   *
   * @param {String} citationId - The unique identifier (IRI) of the citation to delete.
   */
  removeCitation(citationId) {
    // TODO: might want to add a warning in the future
    deleteBibliographicCitation(citationId).then(() => {
      const successfulUpdateEvent = new CustomEvent("Bibliographic citation deleted successfully.")
      globalFeedbackBlip(successfulUpdateEvent, "Bibliographic citation deleted successfully.", true)
      let hash = window.location.hash
      if (hash.startsWith("#")) {
        hash = window.location.hash.substring(1)
        if (!(hash.startsWith("http:") || hash.startsWith("https:"))) {
          // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
          let e = new CustomEvent("expandError", { detail: { uri: hash }, bubbles: true })
          document.dispatchEvent(e)
          return
        }
      }

      queryBibliographicCitations(hash).then((citations) => {
        const bibliographicCitationDiv = document.querySelector("bibliographic-citation-div")
        if (bibliographicCitationDiv) {
          bibliographicCitationDiv.updateCitations(citations)
        }
      })
    })
  }

  /**
   * Updates the internal state and the display of citations. Maps citations by their IDs for quick access
   * and dynamically creates HTML content for each citation to be displayed on the page.
   *
   * @param {Array} citations - An array of citation objects to display.
   */
  updateCitations(citations) {
    this.citationsMap = {}
    const selectedEntities = this.querySelector(".selectedEntities")
    selectedEntities.innerHTML = ""

    citations.forEach((citation) => {
      this.citationsMap[citation["@id"]] = citation.citation
      const citationContent = this.createCitationCard(citation)
      selectedEntities.insertAdjacentHTML("beforeend", citationContent)
    })
  }


  /**
   * Creates an HTML representation of a citation card. This card includes actions such as view, edit, and delete.
   *
   * @param {Object} citation - The citation data object.
   * @returns {String} The HTML string of the citation card.
   */
  createCitationCard(citation) {
    const previewContent = citation.citation.length > 40 ? citation.citation.substring(0, 40) + "…" : citation.citation

    return `
            <div class="referenceCard" data-id="${citation["@id"]}">
                
                <div class="referenceCardActions">
                    ${
                      citation.citation.length > 40
                        ? `<button class="actionButton dropdownButton" title="Toggle View">
                            <i class="fas fa-caret-left"></i>
                        </button>`
                        : ""
                    }
                    <button class="actionButton referenceEdit" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="actionButton referenceRemove" title="Remove">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="referenceContent is-hidden">${citation.citation}</div>
                <div class="referencePreview">${previewContent}</div>
            </div>
        `
  }
}

let __constants = await fetch("../properties.json")
  .then((r) => r.json())
  .catch((e) => {
    return {}
  })

/**
 * Queries and retrieves all bibliographic citations associated with a specific Gloss entity.
 *
 *
 * @param glossId {String} The unique identifier (IRI) of the Gloss entity for which bibliographic citations
 *                         are being queried.
 */
async function queryBibliographicCitations(glossId) {
  const query = {
    "@type": "BibliographicCitation",
    references: [glossId],
    "__rerum.generatedBy": __constants.generator,
  }

  try {
    const res = await fetch(`${__constants.tiny + "/query"}`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(query),
    }).then((response) => response.json())
    return res
  } catch (err) {
    console.error(err)
  }
}

/**
 * Adds a bibliographic citation to a specific Gloss entity. This function first validates and cleans
 * the bibliographic citation input, checks for an existing citation to avoid duplicates, and then
 * saves a new bibliographic citation if it does not already exist.
 *
 * @param citationContent {String} The bibliographic citation as an HTML string. This citation
 *                                       may include formatting tags (e.g., <i>, <a>) to preserve the
 *                                       citation style.
 * @param glossId {String} The unique identifier (IRI) of the Gloss entity to which the citation is being added.
 */
async function addBibliographicCitationToGloss(citationContent, glossId) {
  try {
    if (typeof citationContent !== "string" || !citationContent.trim()) {
      const invalidInputEvent = new CustomEvent("Invalid bibliographic citation input: must be a non-empty string.")
      globalFeedbackBlip(invalidInputEvent, "Invalid bibliographic citation input: must be a non-empty string.", false)
      return
    }

    const cleanCitation = citationContent.trim()

    const query = {
      "@type": "BibliographicCitation",
      references: [glossId],
      citation: cleanCitation,
      "__rerum.generatedBy": __constants.generator,
    }

    const existingCitations = await fetch(`${__constants.tiny + "/query"}`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(query),
    }).then((resp) => resp.json())

    const isDuplicate = existingCitations.some((citation) => citation.citation === cleanCitation)
    if (isDuplicate) {
      const invalidInputEvent = new CustomEvent("A similar bibliographic citation already exists for this gloss.")
      globalFeedbackBlip(invalidInputEvent, "A similar bibliographic citation already exists for this gloss.", false)
      return
    }

    const newCitation = {
      "@context": "http://purl.org/dc/terms",
      "@type": "BibliographicCitation",
      references: [glossId],
      citation: cleanCitation,
      "__rerum.generatedBy": __constants.generator,
    }

    const savedCitation = await fetch(`${__constants.tiny + "/create"}`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(newCitation),
    }).then((resp) => resp.json())

    if (savedCitation && savedCitation.hasOwnProperty("@id")) {
      addEventListener("deer-updated", () => {
        const sucessfulSaveEvent = new CustomEvent("Bibliographic citation added successfully.")
        globalFeedbackBlip(sucessfulSaveEvent, "Bibliographic citation added successfully.", true)
        return savedCitation
      })

      let hash = window.location.hash
      if (hash.startsWith("#")) {
        hash = window.location.hash.substring(1)
        if (!(hash.startsWith("http:") || hash.startsWith("https:"))) {
          // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
          let e = new CustomEvent("expandError", { detail: { uri: hash }, bubbles: true })
          document.dispatchEvent(e)
          return
        }
      }

      queryBibliographicCitations(hash).then((citations) => {
        const bibliographicCitationDiv = document.querySelector("bibliographic-citation-div")
        if (bibliographicCitationDiv) {
          bibliographicCitationDiv.updateCitations(citations)
        }
      })
    } else {
      const invalidInputEvent = new CustomEvent("Failed to add bibliographic citation.")
      globalFeedbackBlip(invalidInputEvent, "Failed to add bibliographic citation.", false)
      return
    }
  } catch (error) {
    console.error("Error adding bibliographic citation:", error)
    const errorEvent = new CustomEvent("Error adding bibliographic citation.")
    globalFeedbackBlip(errorEvent, "Error adding bibliographic citation: " + error.message, false)
  }
}

/**
 * Deletes a bibliographic citation associated with a specific Gloss entity.
 *
 * @param citationId {String} The unique identifier (IRI) for the bibliographic citation to be deleted.
 */
async function deleteBibliographicCitation(citationId) {
  try {
    const trimmedCitationId = citationId.split("/").pop()

    await fetch(`${__constants.tiny}/delete/${trimmedCitationId}`, {
      method: "DELETE",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
        "Authorization": `Bearer ${window.GOG_USER.authorization}`
      },
    })
    .then(r => {
        if(!r.ok) throw new Error(r.text)
        return
    })
    .catch(() => {
    throw new Error(`Failed to delete bibliographic citation`)
    })
  } catch (error) {
    console.error("Error deleting bibliographic citation:", error)
    const errorEvent = new CustomEvent("Error deleting bibliographic citation.")
    globalFeedbackBlip(errorEvent, "Error deleting bibliographic citation: " + error.message, false)
  }
}

/**
 * Updates a bibliographic citation by first deleting the existing citation and then adding the updated
 * citation content. If deletion is successful, the new citation content is added.
 *
 * @param {String} citationContent - The updated bibliographic citation content.
 * @param {String} glossId - The unique identifier (IRI) of the Gloss entity to which the citation is related.
 * @param {String} citationId - The unique identifier (IRI) of the citation that is being updated.
 */
async function updateBibliographicCitation(citationContent, glossId, citationId) {
  try {
    deleteBibliographicCitation(citationId).then(() => {
      addBibliographicCitationToGloss(citationContent, glossId)
    })
  } catch (error) {
    console.error("Error updating bibliographic citation:", error)
    const errorEvent = new CustomEvent("Error updating bibliographic citation.")
    globalFeedbackBlip(errorEvent, "Error updating bibliographic citation: " + error.message, false)
    return null
  }
}

customElements.define("bibliographic-citation-div", BibliographicCitationView)
