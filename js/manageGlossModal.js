import { default as deerUtils } from './deer-utils.js'

/**
  * A focused pop up containing Gloss statuses and management options.
  * Specifically designed for manage-glosses.html
*/
class ManageGlossModal extends HTMLElement {
    // Cleans up the document-level listeners this element adds, see connectedCallback.
    #listeners
    template = `
        <style>
            small{
                display: block;
            }
            .button.is-small{
                padding: 0.4em;
                font-size: 0.95em;
            }
            .pubStatus{
                display: inline-block;
                position: relative;
                width: 1.75em;
                text-align: center;
                cursor: default;
            }
            input[filter="title"]{
                border: 2px solid var(--color-primary);
            }
            .manageModal{
                position: relative;
                display: block;
                top: 15vh;
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
            .gloss-meta{
                margin: 0.5em 0;
                padding: 0.5em;
                background: rgba(0,0,0,0.04);
                border-radius: 4px;
            }
            .gloss-text{
                margin: 0 0 0.5em 0;
                font-style: italic;
            }
            .meta-row{
                display: flex;
                gap: 0.5em;
                margin: 0.25em 0;
                font-size: 0.9em;
            }
            .meta-label{
                font-weight: bold;
                color: var(--color-grey);
                min-width: 7em;
            }
            .meta-value{
                color: var(--color-dark);
            }
            .more-details{
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.3s ease-out;
            }
            .more-details.is-open{
                max-height: 500px;
                overflow-y: auto;
            }
            .more-details-inner{
                padding: 0.5em;
                margin: 0.5em 0;
                background: rgba(0,0,0,0.02);
                border-radius: 4px;
                border-top: 1px solid rgba(0,0,0,0.08);
            }
            .fragment-card{
                background: white;
                border: 1px solid rgba(0,0,0,0.12);
                border-radius: 4px;
                padding: 0.6em;
                margin-bottom: 0.5em;
            }
            .fragment-card:last-child{
                margin-bottom: 0;
            }
            .fragment-card-header{
                display: flex;
                align-items: baseline;
                gap: 0.5em;
                margin-bottom: 0.4em;
                padding-bottom: 0.3em;
                border-bottom: 1px solid rgba(0,0,0,0.06);
            }
            .fragment-card-shelfmark{
                font-weight: bold;
                color: var(--color-primary);
                font-size: 0.9em;
            }
            .fragment-card-folio{
                color: var(--color-grey);
                font-size: 0.8em;
            }
            .fragment-card-text{
                font-style: italic;
                color: var(--color-dark);
                font-size: 0.85em;
                margin-bottom: 0.3em;
                word-break: break-word;
            }
            .fragment-card-meta{
                display: flex;
                flex-wrap: wrap;
                gap: 0.8em;
                font-size: 0.75em;
                color: var(--color-grey);
            }
            .fragment-card-meta span{
                display: inline-block;
            }
            .fragment-card-meta strong{
                margin-right: 0.2em;
            }
        </style>

        <div class="window-shadow"> 
            <div class="manageModal container">
                <div class="card">
                    <header>
                        <h4>Gloss Title</h4>
                    </header>
                    <div class="gloss-meta">
                        <p class="gloss-text"></p>
                        <div class="meta-row">
                            <span class="meta-label">Contributor:</span>
                            <span class="meta-value gloss-creator">—</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Modified:</span>
                            <span class="meta-value gloss-modified">—</span>
                        </div>
                        <div class="meta-row">
                            <span class="meta-label">Witnesses:</span>
                            <span class="meta-value gloss-witnesses">—</span>
                        </div>
                    </div>
                    <footer>
                        <a class="button" href="#">Review</a>
                        <input type="button" class="button" value="Publish"/>
                        <input type="button" class="button otherModalBtn" value="More..."/>
                        <input type="button" class="button" value="Delete"/>
                    </footer>
                    <div class="more-details">
                        <div class="more-details-inner">
                            <div class="fragment-card-list gloss-fragments"></div>
                            <div class="fragment-item">
                                <span class="fragment-label">Reference:</span>
                                <span class="fragment-value gloss-target">—</span>
                            </div>
                        </div>
                    </div>
                    <div class="is-right">
                        <input type="button" class="button closeModal" value="Close"/>
                    </div>
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
        this.close = () => {
            $this.classList.add("is-hidden")
        }

        // Esc closes the modal.  This is not a native <dialog>, so the key has to be handled here.
        // The listener is on document because focus is normally still on the list row that opened
        // the modal, not on anything inside it.  A custom-confirm-modal stacks on top of this one
        // and removes itself once answered, so while one is present Esc belongs to it.
        this.#listeners = new AbortController()
        document.addEventListener("keydown", ev => {
            if (ev.key !== "Escape") return
            if ($this.classList.contains("is-hidden")) return
            if (document.querySelector("custom-confirm-modal")) return
            $this.close()
        }, { signal: this.#listeners.signal })

        // Create the modal dynamically from the chosen glosses data, provided as the parameter here.
        this.open = (glossData) => {
            // Reset collapsible details to collapsed state for each open.
            const moreDetails = $this.querySelector(".more-details")
            moreDetails.classList.remove("is-open")
            $this.querySelector(".gloss-fragments").innerHTML = ""
            $this.querySelector(".gloss-target").innerText = "—"

            const negotiatedId = glossData?.["@id"] ?? glossData?.id
            if(!glossData || !negotiatedId){
                const ev = new CustomEvent("Cannot manage this gloss")
                deerUtils.globalFeedbackBlip(ev, `Please wait for this Gloss to load.`, false)
                return
            }
            const glossID = negotiatedId.replace(/^https?:/, 'https:')
            const published = glossData.published

            // Extract values from the full Gloss entity.
            // text is {value: {textValue: "..."}} - extract the innermost string.
            const glossText = glossData.text?.value?.textValue ?? ""
            const glossTitleObj = deerUtils.getLabel(glossData) ?? glossData.title
            const glossTitleStr = deerUtils.getValue(glossTitleObj) ?? "[ unlabeled ]"
            const glossTitle = `${published ? "✓" : "❌"}  ${glossTitleStr}`

            // Contributor: getCreator() can return string, array, or object.
            // If array, take the first element. If object, extract its value.
            const creatorRaw = deerUtils.getCreator(glossData)
            const creatorElem = $this.querySelector(".gloss-creator")
            let creatorId = creatorRaw
            if (Array.isArray(creatorRaw)) {
                creatorId = creatorRaw[0] ?? creatorRaw
            } else if (typeof creatorRaw === "object" && creatorRaw !== null) {
                creatorId = deerUtils.getValue(creatorRaw) ?? "[ unlabeled ]"
            }
            if (typeof creatorId === "string" && creatorId.startsWith("http")) {
                // Show agent ID initially, then update with resolved label.
                creatorElem.innerText = creatorId
                deerUtils.resolveAgentLabel(creatorId).then(label => {
                    creatorElem.innerText = label
                })
            } else {
                creatorElem.innerText = creatorId ?? "[ unlabeled ]"
            }

            // Modified: check the same fields as the list view.
            const modified = deerUtils.getModifiedDate(glossData) ?? ""
            const modifiedDisplay = modified ? deerUtils.formatRelativeTime(modified) : "—"

            // Witnesses: requires a dynamic query — fetch asynchronously.
            const witnessesElem = $this.querySelector(".gloss-witnesses")
            witnessesElem.innerText = "..."
            const glossURI = glossID ?? glossData?.["@id"] ?? glossData?.id
            deerUtils.getWitnessesForGloss(glossURI).then(witnesses => {
                if (witnesses.length === 0) {
                    witnessesElem.innerText = "—"
                    return
                }
                witnessesElem.innerHTML = ""
                const ul = document.createElement("ul")
                ul.style.listStyle = "none"
                ul.style.padding = "0"
                ul.style.margin = "0"
                for (const witnessURI of witnesses) {
                    const li = document.createElement("li")
                    const a = document.createElement("a")
                    a.href = `manuscript-profile.html#${witnessURI}`
                    a.target = "_blank"
                    a.textContent = witnessURI.split("/").pop()
                    li.appendChild(a)
                    ul.appendChild(li)
                }
                witnessesElem.appendChild(ul)
            }).catch(() => {
                witnessesElem.innerText = "—"
            })

            $this.querySelector(".gloss-text").innerText = glossText
            $this.querySelector(".gloss-modified").innerText = modifiedDisplay

            const removeBtn = `<input type="button" value="delete" glossid="${glossID}" data-type="named-gloss" class="removeCollectionItem button error is-small" title="Delete This Entry">`
            const visibilityBtn = `<input type="button" value="${published ? "unpublish" : "publish"}" class="togglePublic button ${published ? "error" : "success"} is-small" glossid="${glossID}" title="Toggle public visibility"/>`
            const moreOptionsBtn = `<input type="button" value="more..." glossid="${glossID}" class="otherModalBtn button primary is-small" title="See detailed modal for this Gloss">`
            const reviewBtn = `<a class="button secondary is-small" href="gloss-metadata.html#${glossID}">review</a>`

            $this.querySelector("a").setAttribute("href", `gloss-metadata.html#${glossID}`)
            $this.querySelector("h4").innerText = glossTitle
            $this.querySelector("footer").innerHTML = reviewBtn + visibilityBtn + moreOptionsBtn + removeBtn

            // 'Close' functionality
            $this.querySelector(".closeModal").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()
                $this.close()     
            })                 

            // 'delete' functionality
            $this.querySelector(".removeCollectionItem").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()
                const fn = () => {
                    $this.classList.add("is-hidden")
                    removeEventListener("globalFeedbackFinished", fn)
                }
                addEventListener("globalFeedbackFinished", fn)
                const itemID = ev.target.getAttribute("glossid")
                const itemType = ev.target.getAttribute("data-type")
                deleteManagedGloss(itemID, false)
            })

            // 'publish' and 'unpublish' functionality
            $this.querySelector(".togglePublic").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()                       
                const uri = ev.target.getAttribute("glossid")
                let listCache = document.querySelector("deer-view[deer-template='managedlist']")?.listCache
                const included = listCache.has(uri)
                const statusElem = document.querySelector(`.pubStatus[glossid="${uri}"]`)
                const titleStatus = ev.target.closest(".manageModal").querySelector("h4")
                //ev.target.classList[included ? "remove" : "add"]("is-included")
                listCache[included ? "delete" : "add"](uri)
                if(included){
                    statusElem.innerText = "❌"
                    titleStatus.innerText = titleStatus.innerText.replace("✓", "❌")    
                    ev.target.value = "publish"
                    ev.target.classList.remove("error")
                    ev.target.classList.add("success")
                }
                else{
                    statusElem.innerText = "✓"
                    titleStatus.innerText = titleStatus.innerText.replace("❌", "✓")  
                    ev.target.value = "unpublish"
                    ev.target.classList.remove("success")
                    ev.target.classList.add("error")
                }
                saveList.removeAttribute("disabled")
                const shout = new CustomEvent("Gloss Publication Mark")
                globalFeedbackBlip(shout, `This Gloss is now marked to be ${included ? "removed from" : "added to"} the public list.  Don't forget to submit your changes.`, true)
            })

            // More details: slide open heavy details on demand.
            let moreLoaded = false
            $this.querySelector(".otherModalBtn").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()
                const details = $this.querySelector(".more-details")
                const fragmentsElem = $this.querySelector(".gloss-fragments")
                const targetElem = $this.querySelector(".gloss-target")

                // Populate heavy data on first click only.
                if (!moreLoaded) {
                    moreLoaded = true
                    // Image fragments: fetch full WitnessFragment details and render as cards.
                    const glossURI = glossID ?? glossData?.["@id"] ?? glossData?.id
                    const fragmentsContainer = $this.querySelector(".gloss-fragments")
                    deerUtils.getWitnessesForGloss(glossURI).then(async (witnesses) => {
                        if (witnesses.length === 0) {
                            fragmentsContainer.innerHTML = "<div class='fragment-card'><div class='fragment-card-header'>No Witness Fragments</div></div>"
                            return
                        }
                        // Fetch full WitnessFragment details for each witness URI.
                        const fragmentFetches = witnesses.map(async (witnessURI) => {
                            try {
                                const frag = await deerUtils.expand({ "@id": witnessURI })
                                return frag
                            } catch {
                                return null
                            }
                        })
                        const fragments = (await Promise.all(fragmentFetches)).filter(Boolean)
                        fragmentsContainer.innerHTML = ""
                        for (const frag of fragments) {
                            const card = document.createElement("div")
                            card.className = "fragment-card"
                            // WitnessFragment properties may be plain strings, {value: "..."} objects,
                            // or {value: {textValue: "..."}} (custom-text-key fields).
                            const val = (v) => {
                                if (typeof v === "string") return v
                                if (v && typeof v === "object") {
                                    return v.value?.textValue ?? v.value ?? ""
                                }
                                return ""
                            }
                            // val() returns "" for absent fields, so these fall back with || not ??.
                            const shelfmark = val(frag.identifier) || val(frag.title) || "Unlabeled"
                            const folio = val(frag._folio) ?? ""
                            const text = val(frag.text) ?? ""
                            const language = val(frag.language) ?? ""
                            const glossFormat = val(frag._glossFormat) ?? ""
                            const glossLocation = val(frag._glossLocation) ?? ""
                            const glossatorHand = val(frag._glossatorHand) ?? ""
                            const manuscript = val(frag.partOf) ?? ""
                            const depiction = val(frag.depiction) ?? ""
                            const cardHeader = document.createElement("div")
                            cardHeader.className = "fragment-card-header"
                            const shelfmarkSpan = document.createElement("span")
                            shelfmarkSpan.className = "fragment-card-shelfmark"
                            shelfmarkSpan.textContent = shelfmark
                            const folioSpan = document.createElement("span")
                            folioSpan.className = "fragment-card-folio"
                            folioSpan.textContent = folio ? `(${folio})` : ""
                            cardHeader.appendChild(shelfmarkSpan)
                            cardHeader.appendChild(folioSpan)
                            card.appendChild(cardHeader)
                            if (text) {
                                const textDiv = document.createElement("div")
                                textDiv.className = "fragment-card-text"
                                textDiv.textContent = text
                                card.appendChild(textDiv)
                            }
                            if (depiction) {
                                const imgContainer = document.createElement("div")
                                imgContainer.style.marginBottom = "0.3em"
                                const img = document.createElement("img")
                                img.src = depiction
                                img.alt = "Fragment depiction"
                                img.style.maxWidth = "100%"
                                img.style.maxHeight = "6em"
                                img.style.objectFit = "contain"
                                imgContainer.appendChild(img)
                                card.appendChild(imgContainer)
                            }
                            const meta = document.createElement("div")
                            meta.className = "fragment-card-meta"
                            // Fragment values come from RERUM, which does not constrain them on read.
                            // Build these with textContent so entity data can never be parsed as markup.
                            const addMeta = (label, value) => {
                                if (!value) return
                                const span = document.createElement("span")
                                const strong = document.createElement("strong")
                                strong.textContent = `${label}:`
                                span.append(strong, value)
                                meta.appendChild(span)
                            }
                            addMeta("Language", language)
                            addMeta("Format", glossFormat)
                            addMeta("Location", glossLocation)
                            addMeta("Hand", glossatorHand)
                            if (manuscript) {
                                const msSpan = document.createElement("span")
                                const strong = document.createElement("strong")
                                strong.textContent = "Manuscript:"
                                const msLink = document.createElement("a")
                                msLink.href = `manuscript-profile.html#${manuscript}`
                                msLink.target = "_blank"
                                msLink.textContent = manuscript.split("/").pop()
                                msSpan.append(strong, msLink)
                                meta.appendChild(msSpan)
                            }
                            card.appendChild(meta)
                            fragmentsContainer.appendChild(card)
                        }
                    }).catch(() => {
                        fragmentsContainer.innerHTML = "<div class='fragment-card'><div class='fragment-card-header'>Could not load Witness Fragments</div></div>"
                    })
                    // The place in the source text being glossed, the same value the Browse Glosses
                    // table shows under "Reference".  Glosses record this as canonicalReference or as
                    // targetChapter/targetVerse, never as a `target` key.
                    targetElem.innerText = deerUtils.getCanonicalReference(glossData) || "—"
                }

                // Toggle the slide open/close.
                details.classList.toggle("is-open")
            })

            $this.classList.remove("is-hidden")
        }

        /**
         * A Gloss entity is being deleted through the managed-glosses.html interface.  
         * Delete the Gloss, the Annotations targeting the Gloss, the Witnesses of the Gloss, and the Witnesses' Annotations.
         * Remove this Gloss from the public list if it is in the list.
         * Paginate by removing the Gloss from the Gloss list on screen.
         * 
         * @param id {String} The Gloss IRI.
         */
        async function deleteManagedGloss(id=glossHashID) {
            /**
             * A specialized list overwrite.  
             * Remove the itemListElement entry whose @id matches the provided parameter.
             * Overwrite the list with this entry removed.
             * @param {String} The IRI of Gloss to remove from the public list.
             */ 
            async function removeGlossFromPublicList(glossURI){
                if(!glossURI) throw new Error("There was no gloss uri provided to delete.")
                const publicList = await fetch(__constants.ngCollection).then(resp => resp.json()).catch(err => {return null})
                const items = publicList.itemListElement.filter(obj => {
                    const negotiatedId = obj["@id"] ?? obj.id
                    return negotiatedId.split('/').pop() !== glossURI.split('/').pop()
                })
                const list = {
                    '@id': __constants.ngCollection,
                    '@context': 'https://schema.org/',
                    '@type': "ItemList",
                    name: "Gallery of Glosses Public Glosses List",
                    numberOfItems: items.length,
                    itemListElement: items
                }
                fetch(`${__constants.tiny}/overwrite`, {
                    method: "PUT",
                    mode: 'cors',
                    body: JSON.stringify(list),
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    }
                })
                .then(r => {
                    if (r.ok) {
                        return r.json()
                    } else {
                        throw new Error('Failed to save')
                    }
                })
                .then(data => {
                    const ev = new CustomEvent("The Gloss has been deleted and removed from the public list.")
                    globalFeedbackBlip(ev, `The Gloss has been deleted and removed from the public list.`, true)    
                })
                .catch(err => {
                    const ev = new CustomEvent("Public List Update Failed")
                    UTILS.globalFeedbackBlip(ev, `The Gloss was not deleted correctly and it may still be in the public list.`, true)
                    console.error(err)
                })
            }

            if(!id){
                alert(`No URI supplied for delete.  Cannot delete.`)
                return
            }
            let confirmMessage = "Really delete this Gloss and remove its Witness Fragments?\n(Cannot be undone)"
            let overwriteList = false
            if(await isPublicGloss(id)){
                confirmMessage = `This Gloss is public and will be removed from the public list.\n${confirmMessage}`
                overwriteList = true
            }
            // Confirm they want to do this.  lockFields false: this page has nothing that unlocks the
            // fields again, so taking the page wide lock here freezes the list for the rest of the session.
            if (!await showCustomConfirm(confirmMessage, false)) return
            let allWitnessFragmentsOfGloss = await getAllWitnessFragmentsOfGloss(id)
            const historyWildcard = { "$exists": true, "$size": 0 }

            // Get all Annotations throughout history targeting this object that were generated by this application.
            const allAnnotationsTargetingEntityQueryObj = {
                target: httpsIdArray(id),
                "__rerum.generatedBy" : httpsIdArray(__constants.generator)
            }
            const allEntityAnnotationIds = await getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
            .then(annos => annos.map(anno => anno["@id"] ?? anno.id))
            .catch(err => {
                alert("Could not gather Annotations to delete.")
                console.log(err)
                return null
            })

            // This is bad enough to stop here, we will not continue on towards deleting the entity.
            if(allEntityAnnotationIds === null) throw new Error("Cannot find Entity Annotations")

            const allEntityAnnotations = allEntityAnnotationIds.map(annoUri => {
                const annoId = annoUri.split("/").pop()
                return fetch(`${__constants.tiny}/delete/${annoId}`, {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    }
                })
                .then(async r => {
                    if(r.ok) {return r}
                    else {throw new Error(await r.text())}
                })
                .catch(err => { 
                    console.warn("issue removing Gloss Entity Annotations")
                    console.error(err)
                    return err
                })
            })

            const allWitnessFragmentDeletes = allWitnessFragmentsOfGloss.map(witnessURI => {
                return deleteWitnessFragment(witnessURI, false)
            })

            // Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
            await Promise.all(allEntityAnnotations).then(success => {
                console.log("Connected Annotationss successfully removed.")
            })
            .catch(err => {
                // OK they may be orphaned.  We will continue on towards deleting the entity.
                console.warn("There was an issue removing connected Annotations.")
                console.log(err)
            })

            // Wait for these to succeed or fail before moving on.  If the page finishes and redirects before this is done, that would be a bummer.
            await Promise.all(allWitnessFragmentDeletes).then(success => {
                console.log("Connected WitnessFragments successfully removed.")
            })
            .catch(err => {
                // OK they may be orphaned.  We will continue on towards deleting the entity.
                console.warn("There was an issue removing connected Witnesses.")
                console.log(err)
            })

            // Now the entity itself
            const glossId = id.split("/").pop()
            fetch(`${__constants.tiny}/delete/${glossId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                }
            })
            .then(async r => {
                if(r.ok){
                    if(overwriteList){
                        // If a Gloss that was on the public list was removed, then we need to change the public list still.
                        await removeGlossFromPublicList(id)     
                    }
                    const ev = new CustomEvent("This Gloss has been deleted.")
                    globalFeedbackBlip(ev, `Gloss Deleted.`, true)
                    broadcast(ev, "GlossDeleted", document, { "@id":id, "redirect":false })
                }
                else{
                    throw new Error(await r.text())
                }
            })
            .catch(err => {
                console.error(`Error deleting the Gloss ${id}`, err)
                const err_ev = new CustomEvent("Gloss Delete Error")
                broadcast(err_ev, "GlossDeleteError", document, { "@id":id, "error":err })
                return err
            })
        }
    }

    disconnectedCallback() {
        // The keydown handler lives on document, so it outlives this element unless it is aborted.
        this.#listeners?.abort()
    }
}

customElements.define('manage-gloss-modal', ManageGlossModal)
