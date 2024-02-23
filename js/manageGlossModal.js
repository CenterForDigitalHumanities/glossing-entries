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
            const glossID = glossData["@id"]
            const published = glossData.published
            const glossText = glossData.text
            const glossTitle = `${published ? "✓" : "❌"}  ${glossData.title}`

            const removeBtn = `<input type="button" value="delete" glossid="${glossID}" data-type="named-gloss" class="removeCollectionItem button error is-small" title="Delete This Entry">`
            const visibilityBtn = `<input type="button" value="${published ? "unpublish" : "publish"}" class="togglePublic button ${published ? "error" : "success"} is-small" glossid="${glossID.replace(/^https?:/, 'http:')}" title="Toggle public visibility"/>`
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
                removeFromCollectionAndDelete(itemID)
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
         * An Gloss entity is being deleted.  
         * Delete the Gloss, the Annotations targeting the Gloss, the Witnesses of the Gloss, and the Witnesses' Annotations.
         * Remove this Gloss from the public list.
         * Paginate the list on screen and remove this entry.
         * @param id {String} The archtype object's IRI.
         */
        async function removeFromCollectionAndDelete(id) {
            // New Gloss data structure requires a new delete function.  It is not ready at this time.
            const ev = new CustomEvent("Not ready")
            globalFeedbackBlip(ev, `Under construction at this time :(`, false)
            return

            if(!id){
                alert(`No URI supplied for delete.  Cannot delete.`)
                return
            }

            // Confirm they want to do this
            if (!confirm(`Really delete this Gloss and remove its Witnesses?\n(Cannot be undone)`)) return

            const historyWildcard = { "$exists": true, "$size": 0 }

            // Get all Annotations throughout history targeting this object that were generated by this application.
            const allAnnotationsTargetingEntityQueryObj = {
                target: UTILS.httpsIdArray(id),
                "__rerum.generatedBy" : UTILS.httpsIdArray(DEER.GENERATOR)
            }
            const allAnnotationIds = await UTILS.getPagedQuery(100, 0, allAnnotationsTargetingEntityQueryObj)
            .then(annos => annos.map(anno => anno["@id"]))
            .catch(err => {
                alert("Could not gather Annotations to delete.")
                console.log(err)
                return null
            })
            // This is bad enough to stop here, we will not continue on towards deleting the entity.
            if(allAnnotationIds === null) return

            const allAnnotations = allAnnotationIds.map(annoUri => {
                return fetch(config.URLS.DELETE, {
                    method: "DELETE",
                    body: JSON.stringify({"@id":annoUri.replace(/^https?:/,'https:')}),
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    }
                })
                .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
                .catch(err => { 
                    console.warn(`There was an issue removing an Annotation: ${annoUri}`)
                    console.log(err)
                    const ev = new CustomEvent("RERUM error")
                    globalFeedbackBlip(ev, `There was an issue removing an Annotation: ${annoUri}`, false)
                })
            })

            // TODO Get all the Witnesses of this Gloss use deleteWitness() on each Witness.
            
            // In this case, we don't have to wait on these.  We can run this and the entity delete syncronously.
            Promise.all(allAnnotations).then(success => {
                console.log("Connected Annotations successfully removed.")
            })
            .catch(err => {
                // OK they may be orphaned.  We will continue on towards deleting the entity.
                console.warn("There was an issue removing connected Annotations.")
                console.log(err)
            })

            // Now the entity itself
            fetch(config.URLS.DELETE, {
                method: "DELETE",
                body: JSON.stringify({"@id":id}),
                headers: {
                    "Content-Type": "application/json; charset=utf-8",
                    "Authorization": `Bearer ${window.GOG_USER.authorization}`
                }
            })
            .then(r => {
                if(r.ok){
                    document.querySelector(`[deer-id="${id}"]`).closest("li").remove()
                }
                else{
                    return Promise.reject(Error(r.text))
                }
            })
            .catch(err => { 
                alert(`There was an issue removing the ${thing} with URI ${id}.  This item may still appear in collections.`)
                console.log(err)
                const ev = new CustomEvent("RERUM error")
                globalFeedbackBlip(ev, `There was an issue removing the ${thing} with URI ${id}.  This item may still appear in collections.`, false)
            })

            // TODO Make sure this Gloss is not in the public list.  overwrite the list if necessary.

        }

        /**
         * Delete a Witness (Text) (of a Gloss) and all of the Witness's Annotations.
         * This occurs when deleting a Gloss.  This must be called for each of its Witnesses. 
         */ 
        async function deleteWitness(textWitnessID){
            if(!textWitnessID) return
            // No extra clicks while you await.
            const deleteWitnessButton = document.querySelector(".deleteWitness")
            deleteWitnessButton.setAttribute("disabled", "true")
            const annos_query = {
                "target" : httpsIdArray(textWitnessID),
                "__rerum.generatedBy" : httpsIdArray(__constants.generator)
            }
            let anno_ids =
                await fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8"                },
                    body: JSON.stringify(annos_query)
                })
                .then(resp => resp.json()) 
                .then(annos => annos.map(anno => anno["@id"]))
                .catch(err => {
                    return []
                })
            let delete_calls = anno_ids.map(annoUri => {
                return fetch(`${__constants.tiny}/delete`, {
                    method: "DELETE",
                    body: JSON.stringify({ "@id": annoUri.replace(/^https?:/, 'https:') }),
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    }
                })
                .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
                .catch(err => {
                    console.warn(`There was an issue removing an Annotation: ${annoUri}`)
                    console.log(err)
                })
            })

            delete_calls.push(
                fetch(`${__constants.tiny}/delete`, {
                    method: "POST",
                    mode: "cors",
                    headers: {
                        "Content-Type": "application/json; charset=utf-8",
                        "Authorization": `Bearer ${window.GOG_USER.authorization}`
                    },
                    body: JSON.stringify({"@id" : textWitnessID.replace(/^https?:/, 'https:')})
                })
                .then(resp => resp.json()) 
                .then(r => r.ok ? r.json() : Promise.reject(Error(r.text)))
                .catch(err => {
                    console.warn(`There was an issue removing the Witness: ${textWitnessID}`)
                    console.log(err)
                })
            )
            Promise.all(delete_calls).then(success => {
                const glossID = document.querySelector("input[custom-key='references']").value
                addEventListener("globalFeedbackFinished", ev=> {
                    window.location = `ng.html#${glossID}`
                })
                const ev = new CustomEvent("Witness Deleted.  You will be redirected.")
                globalFeedbackBlip(ev, `Witness Deleted.  You will be redirected.`, true)
            })
            .catch(err => {
                // OK they may be orphaned.  We will continue on towards deleting the entity.
                console.warn("There was an issue removing connected Annotations.")
                console.error(err)
                const ev = new CustomEvent("Error Deleting Witness")
                globalFeedbackBlip(ev, `Error Deleting Witness.  It may still appear.`, false)
            })
        }
    }
}

customElements.define('manage-gloss-modal', ManageGlossModal)
