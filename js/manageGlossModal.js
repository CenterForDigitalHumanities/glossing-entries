import { default as deerUtils } from './deer-utils.js'

/**
  * A focused pop up containing Gloss statuses and management options.
  * Specifically designed for manage-glosses.html
*/
class ManageGlossModal extends HTMLElement {
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
        </style>

        <div class="window-shadow"> 
            <div class="manageModal container">
                <div class="card">
                    <header>
                        <h4>Gloss Title</h4>
                    </header>
                    <p>Check below for available statuses and actions for this Gloss.</p>
                    <footer>
                        <a class="button" href="#">Review</a>
                        <input type="button" class="button" value="Publish"/>
                        <input type="button" class="button" value="More..."/>
                        <input type="button" class="button" value="Delete"/>
                    </footer>
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

        // Create the modal dynamically from the chosen glosses data, provided as the parameter here.
        this.open = (glossData) => {
            // TODO esc to close?
            if(!glossData || !glossData["@id"]){
                const ev = new CustomEvent("Cannot manage this gloss")
                deerUtils.globalFeedbackBlip(ev, `Please wait for this Gloss to load.`, false)
                return
            }
            const glossID = glossData["@id"].replace(/^https?:/, 'https:')
            const published = glossData.published
            const glossText = glossData.text
            const glossTitle = `${published ? "✓" : "❌"}  ${glossData.title}`

            const removeBtn = `<input type="button" value="delete" glossid="${glossID}" data-type="named-gloss" class="removeCollectionItem button error is-small" title="Delete This Entry">`
            const visibilityBtn = `<input type="button" value="${published ? "unpublish" : "publish"}" class="togglePublic button ${published ? "error" : "success"} is-small" glossid="${glossID}" title="Toggle public visibility"/>`
            const moreOptionsBtn = `<input type="button" value="more..." glossid="${glossID}" class="otherModalBtn button primary is-small" title="See detailed modal for this Gloss">`
            const reviewBtn = `<a class="button secondary is-small" href="ng.html#${glossID}">review</a>`

            $this.querySelector("a").setAttribute("href", `ng.html#${glossID}`)
            $this.querySelector("h4").innerText = glossTitle
            $this.querySelector("p").innerText = glossText
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
                deleteGloss(itemID)
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

            // Other functionality, TBD.
            $this.querySelector(".otherModalBtn").addEventListener('click', ev => {
                ev.preventDefault()
                ev.stopPropagation()
                const fn = () => {
                    $this.classList.add("is-hidden")
                    removeEventListener("globalFeedbackFinished", fn)
                }
                addEventListener("globalFeedbackFinished", fn)
                const shout = new CustomEvent("Other Functionality")
                globalFeedbackBlip(shout, `Other Management Functionality!`, true)
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
        async function deleteGloss(id=glossHashID) {
            /**
             * A specialized list overwrite.  
             * Remove the itemListElement entry whose @id matches the provided parameter.
             * Overwrite the list with this entry removed.
             * @param {String} The IRI of Gloss to remove from the public list.
             */ 
            async function removeGlossFromPublicList(glossURI){
                if(!glossURI) throw new Error("There was no gloss uri provided to delete.")
                const publicList = await fetch(__constants.ngCollection).then(resp => resp.json()).catch(err => {return null})
                const items = publicList.itemListElement.filter(obj => obj["@id"].split().pop() !== glossURI.split().pop())
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
            let confirmMessage = "Really delete this Gloss and remove its Witnesses?\n(Cannot be undone)"
            let overwriteList = false
            if(await isPublicGloss(id)){
                confirmMessage = `This Gloss is public and will be removed from the public list.\n${confirmMessage}`
                overwriteList = true
            }
            if (!await showCustomConfirm(confirmMessage)) return

            let allWitnessesOfGloss = await getAllWitnessesOfGloss(id)
            allWitnessesOfGloss = Array.from(allWitnessesOfGloss)
            const historyWildcard = { "$exists": true, "$size": 0 }

            // Get all Annotations throughout history targeting this object that were generated by this application.
            const allAnnotationsTargetingEntityQueryObj = {
                target: httpsIdArray(id),
                "__rerum.generatedBy" : httpsIdArray(__constants.generator)
            }
            const allEntityAnnotationIds = await getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
            .then(annos => annos.map(anno => anno["@id"]))
            .catch(err => {
                alert("Could not gather Annotations to delete.")
                console.log(err)
                return null
            })

            // This is bad enough to stop here, we will not continue on towards deleting the entity.
            if(allEntityAnnotationIds === null) throw new Error("Cannot find Entity Annotations")

            const allEntityAnnotations = allEntityAnnotationIds.map(annoUri => {
                return fetch(`${__constants.tiny}/delete`, {
                    method: "DELETE",
                    body: JSON.stringify({"@id":annoUri}),
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    }
                })
                .then(r => {
                    if(!r.ok) throw new Error(r.text)
                })
                .catch(err => { 
                    console.warn(`There was an issue removing an Annotation: ${annoUri}`)
                    console.log(err)
                    const ev = new CustomEvent("RERUM error")
                    globalFeedbackBlip(ev, `There was an issue removing an Annotation: ${annoUri}`, false)
                })
            })

            const allWitnessDeletes = allWitnessesOfGloss.map(witnessURI => {
                return deleteWitness(witnessURI, false)
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
            await Promise.all(allWitnessDeletes).then(success => {
                console.log("Connected Witnesses successfully removed.")
            })
            .catch(err => {
                // OK they may be orphaned.  We will continue on towards deleting the entity.
                console.warn("There was an issue removing connected Witnesses.")
                console.log(err)
            })

            // Now the entity itself
            fetch(`${__constants.tiny}/delete`, {
                method: "DELETE",
                body: JSON.stringify({ "@id": id }),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                }
            })
            .then(r => {
                if(r.ok){
                    document.querySelector(`[deer-id="${id}"]`).closest("li").remove()
                    document.querySelector("deer-view[deer-template='managedlist']").listCache.delete(id)
                    if(overwriteList){
                        // If a Gloss that was on the public list was removed, then we need to change the public list still.
                        removeGlossFromPublicList(id)     
                    }
                    else{
                        const ev = new CustomEvent("This Gloss has been deleted.")
                        globalFeedbackBlip(ev, `Gloss Deleted.`, true)    
                    }
                }
                else{
                    throw new Error(r.text)
                }
            })
            .catch(err => {
                alert(`There was an issue removing the Gloss with URI ${id}.  This item may still appear in collections.`)
                console.log(err)
            })
        }
    }
}

customElements.define('manage-gloss-modal', ManageGlossModal)