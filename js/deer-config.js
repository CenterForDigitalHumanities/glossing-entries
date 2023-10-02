import deerUtils from "./deer-utils.js"
// import AuthButton from './auth.js'

const __constants = await fetch("../properties.json").then(r=>r.json()).catch(e=>{return {}})

const baseV1 = __constants.rerum
const tiny = __constants.tiny

export default {
    ID: "deer-id", // attribute, URI for resource to render
    TYPE: "deer-type", // attribute, JSON-LD @type
    TEMPLATE: "deer-template", // attribute, enum for custom template
    KEY: "deer-key", // attribute, key to use for annotation
    LABEL: "title", // attribute, alternate label for properties
    CONTEXT: "deer-context", // attribute, JSON-LD @context, scoped
    ATTRIBUTION: "deer-creator", // attribute, Web Annotation `creator`, scoped
    MOTIVATION: "deer-motivation", // attribute, Web Annotation `motivation`, scoped
    LIST: "deer-list", // attribute, property with resource array
    COLLECTION: "deer-collection", // attribute, name of aggregating collection
    LISTENING: "deer-listening", // attribute, name of container to watch for clicks
    LINK: "deer-link", // attribute, location of href#[deer-id] for <a>s
    VIEW: "deer-view, .deer-view", // selector, identifies render containers
    FORM: "form[deer-type]", // selector, identifies data entry containers
    ITEMTYPE: "deer-item-type", //attribute, specialty forms ('entity' by default)
    SOURCE: "deer-source", // attribute, URI for asserting annotation
    EVIDENCE: "nv-evidence", // attribute, URI for supporting evidence
    INPUTTYPE: "deer-input-type", //attribute, defines whether this is an array list, array set, or object 
    ARRAYDELIMETER: "deer-array-delimeter", //attribute, denotes delimeter to use for array.join()

    INPUTS: ["input", "textarea", "dataset", "select"], // array of selectors, identifies inputs with .value
    CONTAINERS: ["ItemList", "ItemListElement", "List", "Set", "list", "set", "@list", "@set"], // array of supported list and set types the app will dig into for array values
    PRIMITIVES: [],

    GENERATOR: __constants.generator, // The value for __rerum.generatedBy.  It should be the same as the agent encoded in the logged in user's Bearer Token.

    URLS: {
        BASE_ID: __constants.rerum,
        CREATE: __constants.tiny+"/create",
        UPDATE: __constants.tiny+"/update",
        OVERWRITE: __constants.tiny+"/overwrite",
        QUERY: __constants.tiny+"/query",
        DELETE: __constants.tiny+"/delete",
        SINCE: __constants.rerum+"/since"
    },

    EVENTS: {
        CREATED: "deer-created",
        UPDATED: "deer-updated",
        LOADED: "deer-loaded",
        NEW_VIEW: "deer-view",
        NEW_FORM: "deer-form",
        VIEW_RENDERED: "deer-view-rendered",
        FORM_RENDERED: "deer-form-rendered",
        CLICKED: "deer-clicked"
    },

    SUPPRESS: ["__rerum", "@context"], //properties to ignore
    DELIMETERDEFAULT: ",", //Default delimeter for .split()ing and .join()ing 
    ROBUSTFEEDBACK: true, //Show warnings along with errors in the web console.  Set to false to only see errors.  

    /**
     * Add any custom templates here through import or copy paste.
     * Templates added here will overwrite the defaults in deer-render.js.
     * 
     * Each property must be lower-cased and return a template literal
     * or an HTML String.
     */
    TEMPLATES: {
        msList: function (obj, options = {}) {
            // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
            let tmpl = `<a href="./manage-mss.html" class="button">Manage Manuscript Glosses</a> <h2>Manuscripts</h2>`
            if (options.list) {
                tmpl += `<ul>`
                obj[options.list].forEach((val, index) => {
                    tmpl += `<li>
                    <a href="${options.link}${val['@id']}">
                    [ <deer-view deer-id="${val["@id"]}" deer-template="prop" deer-key="alternative"></deer-view> ] <deer-view deer-id="${val["@id"]}" deer-template="label">${index + 1}</deer-view>
                    </a>
                    </li>`
                })
                tmpl += `</ul>`
            }
            return tmpl
        },
        ngList: function (obj, options = {}) {
            // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
            let html = `<a href="./manage-glosses.html" class="button">Manage Glosses</a> <h2>Glosses</h2>
            <input type="text" placeholder="&hellip;Type to filter by incipit" class="is-hidden">`
            if (options.list) {
                html += `<ul>`
                obj[options.list].forEach((val, index) => {
                    html += `<li>
                    <a href="${options.link}${val['@id']}">
                    <span deer-id="${val["@id"]}">${index + 1}</span>
                    </a>
                    </li>`
                })
                html += `</ul>`
            }
            const then = async (elem) => {
                const listing = elem.getAttribute("deer-listing")
                const pendingLists = !listing || fetch(listing).then(res => res.json())
                    .then(list => {
                        list[elem.getAttribute("deer-list") ?? "itemListElement"]?.forEach(item => {
                            const record = elem.querySelector(`[deer-id='${item?.['@id'] ?? item?.id ?? item}'`)
                            if (typeof record === 'object' && record.nodeType !== undefined) {
                                record.innerHTML = item.label
                                record.closest('a').classList.add("cached")
                            }
                        })
                    })
                await pendingLists
                const newView = new Set()
                elem.querySelectorAll("a:not(.cached) span").forEach((item,index) => {
                    item.classList.add("deer-view")
                    item.setAttribute("deer-template","label")
                    newView.add(item)
                })
                const filter = elem.querySelector('input')
                filter.classList.remove('is-hidden')
                filter.addEventListener('input',ev=>debounce(filterGlosses(ev?.target.value)))
                function debounce(func,timeout = 500) {
                    let timeRemains
                    return (...args) => {
                        clearTimeout(timeRemains)
                        timeRemains = setTimeout(()=>func.apply(this,args),timeRemains)
                    }
                }
                function filterGlosses(queryString=''){
                    const query = queryString.trim().toLowerCase()
                    const items = elem.querySelectorAll('li')
                    items.forEach(el=>{
                        const action = el.textContent.trim().toLowerCase().includes(query) ? "remove" : "add"
                        el.classList[action](`is-hidden`,`un${action}-item`)
                        setTimeout(()=>el.classList.remove(`un${action}-item`),500)
                    })
                }
                deerUtils.broadcast(undefined, "deer-view", document, { set: newView })
            }
            return { html, then }
        },
        ngListFilterable: function (obj, options = {}) {
            // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
            let html = `
            <style>
                .cachedNotice{
                  top: -2em;
                  position: relative;
                  font-family: "Eczar","Volkhov",serif;
                  font-size: 11pt;
                }

                .progressArea{
                  font-family: "Eczar","Volkhov",serif;
                }

                .cachedNotice a{
                  cursor: pointer;
                }

                .totalsProgress{
                  text-align: center;
                  background-color: rgba(0, 0, 0, 0.1);
                  padding-top: 4px;
                  font-size: 13pt;
                }
            </style>
            <h2> Glosses </h2>
            <div class="cachedNotice is-hidden"> These Glosses were cached.  To reload the data <a class="newcache">click here</a>. </div>
            <input filter="title" type="text" placeholder="&hellip;Type to filter by incipit, text, or targeted text" class="is-hidden">
            <div class="progressArea">
                <p class="filterNotice is-hidden"> Gloss filter detected.  Please note that Glosses will appear as they are fully loaded. </p>
                <div class="totalsProgress" count="0"> {loaded} out of {total} loaded (0%).  This may take a few minutes.  You may click to select any Gloss loaded already.</div>
            </div>`
            
            // Grab the cached expanded entities from localStorage.  Note that there is nothing to check on "staleness"
            const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
            let numloaded = 0
            const total = obj[options.list].length
            const filterPresent = deerUtils.getURLParameter("gog-filter") ? true : false
            const filterObj = filterPresent ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
            if (options.list) {
                // Then obj[options.list] is the entire GoG-Named-Glosses collection, URIs only.
                html += `<ul>`
                const hide = filterPresent ? "is-hidden" : ""
                obj[options.list].forEach((val, index) => {
                    const glossID = val["@id"].replace(/^https?:/, 'https:')
                    if(cachedFilterableEntities.get(glossID)){
                        // We cached it in the past and are going to trust it right now.
                        const cachedObj = cachedFilterableEntities.get(glossID)
                        let filteringProps = Object.keys(cachedObj)
                        // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem (already have the data).
                        let li = `<li class="${hide}" deer-id="${glossID}" data-expanded="true" `
                        // Add all Gloss object properties to the <li> element as attributes to match on later
                        filteringProps.forEach( (prop) => {
                            // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                            if(typeof deerUtils.getValue(cachedObj[prop]) === "string" || typeof deerUtils.getValue(cachedObj[prop]) === "number") {
                                const value = deerUtils.getValue(cachedObj[prop])+"" //typecast to a string
                                prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                const attr = `data-${prop}`
                                li += `${attr}="${value}" `
                                if(value.includes(filterObj[prop])){
                                    li = li.replace(hide, "")
                                }
                            }
                        })
                        li += `>
                            <a href="${options.link}${glossID}">
                                <span>${deerUtils.getLabel(cachedObj) ? deerUtils.getLabel(cachedObj) : "Label Unprocessable"}</span>
                            </a>
                        </li>`
                        html += li
                        numloaded++
                    }
                    else{
                        // This object was not cached so we do not have its properties.
                        // Make this a deer-view so this Gloss is expanded and we can make attributes from its properties.
                        html += 
                        `<div deer-template="filterableListItem" deer-link="ng.html#" class="${hide} deer-view" deer-id="${glossID}">
                            <li>
                                <a href="${options.link}${glossID}">
                                    <span>Loading Gloss #${index + 1}...</span>
                                </a>
                            </li>
                        </div>`
                    }
                })    
                html += `</ul>`
            }
            const then = async (elem) => {
                elem.$contentState = ""
                if(filterPresent){
                    elem.querySelector(".filterNotice").classList.remove("is-hidden")
                    elem.$contentState = deerUtils.getURLParameter("gog-filter").trim()
                }
                let addFilterState = true
                const totalsProgress = elem.querySelector(".totalsProgress")
                const newcache = elem.querySelector(".newcache")
                // Note 'filter' will need to change here.  It will be a lot of filters on some faceted search UI.  It is the only input right now.
                const filter = elem.querySelector('input')
                const cachedNotice = elem.querySelector(".cachedNotice")
                const progressArea = elem.querySelector(".progressArea")
                // Pagination for the progress indicator element.  It should know how many of the items were in cache and 'fully loaded' already.
                totalsProgress.innerText = `${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%).  This may take a few minutes.  You may click to select any Gloss loaded already.`
                totalsProgress.setAttribute("total", total)
                totalsProgress.setAttribute("count", numloaded)

                // FIXME this can be improved.  We need to update localStorage, not completely refresh it.
                newcache.addEventListener("click", ev => {
                    localStorage.clear()
                    location.reload()
                    return
                })

                // Filter the list of glosses as users type their query against 'title'
                filter.addEventListener('input', ev =>{
                    const val = ev?.target.value.trim()
                    let filterQuery
                    if(val){
                        filterQuery = encodeContentState(JSON.stringify({"title" : ev?.target.value, "text": ev?.target.value, "targetedtext": ev?.target.value}))
                    }
                    else{
                        filterQuery = encodeContentState(JSON.stringify({"title" : ""}))
                    }
                    debounce(filterGlosses(filterQuery))
                })

                if(numloaded === total){
                    cachedNotice.classList.remove("is-hidden")
                    progressArea.classList.add("is-hidden")
                    elem.querySelectorAll("input[filter]").forEach(i => {
                        // The filters that are used now need to be selected or take on the string or whatevs
                        i.classList.remove("is-hidden")
                        if(filterObj.hasOwnProperty(i.getAttribute("filter"))){
                            i.value = filterObj[i.getAttribute("filter")]
                            i.setAttribute("value", filterObj[i.getAttribute("filter")])
                        }
                        i.dispatchEvent(new Event('input', { bubbles: true }))
                    })
                    if(filterPresent){
                        debounce(filterGlosses(elem.$contentState))
                    }
                }

                function debounce(func,timeout = 500) {
                    let timeRemains
                    return (...args) => {
                        clearTimeout(timeRemains)
                        timeRemains = setTimeout(()=>func.apply(this,args),timeRemains)
                    }
                }

                /** 
                 * This presumes things are already loaded.  Do not use this function unless all glosses are loaded.
                 * Write the new encoded filter string to the URL with no programmatic page refresh.  If the user refreshes, the filter is applied.
                 */ 
                function filterGlosses(queryString=''){
                    const numloaded = parseInt(totalsProgress.getAttribute("count"))
                    const total = parseInt(totalsProgress.getAttribute("total"))
                    if(numloaded !== total){
                        //alert("All data must be loaded to use this filter.  Please wait.")
                        const ev = new CustomEvent("All data must be loaded to use this filter.  Please wait.")
                        deerUtils.globalFeedbackBlip(ev, `All data must be loaded to use this filter.  Please wait.`, false)
                        return
                    }
                    queryString = queryString.trim()
                    const query = decodeContentState(queryString)
                    const items = elem.querySelectorAll('li')
                    items.forEach(li=>{
                        const templateContainer = li.parentElement.hasAttribute("deer-template") ? li.parentElement : null
                        const elem = templateContainer ? templateContainer : li
                        if(!elem.classList.contains("is-hidden")){
                            elem.classList.add("is-hidden")
                        }
                        for(const prop in query){
                            if(li.hasAttribute(`data-${prop}`)){
                                const action = li.getAttribute(`data-${prop}`).toLowerCase().includes(query[prop].toLowerCase()) ? "remove" : "add"

                                elem.classList[action](`is-hidden`,`un${action}-item`)
                                setTimeout(()=>elem.classList.remove(`un${action}-item`),500)
                                // If it is showing, no need to check other properties for filtering.
                                if(action === "remove") break
                            }
                        }
                    })

                    // This query was applied.  Make this the encoded query in the URL, but don't cause a page reload.
                    const url = new URL(window.location.href)
                    if(query.title){
                        url.searchParams.set("gog-filter", queryString)
                        window.history.replaceState(null, null, url)   
                    }
                    else{
                        url.searchParams.delete("gog-filter")
                        window.history.replaceState(null, null, url)
                    }
                }
            }
            return { html, then }
        },
        /**
         * The Gloss selector for gloss-transcription.html.
         * Users should see the GoG-Named-Glosses collection.  They can filter the list of titles using a text input that matches on title.
         * The collection items have a button that, when clicked, attaches them to the T-PEN transcription text selected.
         * When an existing witness is provided via the URL Hash, newly selected Glosses will update the Gloss reference to the text.
         * Note this works in tandem with a tpen-line-selector element and the ?gog-filter Filter State URL parameter.
         */ 
        glossesSelectorForTextualWitness: function (obj, options = {}) {
            // if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Gallery of Glosses users.</h4>` }
            let html = `
            <style>
                .cachedNotice{
                    position: relative;
                    font-family: "Eczar","Volkhov",serif;
                    font-size: 11pt;
                    top: -11px;
                }

                .progressArea{
                    font-family: "Eczar","Volkhov",serif;
                }

                .cachedNotice a{
                    cursor: pointer;
                }

                .totalsProgress{
                    text-align: center;
                    background-color: rgba(0, 0, 0, 0.1);
                    padding-top: 4px;
                    font-size: 11pt;
                }

                .toggleInclusion{
                    padding: 3px !important;
                    font-size: 10pt !important;
                    margin-right: 0.5em;
                }

                h2.nomargin{
                    margin: 0;
                }

                .filterInstructions{
                    font-family: "Eczar","Volkhov",serif;
                    margin: 0;
                }

            </style>
            <input type="hidden" custom-key="references" />
            <div class="col">
                <h2 class="nomargin">Attach Gloss</h2>
                <div class="cachedNotice is-hidden"> These Glosses were cached.  To reload the data <a class="newcache">click here</a>. </div>
                <p class="filterInstructions is-hidden"> 
                    Use the filter to narrow down your options.  Select a single Gloss from the list to attach this witness to. 
                </p>
                <input filter="title" type="text" placeholder="&hellip;Type to filter by incipit, text, or targeted text" class="is-hidden">
                <gloss-modal-button class="is-right is-hidden"></gloss-modal-button>
                <div class="progressArea">
                    <p class="filterNotice is-hidden"> Gloss filter detected.  Please note that Glosses will appear as they are fully loaded. </p>
                    <div class="totalsProgress" count="0"> 
                        {loaded} out of {total} loaded (0%)<br>
                        You may click to select any Gloss loaded already.<br>
                        A filter will become available when all items are loaded.
                    </div>
                </div>`
            
            // Grab the cached expanded entities from localStorage.  Note that there is nothing to check on "staleness"
            const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
            let numloaded = 0
            const total = obj[options.list].length
            const filterPresent = deerUtils.getURLParameter("gog-filter") ? true : false
            const filterObj = filterPresent ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
            if (options.list) {
                // Then obj[options.list] is the entire GoG-Named-Glosses collection, URIs only.
                html += `<ul>`
                const hide = filterPresent ? "is-hidden" : ""
                obj[options.list].forEach((val, index) => {
                    let inclusionBtn = null
                    const glossID = val['@id'].replace(/^https?:/, 'https:')
                    if(glossID === referencedGlossID){
                        inclusionBtn = `<input disabled type="button" class="toggleInclusion button success" data-id="${glossID}" title="This Gloss is already attached!" value="✓ attached"/>`
                    }
                    else{
                        inclusionBtn = `<input type="button" class="toggleInclusion button primary" data-id="${glossID}" title="Attach this Gloss and Save" value="➥ attach"/>`
                    }
                    if(cachedFilterableEntities.get(glossID)){
                        // We cached it in the past and are going to trust it right now.
                        const cachedObj = cachedFilterableEntities.get(glossID)
                        let filteringProps = Object.keys(cachedObj)
                        // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem (already have the data).
                        let li = `<li class="${hide}" deer-id="${glossID}" data-expanded="true" `
                        // Add all Gloss object properties to the <li> element as attributes to match on later
                        filteringProps.forEach( (prop) => {
                            // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                            if(typeof deerUtils.getValue(cachedObj[prop]) === "string" || typeof deerUtils.getValue(cachedObj[prop]) === "number") {
                                const value = deerUtils.getValue(cachedObj[prop])+"" //typecast to a string
                                prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                const attr = `data-${prop}`
                                li += `${attr}="${value}" `
                                if(value.includes(filterObj[prop])){
                                    li = li.replace(hide, "")
                                }
                            }
                        })
                        li += `>
                            ${inclusionBtn}
                            <a target="_blank" href="${options.link}${glossID}">
                                <span>${deerUtils.getLabel(cachedObj) ? deerUtils.getLabel(cachedObj) : "Label Unprocessable"}</span>
                            </a>
                        </li>`
                        html += li
                        numloaded++
                    }
                    else{
                        // This object was not cached so we do not have its properties.
                        // Make this a deer-view so this Gloss is expanded and we can make attributes from its properties.
                        html += 
                        `<div deer-template="filterableListItem" deer-link="ng.html#" class="${hide} deer-view" deer-id="${glossID}">
                            <li>
                                <a target="_blank" href="${options.link}${glossID}">
                                    <span>Loading Gloss #${index + 1}...</span>
                                </a>
                            </li>
                        </div>`
                    }
                })    
                html += `</ul>`
                html += `</div>`
            }
            const then = async (elem) => {
                elem.listCache = new Set()
                elem.$contentState = ""
                if(filterPresent){
                    elem.querySelector(".filterNotice").classList.remove("is-hidden")
                    elem.$contentState = deerUtils.getURLParameter("gog-filter").trim()
                }
                const totalsProgress = elem.querySelector(".totalsProgress")
                const newcache = elem.querySelector(".newcache")
                // Note 'filter' will need to change here.  It will be a lot of filters on some faceted search UI.  It is the only input right now.
                const filter = elem.querySelector('input[filter]')
                const cachedNotice = elem.querySelector(".cachedNotice")
                const progressArea = elem.querySelector(".progressArea")
                const filterInstructions = elem.querySelector(".filterInstructions")
                const modalBtn = elem.querySelector("gloss-modal-button")
                let blip = new CustomEvent("Blip")
                // Pagination for the progress indicator element.  It should know how many of the items were in cache and 'fully loaded' already.
                totalsProgress.innerHTML = `
                    ${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%)<br>
                    You may click to select any Gloss loaded already.<br>
                    A filter will become available when all items are loaded.`
                totalsProgress.setAttribute("total", total)
                totalsProgress.setAttribute("count", numloaded)

                // FIXME this can be improved.  We need to update localStorage, not completely refresh it.
                newcache.addEventListener("click", ev => {
                    localStorage.clear()
                    location.reload()
                    return
                })

                // Note the capability to select multiple that we are limiting to one.
                elem.querySelectorAll('.toggleInclusion').forEach(btn => btn.addEventListener('click', ev => {
                    ev.preventDefault()
                    ev.stopPropagation()
                    const form = ev.target.closest("form")
                    // There must be a shelfmark
                    if(!form.querySelector("input[deer-key='identifier']").value){
                        //alert("You must provide a Shelfmark value.")
                        blip = new CustomEvent("You must provide a Shelfmark value.")
                        deerUtils.globalFeedbackBlip(blip, `You must provide a Shelfmark value.`, false)
                        return
                    }
                    // There must be a selection
                    if(!form.querySelector("input[custom-key='selections']").value){
                        //alert("Select some text first")
                        blip = new CustomEvent("Select some text first.")
                        deerUtils.globalFeedbackBlip(blip, `Select some text first.`, false)
                        return   
                    }
                    const glossIncipit = ev.target.closest("li").getAttribute("data-title")
                    if(confirm(`Save this textual witness for Gloss '${glossIncipit}'?`)){
                        const customKey = elem.querySelector("input[custom-key='references']")
                        const uri = btn.getAttribute("data-id")
                        if(customKey.value !== uri){
                            customKey.value = uri 
                            customKey.setAttribute("value", uri) 
                            customKey.$isDirty = true
                            form.closest("form").$isDirty = true
                            form.querySelector("input[type='submit']").click()
                        }
                        else{
                            //alert(`This textual witness is already attached to Gloss '${glossIncipit}'`)
                            blip = new CustomEvent(`This textual witness is already attached to Gloss '${glossIncipit}'`)
                            deerUtils.globalFeedbackBlip(blip, `This textual witness is already attached to Gloss '${glossIncipit}'`, false)
                        }
                    }                    
                }))

                // Filter the list of glosses as users type their query against 'title'
                filter.addEventListener('input', ev =>{
                    const val = ev?.target.value.trim()
                    let filterQuery
                    if(val){
                        filterQuery = encodeContentState(JSON.stringify({"title" : ev?.target.value, "text": ev?.target.value, "targetedtext": ev?.target.value}))
                    }
                    else{
                        filterQuery = encodeContentState(JSON.stringify({"title" : ""}))
                    }
                    debounce(filterGlosses(filterQuery))
                })

                if(numloaded === total){
                    elem.setAttribute("ng-list-loaded", "true")
                    deerUtils.broadcast(undefined, "ng-list-loaded", elem, {})
                    cachedNotice.classList.remove("is-hidden")
                    filterInstructions.classList.remove("is-hidden")
                    modalBtn.classList.remove("is-hidden")
                    progressArea.classList.add("is-hidden")
                    elem.querySelectorAll("input[filter]").forEach(i => {
                        // The filters that are used now need to be selected or take on the string or whatevs
                        i.classList.remove("is-hidden")
                        if(filterObj.hasOwnProperty(i.getAttribute("filter"))){
                            i.value = filterObj[i.getAttribute("filter")]
                            i.setAttribute("value", filterObj[i.getAttribute("filter")])
                        }
                        i.dispatchEvent(new Event('input', { bubbles: true }))
                    })
                }

                function debounce(func,timeout = 500) {
                    let timeRemains
                    return (...args) => {
                        clearTimeout(timeRemains)
                        timeRemains = setTimeout(()=>func.apply(this,args),timeRemains)
                    }
                }

                /** 
                 * This presumes things are already loaded.  Do not use this function unless all glosses are loaded.
                 * Write the new encoded filter string to the URL with no programmatic page refresh.  If the user refreshes, the filter is applied.
                 */ 
                function filterGlosses(queryString=''){
                    const numloaded = parseInt(totalsProgress.getAttribute("count"))
                    const total = parseInt(totalsProgress.getAttribute("total"))
                    if(numloaded !== total){
                        //alert("All data must be loaded to use this filter.  Please wait.")
                        const ev = new CustomEvent("All data must be loaded to use this filter.  Please wait.")
                        deerUtils.globalFeedbackBlip(ev, `All data must be loaded to use this filter.  Please wait.`, false)
                        return
                    }
                    queryString = queryString.trim()
                    const query = decodeContentState(queryString)
                    const items = elem.querySelectorAll('li')
                    items.forEach(li=>{
                        const templateContainer = li.parentElement.hasAttribute("deer-template") ? li.parentElement : null
                        const elem = templateContainer ? templateContainer : li
                        if(!elem.classList.contains("is-hidden")){
                            elem.classList.add("is-hidden")
                        }
                        for(const prop in query){
                            if(li.hasAttribute(`data-${prop}`)){
                                const action = li.getAttribute(`data-${prop}`).toLowerCase().includes(query[prop].toLowerCase()) ? "remove" : "add"
                                elem.classList[action](`is-hidden`,`un${action}-item`)
                                setTimeout(()=>elem.classList.remove(`un${action}-item`),500)
                                // If it is showing, no need to check other properties for filtering.
                                if(action === "remove") break
                            }
                        }
                    })
                }

                // Could write content state url for the filter if desired.
                // This query was applied.  Make this the encoded query in the URL, but don't cause a page reload.
                // const url = new URL(window.location.href)
                // if(query.title){
                //     url.searchParams.set("gog-filter", queryString)
                //     window.history.replaceState(null, null, url)   
                // }
                // else{
                //     url.searchParams.delete("gog-filter")
                //     window.history.replaceState(null, null, url)
                // }
            }
            return { html, then }
        },

        /**
         * This corresponds to an existing <li> element with a deer-id property.  These <li> elements need to be filterable.
         * As such, they require information about the Gloss they represent, whose URI is the deer-id.
         * That element is expand()ed in order to get the information for this element to be filterable.
         * Since the object is expanded, if reasonable, it should be cached with its information (how would we know if it is out of date?)
         * If a filter was present via the URL on page load, if it matches on this <li> the <li> should be filtered immediately.
         */ 
        filterableListItem: function (obj, options = {}) {
            return{
                html: ``,
                then: (elem) => {
                    let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    const containingListElem = elem.closest("deer-view")
                    let filteringProps = Object.keys(obj)
                    let li = document.createElement("li")
                    let a = document.createElement("a")
                    let span = document.createElement("span")
                    const createScenario = elem.hasAttribute("create-scenario") ? true : false
                    const updateScenario = elem.hasAttribute("update-scenario") ? true : false   
                    const increaseTotal = (createScenario || updateScenario) ? true : false
                    const filterPresent = containingListElem.$contentState ? true : false
                    const filterObj = filterPresent ? decodeContentState(containingListElem.$contentState) : {}
                    span.innerText = deerUtils.getLabel(obj) ? deerUtils.getLabel(obj) : "Label Unprocessable"
                    a.setAttribute("href", options.link + obj['@id'])
                    a.setAttribute("target", "_blank")

                    // Turn each property into an attribute for the <li> element
                    let action = "add"
                    filteringProps.forEach( (prop) => {
                        // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                        if(typeof deerUtils.getValue(obj[prop]) === "string" || typeof deerUtils.getValue(obj[prop]) === "number") {
                            const val = deerUtils.getValue(obj[prop])+"" //typecast to a string
                            prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                            const attr = `data-${prop}`
                            li.setAttribute(attr, val)
                            if(filterPresent){
                                if(filterObj.hasOwnProperty(prop) && val.includes(filterObj[prop])) {
                                    action = "remove"
                                }
                            }
                        }
                    })

                    if(filterPresent) elem.classList[action]("is-hidden")
                    li.setAttribute("data-expanded", "true")
                    cachedFilterableEntities.set(obj["@id"].replace(/^https?:/, 'https:'), obj)
                    localStorage.setItem("expandedEntities", JSON.stringify(Object.fromEntries(cachedFilterableEntities)))

                    a.appendChild(span)
                    li.appendChild(a)
                    elem.appendChild(li)

                    // Pagination for the progress indicator element
                    const totalsProgress = containingListElem.querySelector(".totalsProgress")
                    const numloaded = parseInt(totalsProgress.getAttribute("count")) + 1
                    let total = parseInt(totalsProgress.getAttribute("total"))
                    if(increaseTotal) total++
                    const cachedNotice = containingListElem.querySelector(".cachedNotice")
                    const progressArea = containingListElem.querySelector(".progressArea")
                    const modalBtn = containingListElem.querySelector("gloss-modal-button")
                    const filterInstructions = containingListElem.querySelector(".filterInstructions")
                    totalsProgress.setAttribute("count", numloaded)
                    totalsProgress.setAttribute("total", total)
                    totalsProgress.innerHTML = `
                        ${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%)<br>  
                        You may click to select any Gloss loaded already.<br>
                        A filter will become available when all items are loaded.`
                    if(numloaded === total){
                        cachedNotice.classList.remove("is-hidden")
                        if(modalBtn) modalBtn.classList.remove("is-hidden")
                        if(filterInstructions) filterInstructions.classList.remove("is-hidden")
                        progressArea.classList.add("is-hidden")
                        containingListElem.querySelectorAll("input[filter]").forEach(i => {
                            // The filters that are used now need to be visible and selected / take on the string / etc.
                            i.classList.remove("is-hidden")
                            if(filterObj.hasOwnProperty(i.getAttribute("filter"))){
                                i.value = deerUtils.getValue(filterObj[i.getAttribute("filter")])
                                i.setAttribute("value", deerUtils.getValue(filterObj[i.getAttribute("filter")]))
                                i.dispatchEvent(new Event('input', { bubbles: true }))
                            }
                        })
                        containingListElem.setAttribute("ng-list-loaded", "true")
                        deerUtils.broadcast(undefined, "ng-list-loaded", containingListElem, {})
                    }
                }
            }
        }
    },
    version: "alpha"
}

/**
 * Checks array of stored roles for any of the roles provided.
 * @param {Array} roles Strings of roles to check.
 * @returns Boolean user has one of these roles.
 */
function userHasRole(roles){
    if (!Array.isArray(roles)) { roles = [roles] }
    return Boolean(window.GOG_USER?.["http://rerum.io/user_roles"]?.roles.filter(r=>roles.includes(r)).length)
}
