/**
 * A focused pop up containing the Gloss deer-form, similar to the form on ng.html.
 * It can be included on any HTML page.  It fires events for when the DEER form contained within has been saved.
 */
class BibliographicCitationVieww extends HTMLElement {
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
        </style>
        <div class="referenceDiv is-hidden">
            <div class="col">
                <p class="col-12 col-12-md">Gloss References are displayed below. Click the caret to see the rest of the reference. Click the pencil icon to edit the reference. Click the trash icon to remove the reference.
                </p>
                <button id="openCitationModalButton" class="smaller"> New Citation </button>
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
                        <input id="citationSubmitButton" class="button primary" type="submit" value="Add Citation"/>
                    </div>
                </form>
            </div>
        </div>
    `;
  constructor() {
    super();
    this.citationsMap = {};
  }
  connectedCallback() {
    const $this = this;
    this.innerHTML = this.template;

    var span = document.getElementsByClassName("bib-citation-close")[0];

    span.onclick = function () {
      document.getElementById("bibliographicCitationModal").style.display = "none";
    };

    window.onclick = function (event) {
      var modal = document.getElementById("bibliographicCitationModal");
      var modalContent = document.querySelector(".bib-citation-modal-content");
      if (!modalContent.contains(event.target) && event.target == modal) {
        modal.style.display = "none";
      }
    };

    const openModalButton = document.getElementById("openCitationModalButton");
    openModalButton.addEventListener("click", (event) => {
      this.openModal(event);
    });

    const bibliographicCitationDiv = document.querySelector("bibliographic-citation-div");

    let hash = window.location.hash;
    if (hash.startsWith("#")) {
      hash = window.location.hash.substring(1);
      if (!(hash.startsWith("http:") || hash.startsWith("https:"))) {
        // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
        let e = new CustomEvent("expandError", { detail: { uri: hash }, bubbles: true });
        document.dispatchEvent(e);
        return;
      }
    }

    if (hash) {
      document.querySelector(".referenceDiv").classList.remove("is-hidden");
      queryBibliographicCitations(hash).then((citations) => {
        if (bibliographicCitationDiv) {
          bibliographicCitationDiv.updateCitations(citations);
        }
      });
    }

    this.addEventListener("click", async (event) => {
      const target = event.target;
      const card = target.closest(".referenceCard");
      if (card) {
        if (event.target.classList.contains("dropdownButton") || event.target.closest(".dropdownButton")) {
          const referenceCard = event.target.closest(".referenceCard");
          referenceCard.querySelector(".referenceContent").classList.toggle("is-hidden");
          referenceCard.querySelector(".referencePreview").classList.toggle("is-hidden");
          const dropdownIcon = referenceCard.querySelector(".dropdownButton i");
          dropdownIcon.classList.toggle("fa-caret-left");
          dropdownIcon.classList.toggle("fa-caret-down");
        } else if (event.target.classList.contains("referenceEdit") || event.target.closest(".referenceEdit")) {
          const citationId = event.target.closest(".referenceCard").getAttribute("data-id");
          this.editCitation(citationId);
        } else if (event.target.classList.contains("referenceRemove") || event.target.closest(".referenceRemove")) {
          const citationId = event.target.closest(".referenceCard").getAttribute("data-id");
          this.removeCitation(citationId);
        }
      }
    });

    const citationForm = document.getElementById("bibliographicCitationForm");
    citationForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const editorContent = document.getElementById("bibliographicCitationEditor").innerHTML;
      const documentReferenceInput = document.getElementById("documentReference");
      const citationId = documentReferenceInput.value;

      try {
        if (citationId) {
          await updateBibliographicCitation(editorContent, hash, citationId);
        } else {
          await addBibliographicCitationToGloss(editorContent, hash);
        }

        document.getElementById("bibliographicCitationModal").style.display = "none";
        document.getElementById("bibliographicCitationEditor").innerHTML = "";
        documentReferenceInput.value = "";
      } catch (error) {
        console.error("Failed to process citation:", error);
      }
    });

    const editor = document.getElementById("bibliographicCitationEditor");
    const buttons = document.querySelectorAll(".toolbar-item");

    function format(command) {
      document.execCommand(command, false, null);
      updateButtonStates();
    }

    function insertLink() {
      var url = prompt("Enter the URL:");
      if (url) {
        document.execCommand("createLink", false, url);
      }
      updateButtonStates();
    }

    const updateButtonStates = () => {
      buttons.forEach((button) => {
        const command = button.dataset.command;
        if (document.queryCommandState(command)) {
          button.classList.add("active");
        } else {
          button.classList.remove("active");
        }
      });
    };

    document.getElementById("boldBtn").addEventListener("click", (e) => {
      e.preventDefault();
      format("bold");
    });
    document.getElementById("italicBtn").addEventListener("click", (e) => {
      e.preventDefault();
      format("italic");
    });
    document.getElementById("underlineBtn").addEventListener("click", (e) => {
      e.preventDefault();
      format("underline");
    });
    document.getElementById("linkBtn").addEventListener("click", () => {
      insertLink();
    });
    document.getElementById("subscriptBtn").addEventListener("click", (e) => {
      e.preventDefault();
      format("subscript");
    });

    document.getElementById("superscriptBtn").addEventListener("click", (e) => {
      e.preventDefault();
      format("superscript");
    });

    editor.addEventListener("keyup", updateButtonStates);
    editor.addEventListener("mouseup", updateButtonStates);

    updateButtonStates();
  }

  openModal(event) {
    event.preventDefault();
    event.stopPropagation();

    const documentReferenceInput = this.querySelector("#documentReference");
    documentReferenceInput.value = "";

    const editor = document.getElementById("bibliographicCitationEditor");
    editor.innerHTML = "";

    this.setModalButtonLabel("Add Citation");

    document.getElementById("bibliographicCitationModal").style.display = "block";
  }

  setModalButtonLabel(label) {
    const submitButton = document.getElementById("citationSubmitButton");
    submitButton.value = label;
  }

  editCitation(citationId) {
    const citationContent = this.citationsMap[citationId];

    const editor = document.getElementById("bibliographicCitationEditor");
    editor.innerHTML = citationContent;

    const documentReferenceInput = this.querySelector("#documentReference");
    documentReferenceInput.value = citationId;

    this.setModalButtonLabel("Update Citation");

    document.getElementById("bibliographicCitationModal").style.display = "block";
  }

  removeCitation(citationId) {
    // TODO: might want to add a warning in the future
    deleteBibliographicCitation(citationId).then(() => {
      const successfulUpdateEvent = new CustomEvent("Bibliographic citation deleted successfully.");
      globalFeedbackBlip(successfulUpdateEvent, "Bibliographic citation deleted successfully.", true);
      let hash = window.location.hash;
      if (hash.startsWith("#")) {
        hash = window.location.hash.substring(1);
        if (!(hash.startsWith("http:") || hash.startsWith("https:"))) {
          // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
          let e = new CustomEvent("expandError", { detail: { uri: hash }, bubbles: true });
          document.dispatchEvent(e);
          return;
        }
      }

      queryBibliographicCitations(hash).then((citations) => {
        const bibliographicCitationDiv = document.querySelector("bibliographic-citation-div");
        if (bibliographicCitationDiv) {
          bibliographicCitationDiv.updateCitations(citations);
        }
      });
    });
  }

  updateCitations(citations) {
    this.citationsMap = {};
    const selectedEntities = this.querySelector(".selectedEntities");
    selectedEntities.innerHTML = "";

    citations.forEach((citation) => {
      this.citationsMap[citation["@id"]] = citation.citation;
      const citationContent = this.createCitationCard(citation);
      selectedEntities.insertAdjacentHTML("beforeend", citationContent);
    });
  }

  createCitationCard(citation) {
    const previewContent = citation.citation.length > 40 ? citation.citation.substring(0, 40) + "…" : citation.citation;

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
        `;
  }
}

let __constants = await fetch("../properties.json")
  .then((r) => r.json())
  .catch((e) => {
    return {};
  });

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
  };

  try {
    const res = await fetch(`${__constants.tiny + "/query"}`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(query),
    }).then((response) => response.json());
    return res;
  } catch (err) {
    console.error(err);
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
      const invalidInputEvent = new CustomEvent("Invalid bibliographic citation input: must be a non-empty string.");
      globalFeedbackBlip(invalidInputEvent, "Invalid bibliographic citation input: must be a non-empty string.", false);
      return;
    }

    const cleanCitation = citationContent.trim();

    const query = {
      "@type": "BibliographicCitation",
      references: [glossId],
      citation: cleanCitation,
      "__rerum.generatedBy": __constants.generator,
    };

    const existingCitations = await fetch(`${__constants.tiny + "/query"}`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(query),
    }).then((resp) => resp.json());

    const isDuplicate = existingCitations.some((citation) => citation.citation === cleanCitation);
    if (isDuplicate) {
      const invalidInputEvent = new CustomEvent("A similar bibliographic citation already exists for this gloss.");
      globalFeedbackBlip(invalidInputEvent, "A similar bibliographic citation already exists for this gloss.", false);
      return;
    }

    const newCitation = {
      "@context": "http://purl.org/dc/terms",
      "@type": "BibliographicCitation",
      references: [glossId],
      citation: cleanCitation,
      "__rerum.generatedBy": __constants.generator,
    };

    const savedCitation = await fetch(`${__constants.tiny + "/create"}`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
      body: JSON.stringify(newCitation),
    }).then((resp) => resp.json());

    if (savedCitation && savedCitation.hasOwnProperty("@id")) {
      addEventListener("deer-updated", () => {
        const sucessfulSaveEvent = new CustomEvent("Bibliographic citation added successfully.");
        globalFeedbackBlip(sucessfulSaveEvent, "Bibliographic citation added successfully.", true);
        return savedCitation;
      });

      let hash = window.location.hash;
      if (hash.startsWith("#")) {
        hash = window.location.hash.substring(1);
        if (!(hash.startsWith("http:") || hash.startsWith("https:"))) {
          // DEER will not even attempt to expand this.  We need to mock the DEER expandError.
          let e = new CustomEvent("expandError", { detail: { uri: hash }, bubbles: true });
          document.dispatchEvent(e);
          return;
        }
      }

      queryBibliographicCitations(hash).then((citations) => {
        const bibliographicCitationDiv = document.querySelector("bibliographic-citation-div");
        if (bibliographicCitationDiv) {
          bibliographicCitationDiv.updateCitations(citations);
        }
      });
    } else {
      const invalidInputEvent = new CustomEvent("Failed to add bibliographic citation.");
      globalFeedbackBlip(invalidInputEvent, "Failed to add bibliographic citation.", false);
      return;
    }
  } catch (error) {
    console.error("Error adding bibliographic citation:", error);
    const errorEvent = new CustomEvent("Error adding bibliographic citation.");
    globalFeedbackBlip(errorEvent, "Error adding bibliographic citation: " + error.message, false);
  }
}

/**
 * Deletes a bibliographic citation associated with a specific Gloss entity.
 *
 * @param citationId {String} The unique identifier (IRI) for the bibliographic citation to be deleted.
 */
async function deleteBibliographicCitation(citationId) {
  try {
    const trimmedCitationId = citationId.split("/").pop();

    await fetch(`${__constants.tiny}/delete/${trimmedCitationId}`, {
      method: "DELETE",
      mode: "cors",
      headers: {
        "Content-Type": "application/json;charset=utf-8",
      },
    })
      .then(() => {
        return;
      })
      .catch(() => {
        throw new Error(`Failed to delete bibliographic citation`);
      });
  } catch (error) {
    console.error("Error deleting bibliographic citation:", error);
    const errorEvent = new CustomEvent("Error deleting bibliographic citation.");
    globalFeedbackBlip(errorEvent, "Error deleting bibliographic citation: " + error.message, false);
  }
}

async function updateBibliographicCitation(citationContent, glossId, citationId) {
  try {
    deleteBibliographicCitation(citationId).then(() => {
      addBibliographicCitationToGloss(citationContent, glossId);
    });
  } catch (error) {
    console.error("Error updating bibliographic citation:", error);
    const errorEvent = new CustomEvent("Error updating bibliographic citation.");
    globalFeedbackBlip(errorEvent, "Error updating bibliographic citation: " + error.message, false);
    return null;
  }
}

customElements.define("bibliographic-citation-div", BibliographicCitationView);
