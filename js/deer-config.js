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
                function filterGlosses(queryString=''){
                    const query = queryString.trim().toLowerCase()
                    for (const prop in query) {
                        if (typeof query[prop] === 'string') {
                            query[prop] = query[prop].trim()
                        }
                    }
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
        /**
         * The Gloss list on glosses.html
         * Users should see the GoG-Named-Glosses collection.  They can filter the list of titles using a text input that matches on title.
         */ 
        ngListFilterable: function (obj, options = {}) {
            return{
                html: `
                <style>
                    .cachedNotice{
                      margin-top: -1em;
                      display: block;
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
                <small class="cachedNotice is-hidden text-primary"> These Glosses were cached.  To reload the data <a class="newcache tag is-small">click here</a>. </small>
                <form id="ngForm" deer-type="Gloss" deer-context="http://www.loc.gov/mods" class="row">
                    <input id="search-bar" filter="title" type="text" deer-key="title" placeholder="&hellip;Type to filter by incipit, text, or targeted text" class="is-hidden serifText row">
                    <input type="hidden" deer-key="targetCollection" value="GoG-Named-Glosses">
                    <input is="auth-creator" type="hidden" deer-key="creator" />
                    <style>
                        #search-submit {
                          background: none;
                          border: none;
                          color: blue;
                          text-decoration: underline;
                          cursor: pointer;
                          font-size: 0.8em;
                          padding-left: 0;
                        }
                        @keyframes fadeIn {
                          0% { opacity: 0; height: 0em; }
                          100% { opacity: 1; height: auto; }
                        }
                        #search-submit:not(.fade) {
                          display: inline-block;
                          animation: fadeIn 0.5s forwards;
                        }
                        @keyframes fadeOut {
                          0% { opacity: 1; height: auto; }
                          100% { opacity: 0; height: 0em; }
                        }
                        #search-submit.fade {
                          animation: fadeOut 0.5s forwards;
                        }
                    </style>
                    <input id="search-submit" type="submit" value="Not finding what you're looking for? Create a new gloss..." class="fade serifText row">
                </form>
                <div class="progressArea">
                    <p class="filterNotice is-hidden"> Gloss filter detected.  Please note that Glosses will appear as they are fully loaded. </p>
                    <div class="totalsProgress" count="0"> {loaded} out of {total} loaded (0%).  This may take a few minutes.  You may click to select any Gloss loaded already.</div>
                </div>
                `,
                then: (elem) => {
                    const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    let numloaded = 0
                    let total = 0
                    const filterPresent = deerUtils.getURLParameter("gog-filter")
                    const filterObj = filterPresent ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
                    if (options.list) {
                        let ul = document.createElement("ul")
                        const deduplicatedList = deerUtils.removeDuplicates(obj[options.list], '@id')
                        total = deduplicatedList.length                
                        deduplicatedList.forEach((val, index) => {
                            const glossID = val["@id"].replace(/^https?:/, 'https:')
                            let li = document.createElement("li")
                            li.setAttribute("deer-id", glossID)
                            let a = document.createElement("a")
                            a.setAttribute("href", options.link+glossID)
                            a.setAttribute("target", "_blank")
                            let span = document.createElement("span")
                            if(cachedFilterableEntities.get(glossID)){
                                // We cached it in the past and are going to trust it right now.
                                const cachedObj = cachedFilterableEntities.get(glossID)
                                let filteringProps = Object.keys(cachedObj)
                                // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem (already have the data).
                                if(filterPresent){
                                    li.classList.add("is-hidden")
                                }
                                // Add all Gloss object properties to the <li> element as attributes to match on later
                                filteringProps.forEach( (prop) => {
                                    // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                                    if(prop === "text"){
                                        const t = cachedObj[prop]?.value?.textValue ?? ""
                                        li.setAttribute("data-text", t) 
                                    }
                                    else if(typeof deerUtils.getValue(cachedObj[prop]) === "string" || typeof deerUtils.getValue(cachedObj[prop]) === "number") {
                                        let val = deerUtils.getValue(cachedObj[prop])+"" //typecast to a string
                                        prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                        const attr = `data-${prop}`
                                        if(prop === "title" && !val){
                                            val = "[ unlabeled ]"
                                            li.setAttribute("data-unlabeled", "true")
                                        }
                                        li.setAttribute(attr, val)
                                    }
                                })

                                if(!li.hasAttribute("data-title")) {
                                    li.setAttribute("data-title", "[ unlabeled ]")
                                    li.setAttribute("data-unlabeled", "true")
                                }
                                li.setAttribute("data-expanded", "true")
                                span.innerText = deerUtils.getLabel(cachedObj) ? deerUtils.getLabel(cachedObj) : "Label Unprocessable"
                                numloaded++
                                a.appendChild(span)
                                li.appendChild(a)
                                ul.appendChild(li)
                            }
                            else{
                                // This object was not cached so we do not have its properties.
                                // Make this a deer-view so this Gloss is expanded and we can make attributes from its properties.
                                let div = document.createElement("div")
                                div.setAttribute("deer-link", "ng.html#")
                                div.setAttribute("deer-template", "filterableListItem")
                                div.setAttribute("deer-id", glossID)
                                if(filterPresent) div.classList.add("is-hidden")
                                div.classList.add("deer-view")
                                span.innerText = `Loading Gloss #${index + 1}...`
                                a.appendChild(span)
                                li.appendChild(a)
                                div.appendChild(li)
                                ul.appendChild(div)
                            }
                        })
                        elem.appendChild(ul)
                    }

                    elem.$contentState = ""
                    if(filterPresent){
                        elem.querySelector(".filterNotice").classList.remove("is-hidden")
                        elem.$contentState = deerUtils.getURLParameter("gog-filter").trim()
                    }
                    const totalsProgress = elem.querySelector(".totalsProgress")
                    // Note 'filter' will need to change here.  It will be a lot of filters on some faceted search UI.  It is the only input right now.
                    const filter = elem.querySelector('input')
                    const cachedNotice = elem.querySelector(".cachedNotice")
                    const progressArea = elem.querySelector(".progressArea")
                    // Pagination for the progress indicator element.  It should know how many of the items were in cache and 'fully loaded' already.
                    totalsProgress.innerText = `${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%).  This may take a few minutes.  You may click to select any Gloss loaded already.`
                    totalsProgress.setAttribute("total", total)
                    totalsProgress.setAttribute("count", numloaded)

                    // FIXME this can be improved.  We need to update localStorage, not completely refresh it.
                    elem.querySelector(".newcache").addEventListener("click", ev => {
                        localStorage.clear()
                        location.reload()
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
                        hideSearchBar()
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
                        for (const prop in query) {
                            if (typeof query[prop] === 'string') {
                                query[prop] = query[prop].trim()
                            }
                        }
                        const items = elem.querySelectorAll('li')
                        items.forEach(li=>{
                            const templateContainer = li.parentElement.hasAttribute("deer-template") ? li.parentElement : null
                            const elem = templateContainer ?? li
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
            }
        },

        /**
         * The Gloss selector for gloss-transcription.html.
         * Users should see the GoG-Named-Glosses collection.  They can filter the list of titles using a text input that matches on title.
         * The collection items have a button that, when clicked, attaches them to the T-PEN transcription text selected.
         * When an existing witness is provided via the URL Hash, newly selected Glosses will update the Gloss reference to the text.
         * Note this works in tandem with a tpen-line-selector element and the ?gog-filter Filter State URL parameter.
         */ 
        glossesSelectorForTextualWitness: function (obj, options = {}) {
            return{
                html: `
                    <style>
                        .cachedNotice{
                            margin-top: -1em;
                            display:block;
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
                            width: 6em;
                        }

                        .attached-to-source.primary{
                            background-color: mark;
                            color: black;
                            border: 1px solid black;
                        }
                    </style>
                    <input type="hidden" custom-key="references" />
                    <div class="col glossPicker">
                        <h2 class="nomargin">Attach Gloss</h2>
                        <small class="cachedNotice is-hidden text-primary"> These Glosses were cached.  To reload the data <a class="newcache tag is-small">click here</a>. </small>
                        <p class="filterInstructions is-hidden"> 
                            Use the filter to narrow down your options.  Select a single Gloss from the list to attach this witness to. 
                        </p>
                        <input filter="title" type="text" placeholder="&hellip;Type to filter by incipit, text, or targeted text" class="is-hidden serifText">
                        <gloss-modal-button class="is-right is-hidden"></gloss-modal-button>
                        <div class="progressArea">
                            <p class="filterNotice is-hidden"> Gloss filter detected.  Please note that Glosses will appear as they are fully loaded. </p>
                            <div class="totalsProgress" count="0"> 
                                {loaded} out of {total} loaded (0%)<br>
                                You may click to select any Gloss loaded already.<br>
                                A filter will become available when all items are loaded.
                            </div>
                        </div>
                    </div>
                `,
                then: (elem) => {
                    const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    let numloaded = 0
                    let total = 0
                    const filterPresent = deerUtils.getURLParameter("gog-filter")
                    const filterObj = filterPresent ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
                    if (options.list) {
                        let ul = document.createElement("ul")
                        const deduplicatedList = deerUtils.removeDuplicates(obj[options.list], '@id')
                        total = deduplicatedList.length                
                        deduplicatedList.forEach((val, index) => {
                            let inclusionBtn = document.createElement("input")
                            const glossID = val['@id'].replace(/^https?:/, 'https:')
                            inclusionBtn.setAttribute("type", "button")
                            inclusionBtn.classList.add("toggleInclusion")
                            inclusionBtn.classList.add("button")
                            inclusionBtn.setAttribute("data-id", glossID)
                            let already = witnessesObj?.referencedGlosses?.has(glossID) ? "attached-to-source" : ""
                            if(already) inclusionBtn.classList.add(already)
                            if(glossID === referencedGlossID){
                                inclusionBtn.setAttribute("disabled","")
                                inclusionBtn.setAttribute("title","This Gloss is already attached!")
                                inclusionBtn.setAttribute("value", "✓ attached")
                                inclusionBtn.classList.add("success")
                            }
                            else{
                                inclusionBtn.setAttribute("title", `${already ? "This gloss was attached in the past.  Be sure before you attach it."  : "Attach this Gloss and Save"}`)
                                inclusionBtn.setAttribute("value", `${already ? "❢" : "➥"} attach`)
                                inclusionBtn.classList.add("primary")
                            }
                            let li = document.createElement("li")
                            li.setAttribute("deer-id", glossID)
                            let a = document.createElement("a")
                            a.setAttribute("href", options.link+glossID)
                            a.setAttribute("target", "_blank")
                            let span = document.createElement("span")
                            if(cachedFilterableEntities.get(glossID)){
                                // We cached it in the past and are going to trust it right now.
                                const cachedObj = cachedFilterableEntities.get(glossID)
                                let filteringProps = Object.keys(cachedObj)
                                // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem (already have the data).
                                if(filterPresent){
                                    li.classList.add("is-hidden")
                                }
                                filteringProps.forEach( (prop) => {
                                    // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                                    if(prop === "text"){
                                        const t = cachedObj[prop]?.value?.textValue ?? ""
                                        li.setAttribute("data-text", t) 
                                    }
                                    else if(typeof deerUtils.getValue(cachedObj[prop]) === "string" || typeof deerUtils.getValue(cachedObj[prop]) === "number") {
                                        let val = deerUtils.getValue(cachedObj[prop])+"" //typecast to a string
                                        prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                        const attr = `data-${prop}`
                                        if(prop === "title" && !val){
                                            val = "[ unlabeled ]"
                                            li.setAttribute("data-unlabeled", "true")
                                        }
                                        li.setAttribute(attr, val)
                                    }
                                })
                                if(!li.hasAttribute("data-title")) {
                                    li.setAttribute("data-title", "[ unlabeled ]")
                                    li.setAttribute("data-unlabeled", "true")
                                }
                                li.setAttribute("data-expanded", "true")
                                span.innerText = deerUtils.getLabel(cachedObj) ? deerUtils.getLabel(cachedObj) : "Label Unprocessable"
                                numloaded++
                                a.appendChild(span)
                                li.appendChild(inclusionBtn)
                                li.appendChild(a)
                                ul.appendChild(li)
                            }
                            else{
                                // This object was not cached so we do not have its properties.
                                // Make this a deer-view so this Gloss is expanded and we can make attributes from its properties.
                                let div = document.createElement("div")
                                div.setAttribute("deer-template", "filterableListItem")
                                div.setAttribute("deer-link", "ng.html#")
                                div.setAttribute("deer-id", glossID)
                                if(filterPresent) div.classList.add("is-hidden")
                                div.classList.add("deer-view")
                                span.innerText = `Loading Gloss #${index + 1}...`
                                a.appendChild(span)
                                li.appendChild(a)
                                div.appendChild(li)
                                ul.appendChild(div)
                            }
                        })
                        elem.querySelector(".glossPicker").appendChild(ul)
                    }
                    elem.listCache = new Set()
                    elem.$contentState = ""
                    if(filterPresent){
                        elem.querySelector(".filterNotice").classList.remove("is-hidden")
                        elem.$contentState = deerUtils.getURLParameter("gog-filter").trim()
                    }
                    const totalsProgress = elem.querySelector(".totalsProgress")
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
                    elem.querySelector(".newcache").addEventListener("click", ev => {
                        localStorage.clear()
                        location.reload()
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
                        const note = ev.target.classList.contains("attached-to-source") 
                           ? `This Gloss has already been attached to this source.  Normally it would not appear in the same source a second time.  Be sure before you attach this Gloss.\nSave this textual witness for Gloss '${glossIncipit}'?`
                           : `Save this textual witness for Gloss '${glossIncipit}'?`
                        if(confirm(note)){
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
                        hideSearchBar()
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
                        for (const prop in query) {
                            if (typeof query[prop] === 'string') {
                                query[prop] = query[prop].trim()
                            }
                        }
                        const items = elem.querySelectorAll('li')
                        items.forEach(li=>{
                            const templateContainer = li.parentElement.hasAttribute("deer-template") ? li.parentElement : null
                            const elem = templateContainer ?? li
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
            }
        },

        /**
         * This corresponds to an existing <li> element in ngListerFilterable or glossesSelectorForTextualWitness with a deer-id property.  These <li> elements need to be filterable.
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
                    span.classList.add("serifText")
                    const createScenario = elem.hasAttribute("create-scenario")
                    const updateScenario = elem.hasAttribute("update-scenario")   
                    const increaseTotal = ((createScenario || updateScenario))
                    const filterPresent = containingListElem.$contentState
                    const filterObj = filterPresent ? decodeContentState(containingListElem.$contentState) : {}
                    span.innerText = deerUtils.getLabel(obj) ? deerUtils.getLabel(obj) : "Label Unprocessable"
                    a.setAttribute("href", options.link + obj['@id'])
                    a.setAttribute("target", "_blank")
                    // Turn each property into an attribute for the <li> element
                    let action = "add"
                    if(filterPresent) elem.classList[action]("is-hidden")
                    filteringProps.forEach( (prop) => {
                        // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                        if(prop === "text"){
                            const t = obj[prop]?.value?.textValue ?? ""
                            if(filterPresent && filterObj.hasOwnProperty("text") && t.includes(filterObj["text"])) elem.classList.remove("is-hidden")
                            li.setAttribute("data-text", t) 
                        }
                        else if(typeof deerUtils.getValue(obj[prop]) === "string" || typeof deerUtils.getValue(obj[prop]) === "number") {
                            let val = deerUtils.getValue(obj[prop])+"" //typecast to a string
                            if(filterPresent && filterObj.hasOwnProperty(prop) && val.includes(filterObj[prop])) elem.classList.remove("is-hidden")
                            prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                            const attr = `data-${prop}`
                            if(prop === "title" && !val){
                                val = "[ unlabeled ]"
                                li.setAttribute("data-unlabeled", "true")
                            }
                            li.setAttribute(attr, val)
                        }
                    })

                    if(!li.hasAttribute("data-title")) {
                        li.setAttribute("data-title", "[ unlabeled ]")
                        li.setAttribute("data-unlabeled", "true")
                    }

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
                        hideSearchBar()
                    }
                }
            }
        },
        /**
         * This corresponds to an existing <li> element in managedlist with a deer-id property.  These <li> elements need to be filterable.
         * As such, they require information about the Gloss they represent, whose URI is the deer-id.
         * That element is expand()ed in order to get the information for this element to be filterable.
         * Since the object is expanded, if reasonable, it should be cached with its information (how would we know if it is out of date?)
         * If a filter was present via the URL on page load, if it matches on this <li> the <li> should be filtered immediately.
         */ 
        managedFilterableListItem: function (obj, options = {}) {
            return {
                html: ``,
                then: (elem) => {
                    let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    const containingListElem = elem.closest("deer-view")
                    // Be careful.  The publish list stores items via http://, but everything else is https://.  Beware the false mismatch.
                    const glossID = obj["@id"].replace(/^https?:/, 'https:')
                    const type = obj.name && obj.name.includes("Named-Glosses") ? "named-gloss" : "manuscript"
                    let listCache = elem.closest("deer-view[deer-template='managedlist']").listCache
                    const included = listCache.has(glossID)
                    const publishedStatus = document.createElement("span")
                    publishedStatus.setAttribute("glossid", glossID)
                    publishedStatus.classList.add("pubStatus")
                    publishedStatus.innerText = included ? "✓" : "❌"
                    let filteringProps = Object.keys(obj)
                    let li = document.createElement("li")
                    li.setAttribute("data-public", included ? "true" : "false" )
                    li.setAttribute("deer-id", glossID)
                    let a = document.createElement("a")
                    a.classList.add("galleryEntry")
                    a.setAttribute("href", options.link + obj['@id'])
                    a.setAttribute("target", "_blank")
                    a.setAttribute("glossid", glossID)
                    a.setAttribute("data-public", included ? "true" : "false" )
                    a.addEventListener('click', (ev) => {
                        ev.preventDefault()
                        ev.stopPropagation()
                        // This <li> will have all the processed data-stuff that we will want to use upstream.
                        const parentDataElem = ev.target.closest("li")
                        if(!parentDataElem.getAttribute("data-type")){
                            // Don't have enough info to manage yet
                            const wait = new CustomEvent("Please wait for this Gloss information to load.")
                            deerUtils.globalFeedbackBlip(wait, `Please wait for this Gloss information to load.`, false)
                            return
                        }
                        const glossID = parentDataElem.getAttribute("deer-id") ? parentDataElem.getAttribute("deer-id") : ""
                        const glossTitle = parentDataElem.getAttribute("data-title") ? parentDataElem.getAttribute("data-title") : ""
                        const published = parentDataElem.getAttribute("data-public") === "true" ? true : false
                        const glossText = parentDataElem.getAttribute("data-text") ? parentDataElem.getAttribute("data-text") : ""
                        const glossData = {
                            "@id": glossID,
                            "title": glossTitle,
                            "text" : glossText,
                            "published": published
                        }
                        document.querySelector("manage-gloss-modal").open(glossData)
                    })

                    let label = document.createElement("span")
                    label.innerText = deerUtils.getLabel(obj) ? deerUtils.getLabel(obj) : "Label Unprocessable"

                    // Turn each property into an attribute for the <li> element
                    filteringProps.forEach( (prop) => {
                        // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                        if(prop === "text"){
                            const t = obj[prop]?.value?.textValue ?? ""
                            li.setAttribute("data-text", t) 
                        }
                        else if(typeof deerUtils.getValue(obj[prop]) === "string" || typeof deerUtils.getValue(obj[prop]) === "number") {
                            let val = deerUtils.getValue(obj[prop])+"" //typecast to a string
                            prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                            const attr = `data-${prop}`
                            if(prop === "title" && !val){
                                val = "[ unlabeled ]"
                                li.setAttribute("data-unlabeled", "true")
                            }
                            li.setAttribute(attr, val)
                        }
                    })
                    if(!li.hasAttribute("data-title")) {
                        li.setAttribute("data-title", "[ unlabeled ]")
                        li.setAttribute("data-unlabeled", "true")
                    }
                    li.setAttribute("data-expanded", "true")
                    cachedFilterableEntities.set(glossID, obj)
                    localStorage.setItem("expandedEntities", JSON.stringify(Object.fromEntries(cachedFilterableEntities)))

                    a.appendChild(label)
                    li.appendChild(publishedStatus)
                    li.appendChild(a)
                    elem.appendChild(li)

                    // Pagination for the progress indicator element
                    const totalsProgress = containingListElem.querySelector(".totalsProgress")
                    const numloaded = parseInt(totalsProgress.getAttribute("count")) + 1
                    let total = parseInt(totalsProgress.getAttribute("total"))
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
                        saveList.classList.remove("is-hidden")
                        if(modalBtn) modalBtn.classList.remove("is-hidden")
                        if(filterInstructions) filterInstructions.classList.remove("is-hidden")
                        progressArea.classList.add("is-hidden")
                        containingListElem.querySelector(".facet-filters").classList.remove("is-hidden")
                        // containingListElem.querySelectorAll("input[status-filter]").forEach(i => {
                        //     if(filterObj.hasOwnProperty(i.getAttribute("status-filter"))){
                        //         if(filterObj[i.getAttribute("status-filter")]==="true"){
                        //             i.checked = true
                        //             debounce(i.dispatchEvent(new Event('input', { bubbles: true })))
                        //         }
                        //     }       
                        // })
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
                        hideSearchBar()
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

function debounce(func,timeout = 500) {
    let timeRemains
    return (...args) => {
        clearTimeout(timeRemains)
        timeRemains = setTimeout(()=>func.apply(this,args),timeRemains)
    }
}

function hideSearchBar() {
    const searchSubmit = document.getElementById('search-submit')
    const searchBar = document.getElementById('search-bar')
    searchBar.addEventListener("keydown", (e)=> {
        if (e.keyIdentifier == 'U+000A' || e.keyIdentifier == 'Enter' || e.keyCode == 13) {
            if (e.target.nodeName == 'INPUT' && e.target.type == 'text') {
                e.preventDefault()
            }
        }
    }, true)
    searchBar.addEventListener('input', e => searchSubmit.classList[e.target.value.trim().length === 0 ? 'add' : 'remove']("fade"), true)
}