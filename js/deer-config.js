import deerUtils from "./deer-utils.js"
// import AuthButton from './auth.js'

// Fetch configuration constants from a JSON file and handle any errors.
const __constants = await fetch("../properties.json").then(r=>r.json()).catch(e=>{return {}})

// Constants for API base URLs.
const baseV1 = __constants.rerum
const tiny = __constants.tiny

const down = "<small>▼</small>"
const up = "<small>▲</small>"
const sortSelectors = [
    a => a.children[0].innerHTML.toLowerCase(),
    a => a.children[1].children[0].children[0].innerHTML.toLowerCase(),
    a => a.children[2].innerHTML.toLowerCase()
]
const sortNULLS = [
    "",
    "[ unlabeled ]",
    ""
]

export default {
    // Configuration of custom attributes for HTML elements manipulated by the app.
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

    // Selectors for identifying different types of input elements in the DOM.
    INPUTS: ["input", "textarea", "dataset", "select"], // array of selectors, identifies inputs with .value
    CONTAINERS: ["ItemList", "ItemListElement", "List", "Set", "list", "set", "@list", "@set"], // array of supported list and set types the app will dig into for array values
    PRIMITIVES: ["creator"],

    GENERATOR: __constants.generator, // The value for __rerum.generatedBy.  It should be the same as the agent encoded in the logged in user's Bearer Token.

    // API endpoints derived from the constants, used for CRUD operations.
    URLS: {
        BASE_ID: __constants.rerum,
        CREATE: __constants.tiny+"/create",
        UPDATE: __constants.tiny+"/update",
        OVERWRITE: __constants.tiny+"/overwrite",
        QUERY: __constants.tiny+"/query",
        DELETE: __constants.tiny+"/delete",
        SINCE: __constants.rerum+"/since"
    },
    // Custom events that can be emitted by the application, for use in event listeners.
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
                          color: var(--color-primary);
                          cursor: pointer;
                          font-size: 0.8em;
                          padding-left: 0;
                        }
                        @keyframes fadeIn {
                          0% { opacity: 0; max-height: 0em; padding: 0em; }
                          100% { opacity: 1; max-height: auto; padding: auto; }
                        }
                        #search-submit:not(.fade) {
                          animation: fadeIn 0.5s forwards;
                        }
                        @keyframes fadeOut {
                          0% { opacity: 1; max-height: auto; padding: auto; }
                          100% { opacity: 0; max-height: 0em; padding: 0em; }
                        }
                        #search-submit.fade {
                          animation: fadeOut 0.5s forwards;
                        }
                    </style>
                    <input id="search-submit" type="submit" value="Not finding what you're looking for? Create a new gloss..." class="fade serifText row">
                </form>
                <div id="approximate" class="is-hidden">
                    <input type="checkbox" id="u↔v" name="u↔v" checked>
                    <label for="u↔v">u ↔ v</label>
                    <input type="checkbox" id="j↔i" name="j↔i" checked>
                    <label for="j↔i">j ↔ i</label>
                    <input type="checkbox" id="y↔i" name="y↔i" checked>
                    <label for="y↔i">y ↔ i</label>
                    <input type="checkbox" id="ae↔e" name="ae↔e" checked>
                    <label for="ae↔e">ae ↔ e</label>
                    <input type="checkbox" id="oe↔e" name="oe↔e" checked>
                    <label for="oe↔e">oe ↔ e</label>
                    <input type="checkbox" id="t↔c" name="t↔c" checked>
                    <label for="t↔c">t ↔ c</label>
                    <input type="checkbox" id="exsp↔exp" name="exsp↔exp" checked>
                    <label for="exsp↔exp">exsp ↔ exp</label>
                    <input type="checkbox" id="ignore-whitespace" name="ignore-whitespace" checked>
                    <label for="ignore-whitespace">Ignore Whitespace</label>
                </div>
                <div class="progressArea">
                    <p class="filterNotice is-hidden"> Gloss filter detected.  Please note that Glosses will appear as they are fully loaded. </p>
                    <div class="totalsProgress" count="0"> {loaded} out of {total} loaded (0%).  This may take a few minutes.  You may click to select any Gloss loaded already.</div>
                </div>
                `,
                then: (elem) => {
                    const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    elem.querySelector("#ngForm").addEventListener("submit", (e) => {inProgress(e, true)})
                    let numloaded = 0
                    let total = 0
                    const filterPresent = deerUtils.getURLParameter("gog-filter")
                    const filterObj = filterPresent ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
                    if (options.list) {
                        let ul = document.createElement("table")
                        ul.insertAdjacentHTML('afterbegin', `<thead><tr><th style="cursor: pointer;">Reference </th><th style="cursor: pointer;">Title </th><th style="cursor: pointer;">Tag(s) </th></tr></thead><tbody><tr id="approximate-bar" class="is-hidden" style="border-bottom: 0.1em solid var(--color-lightGrey);"><th>Approximate Matches</th></tr></tbody>`)
                        /**
                         * Add Sort icon
                         * @param {Number} [index=0] - Column  index to sort by
                         * @param {string} [down="<small>▼</small>"] - value to use to symbolize a column is being sorted in descending order
                         * @param {string} [up="<small>▲</small>"] - value to use to symbolize a column is being sorted in ascending order
                         */
                        function customSortIcon(index=0, down="<small>▼</small>", up="<small>▲</small>") {
                            // Remove Arrow on unsorted column
                            for (let i = 0; i < ul.children[0].children[0].childElementCount; i++)
                                if (i === +index) continue
                                else if (ul.children[0].children[0].children[i].innerHTML.slice(-down.length) === down)
                                    ul.children[0].children[0].children[i].innerHTML = ul.children[0].children[0].children[i].innerHTML.slice(0, -down.length)
                                else if (ul.children[0].children[0].children[i].innerHTML.slice(-up.length) === up)
                                    ul.children[0].children[0].children[i].innerHTML = ul.children[0].children[0].children[i].innerHTML.slice(0, -up.length)
                            // Switch to Reverse Sort
                            if (ul.children[0].children[0].children[+index].innerHTML.slice(-down.length) === down)
                                ul.children[0].children[0].children[+index].innerHTML = ul.children[0].children[0].children[+index].innerHTML.slice(0, -down.length) + up
                            // Switch to Normal Sort
                            else if (ul.children[0].children[0].children[+index].innerHTML.slice(-up.length) === up)
                                ul.children[0].children[0].children[+index].innerHTML = ul.children[0].children[0].children[+index].innerHTML.slice(0, -up.length) + down
                            // Switch to new column (or first time) and Normal Sort
                            else 
                                ul.children[0].children[0].children[+index].innerHTML = ul.children[0].children[0].children[+index].innerHTML + down
                        }
                        Array.from(ul.children[0].children[0].children).forEach((val, index) => {
                            val.onclick = _ => {
                                customSortIcon(index, down, up)
                                filterHandle()
                            }
                        })
                        const deduplicatedList = deerUtils.removeDuplicates(obj[options.list], '@id')
                        total = deduplicatedList.length                
                        deduplicatedList.forEach((val, index) => {
                            const glossID = val["@id"].replace(/^https?:/, 'https:')
                            let li = document.createElement("td")
                            li.setAttribute("deer-id", glossID)
                            let a = document.createElement("a")
                            a.setAttribute("href", options.link+glossID)
                            a.setAttribute("target", "_blank")
                            let span = document.createElement("span")
                            span.classList.add("serifText")
                            if(cachedFilterableEntities.get(glossID)){
                                // We cached it in the past and are going to trust it right now.
                                const cachedObj = cachedFilterableEntities.get(glossID)
                                let filteringProps = Object.keys(cachedObj)
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
                                let tr = document.createElement("tr")
                                // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem_ngList (already have the data).
                                if(filterPresent){
                                    tr.classList.add("is-hidden")
                                }
                                a.appendChild(span)
                                li.appendChild(a)
                                tr.appendChild(li)
                                modifyTableTR(tr, cachedObj)
                                ul.children[1].appendChild(tr)
                            }
                            else{
                                // This object was not cached so we do not have its properties.
                                // Make this a deer-view so this Gloss is expanded and we can make attributes from its properties.
                                let div = document.createElement("tr")
                                div.setAttribute("deer-link", "gloss-metadata.html#")
                                div.setAttribute("deer-template", "filterableListItem_ngList")
                                div.setAttribute("deer-id", glossID)
                                if(filterPresent) div.classList.add("is-hidden")
                                div.classList.add("deer-view")
                                span.innerText = `Loading Gloss #${index + 1}...`
                                a.appendChild(span)
                                li.appendChild(a)
                                div.appendChild(document.createElement('td'))
                                div.appendChild(li)
                                ul.children[1].appendChild(div)
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
                    const approximate = elem.querySelector("#approximate")
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
                    function filterHandle() {
                        const val = filter.value.trim()
                        let filterQuery
                        if(val){
                            filterQuery = encodeContentState(JSON.stringify({"title" : val, "text": val, "targetedtext": val}))
                        }
                        else{
                            filterQuery = encodeContentState(JSON.stringify({"title" : ""}))
                        }
                        if (options.list)
                            smartFilter()
                        debounce(filterGlosses(filterQuery))
                    }
                    filter.addEventListener('input', filterHandle)
                    Array.from(approximate.children).forEach(e => e.addEventListener('change', filterHandle))

                    if(numloaded === total){
                        cachedNotice.classList.remove("is-hidden")
                        progressArea.classList.add("is-hidden")
                        approximate.classList.remove("is-hidden")
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
                        let parent = null
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
                        const approximateBar = elem.querySelector('#approximate-bar')
                        if(approximateBar) {
                            approximateBar.classList.add('is-hidden')
                            parent = approximateBar.parentElement
                            parent.removeChild(approximateBar)
                            parent.insertAdjacentElement('afterbegin', approximateBar)
                        }
                        const items = elem.querySelectorAll('tbody tr')
                        items.forEach(tr=>{
                            if(tr === approximateBar) return
                            if(!tr.classList.contains("is-hidden"))
                                tr.classList.add("is-hidden")
                            for(const prop in query){
                                if(tr.children[1].hasAttribute(`data-${prop}`)){
                                    const tr_mod = [tr.children[0].innerHTML.toLowerCase(),
                                        tr.children[1].getAttribute(`data-${prop}`).toLowerCase(),
                                        tr.children[2].innerHTML.toLowerCase()]
                                    const query_mod = query[prop].toLowerCase()
                                    const query_mod_aprox = approximateFilter(query_mod)
                                    const action = tr_mod.map(x => approximateFilter(x).includes(query_mod_aprox)).some(x => x) ? "remove" : "add"
                                    if (action === "remove")
                                        if(!tr_mod.map(x => x.includes(query_mod)).some(x => x))
                                            approximateBar.classList.remove("is-hidden")
                                        else{
                                            if(parent.tagName === "TBODY"){
                                                parent.removeChild(tr)
                                                parent.insertBefore(tr, approximateBar)
                                            }
                                        }
                                    tr.classList[action](`is-hidden`,`un${action}-item`)
                                    setTimeout(()=>tr.classList.remove(`un${action}-item`),500)
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
         * This corresponds to an existing <li> element in ngListerFilterable or glossesSelectorForTextualWitness with a deer-id property.  These <li> elements need to be filterable.
         * As such, they require information about the Gloss they represent, whose URI is the deer-id.
         * That element is expand()ed in order to get the information for this element to be filterable.
         * Since the object is expanded, if reasonable, it should be cached with its information (how would we know if it is out of date?)
         * If a filter was present via the URL on page load, if it matches on this <li> the <li> should be filtered immediately.
         */ 
        filterableListItem_ngList: function (obj, options = {}) {
            return{
                html: ``,
                then: (elem) => {
                    let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    const containingListElem = elem.closest("deer-view")
                    let filteringProps = Object.keys(obj)
                    let li = document.createElement("td")
                    let a = document.createElement("a")
                    let span = document.createElement("span")
                    span.classList.add("serifText")

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
                    modifyTableTR(elem, obj)
                    
                    const createScenario = elem.hasAttribute("create-scenario")
                    const updateScenario = elem.hasAttribute("update-scenario")   
                    const increaseTotal = ((createScenario || updateScenario))
                    const filterPresent = containingListElem.$contentState
                    const filterObj = filterPresent ? decodeContentState(containingListElem.$contentState) : {}
                    span.innerText = deerUtils.getLabel(obj) ? deerUtils.getLabel(obj) : "Label Unprocessable"
                    a.setAttribute("href", options.link + obj['@id'])
                    a.setAttribute("target", "_blank")
                    // Turn each property into an attribute for the <li> element
                    if(filterPresent) elem.classList.add("is-hidden")
                    filteringProps.forEach( (prop) => {
                        // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                        if(prop === "text")
                            li.setAttribute("data-text", obj[prop]?.value?.textValue ?? "") 
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
                        if(elem.children[1].hasAttribute(`data-${prop}`) && filterPresent && filterObj.hasOwnProperty("text")) {
                        const tr_mod = [elem.children[1].getAttribute(`data-${prop}`).toLowerCase(),
                            elem.children[0].innerHTML.toLowerCase(),
                            elem.children[2].innerHTML.toLowerCase()]
                        const query_mod_aprox = approximateFilter(filterObj["text"].toLowerCase())
                        if (tr_mod.map(x => approximateFilter(x).includes(query_mod_aprox)).some(x => x))
                            elem.classList.remove("is-hidden")
                        }    
                    })

                    // Pagination for the progress indicator element
                    const totalsProgress = containingListElem.querySelector(".totalsProgress")
                    const numloaded = parseInt(totalsProgress.getAttribute("count")) + 1
                    let total = parseInt(totalsProgress.getAttribute("total"))
                    if(increaseTotal) total++
                    const cachedNotice = containingListElem.querySelector(".cachedNotice")
                    const progressArea = containingListElem.querySelector(".progressArea")
                    const modalBtn = containingListElem.querySelector("gloss-modal-button")
                    const approximate = containingListElem.querySelector("#approximate")
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
                        approximate.classList.remove("is-hidden")
                        smartFilter()
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
                            let already = witnessFragmentsObj?.referencedGlosses?.has(glossID) ? "attached-to-source" : ""
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
                            span.classList.add("serifText")
                            if(cachedFilterableEntities.get(glossID)){
                                // We cached it in the past and are going to trust it right now.
                                const cachedObj = cachedFilterableEntities.get(glossID)
                                let filteringProps = Object.keys(cachedObj)
                                // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem_glossSelector (already have the data).
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
                                div.setAttribute("deer-template", "filterableListItem_glossSelector")
                                div.setAttribute("deer-link", "gloss-metadata.html#")
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
                    elem.querySelectorAll('.toggleInclusion').forEach(btn => btn.addEventListener('click', async ev => {
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
                        if(await showCustomConfirm(note)){
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
                    /**
                     * Debounces function calls by delaying execution until after a specified time has elapsed since the last call.
                     * @param {Function} func Function to debounce.
                     * @param {Number} timeout Delay in milliseconds before the function is executed after the last call.
                     * @returns {Function} Debounced function.
                     */
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

        filterableListItem_glossSelector: function (obj, options = {}) {
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
                    
                    const createScenario = elem.hasAttribute("create-scenario")
                    const updateScenario = elem.hasAttribute("update-scenario")   
                    const increaseTotal = ((createScenario || updateScenario))
                    const filterPresent = containingListElem.$contentState
                    const filterObj = filterPresent ? decodeContentState(containingListElem.$contentState) : {}
                    span.innerText = deerUtils.getLabel(obj) ? deerUtils.getLabel(obj) : "Label Unprocessable"
                    a.setAttribute("href", options.link + obj['@id'])
                    a.setAttribute("target", "_blank")
                    // Turn each property into an attribute for the <li> element
                    if(filterPresent) elem.classList.add("is-hidden")
                
                    filteringProps.forEach( (prop) => {
                        // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                        if(prop === "text")
                            li.setAttribute("data-text", obj[prop]?.value?.textValue ?? "") 
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
                        if(li.hasAttribute(`data-${prop}`) && filterPresent && filterObj.hasOwnProperty(prop)) {
                            //const query_mod_aprox = approximateFilter(filterObj[prop].toLowerCase())
                            if(li.getAttribute(`data-${prop}`).toLowerCase().includes(filterObj[prop].toLowerCase()))
                                elem.classList.remove("is-hidden")
                        }    
                    })
                    if(!li.hasAttribute("data-title")) {
                        li.setAttribute("data-title", "[ unlabeled ]")
                        li.setAttribute("data-unlabeled", "true")
                    }
                    li.setAttribute("data-expanded", "true")

                    // Pagination for the progress indicator element
                    const totalsProgress = containingListElem.querySelector(".totalsProgress")
                    const numloaded = parseInt(totalsProgress.getAttribute("count")) + 1
                    let total = parseInt(totalsProgress.getAttribute("total"))
                    if(increaseTotal) total++
                    const cachedNotice = containingListElem.querySelector(".cachedNotice")
                    const progressArea = containingListElem.querySelector(".progressArea")
                    const modalBtn = containingListElem.querySelector("gloss-modal-button")
                    const approximate = containingListElem.querySelector("#approximate")
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
                        //approximate.classList.remove("is-hidden")
                        //smartFilter()
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
                        //hideSearchBar()
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
        },

        /**
         * The Manuscript Witness list on manuscripts.html
         * Users should see the GoG-Manuscripts collection.  
         * They can filter the list of shelfmarks using a text input that matches on shelfmark.
         */ 
        manuscriptListFilterable: function (obj, options = {}) {
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
                <h2> Manuscript Witnesses </h2>
                <small class="cachedNotice is-hidden text-primary"> These Manuscripts were cached.  To reload the data <a class="newcache tag is-small">click here</a>. </small>
                <form id="msForm" deer-type="ManuscriptWitness" deer-context="http://www.loc.gov/mods" class="row">
                    <input id="search-bar" filter="identifier" type="text" deer-key="identifier" placeholder="&hellip;Type to filter by shelfmark" class="is-hidden serifText row">
                    <input type="hidden" deer-key="targetCollection" value="GoG-Manuscripts">
                    <input is="auth-creator" type="hidden" deer-key="creator" />
                    <style>
                        #search-submit {
                          background: none;
                          border: none;
                          color: var(--color-primary);
                          cursor: pointer;
                          font-size: 0.8em;
                          padding-left: 0;
                        }
                        @keyframes fadeIn {
                          0% { opacity: 0; max-height: 0em; padding: 0em; }
                          100% { opacity: 1; max-height: auto; padding: auto; }
                        }
                        #search-submit:not(.fade) {
                          animation: fadeIn 0.5s forwards;
                        }
                        @keyframes fadeOut {
                          0% { opacity: 1; max-height: auto; padding: auto; }
                          100% { opacity: 0; max-height: 0em; padding: 0em; }
                        }
                        #search-submit.fade {
                          animation: fadeOut 0.5s forwards;
                        }
                    </style>
                    <input id="search-submit" type="submit" value="Not finding what you're looking for? Create a new manuscript..." class="is-hidden fade serifText row">
                </form>
                <div id="approximate" class="is-hidden">
                    <input type="checkbox" id="u↔v" name="u↔v" checked>
                    <label for="u↔v">u ↔ v</label>
                    <input type="checkbox" id="j↔i" name="j↔i" checked>
                    <label for="j↔i">j ↔ i</label>
                    <input type="checkbox" id="y↔i" name="y↔i" checked>
                    <label for="y↔i">y ↔ i</label>
                    <input type="checkbox" id="ae↔e" name="ae↔e" checked>
                    <label for="ae↔e">ae ↔ e</label>
                    <input type="checkbox" id="oe↔e" name="oe↔e" checked>
                    <label for="oe↔e">oe ↔ e</label>
                    <input type="checkbox" id="t↔c" name="t↔c" checked>
                    <label for="t↔c">t ↔ c</label>
                    <input type="checkbox" id="exsp↔exp" name="exsp↔exp" checked>
                    <label for="exsp↔exp">exsp ↔ exp</label>
                    <input type="checkbox" id="ignore-whitespace" name="ignore-whitespace" checked>
                    <label for="ignore-whitespace">Ignore Whitespace</label>
                </div>
                <div class="progressArea">
                    <p class="filterNotice is-hidden"> Manuscript filter detected.  Please note that Manuscripts will appear as they are fully loaded. </p>
                    <div class="totalsProgress" count="0"> {loaded} out of {total} loaded (0%).  This may take a few minutes.  You may click to select any Manuscript loaded already.</div>
                </div>
                `,
                then: (elem) => {
                    const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    let numloaded = 0
                    let total = 0
                    const filterPresent = deerUtils.getURLParameter("gog-filter")
                    const filterObj = filterPresent ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
                    if (options.list) {
                        let ul = document.createElement("table")
                        ul.insertAdjacentHTML('afterbegin', `<thead><tr><th style="cursor: pointer;">Shelfmark </th></tr></thead><tbody><tr id="approximate-bar" class="is-hidden" style="border-bottom: 0.1em solid var(--color-lightGrey);"><th>Approximate Matches</th></tr></tbody>`)
                        /**
                         * Add Sort icon
                         * @param {Number} [index=0] - Column  index to sort by
                         * @param {string} [down="<small>▼</small>"] - value to use to symbolize a column is being sorted in descending order
                         * @param {string} [up="<small>▲</small>"] - value to use to symbolize a column is being sorted in ascending order
                         */
                        function customSortIcon(index=0, down="<small>▼</small>", up="<small>▲</small>") {
                            // Remove Arrow on unsorted column
                            for (let i = 0; i < ul.children[0].children[0].childElementCount; i++)
                                if (i === +index) continue
                                else if (ul.children[0].children[0].children[i].innerHTML.slice(-down.length) === down)
                                    ul.children[0].children[0].children[i].innerHTML = ul.children[0].children[0].children[i].innerHTML.slice(0, -down.length)
                                else if (ul.children[0].children[0].children[i].innerHTML.slice(-up.length) === up)
                                    ul.children[0].children[0].children[i].innerHTML = ul.children[0].children[0].children[i].innerHTML.slice(0, -up.length)
                            // Switch to Reverse Sort
                            if (ul.children[0].children[0].children[+index].innerHTML.slice(-down.length) === down)
                                ul.children[0].children[0].children[+index].innerHTML = ul.children[0].children[0].children[+index].innerHTML.slice(0, -down.length) + up
                            // Switch to Normal Sort
                            else if (ul.children[0].children[0].children[+index].innerHTML.slice(-up.length) === up)
                                ul.children[0].children[0].children[+index].innerHTML = ul.children[0].children[0].children[+index].innerHTML.slice(0, -up.length) + down
                            // Switch to new column (or first time) and Normal Sort
                            else 
                                ul.children[0].children[0].children[+index].innerHTML = ul.children[0].children[0].children[+index].innerHTML + down
                        }
                        Array.from(ul.children[0].children[0].children).forEach((val, index) => {
                            val.onclick = _ => {
                                customSortIcon(index, down, up)
                                filterHandle()
                            }
                        })
                        const deduplicatedList = deerUtils.removeDuplicates(obj[options.list], '@id')
                        total = deduplicatedList.length                
                        deduplicatedList.forEach((val, index) => {
                            const manuscriptID = val["@id"].replace(/^https?:/, 'https:')
                            let li = document.createElement("td")
                            li.setAttribute("deer-id", manuscriptID)
                            let a = document.createElement("a")
                            a.setAttribute("href", options.link+manuscriptID)
                            a.setAttribute("target", "_blank")
                            let span = document.createElement("span")
                            span.classList.add("serifText")
                            if(cachedFilterableEntities.get(manuscriptID)){
                                // We cached it in the past and are going to trust it right now.
                                const cachedObj = cachedFilterableEntities.get(manuscriptID)
                                let filteringProps = Object.keys(cachedObj)
                                // Add all Manuscript object properties to the <li> element as attributes to match on later
                                filteringProps.forEach( (prop) => {
                                    // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                                    if(typeof deerUtils.getValue(cachedObj[prop]) === "string" || typeof deerUtils.getValue(cachedObj[prop]) === "number") {
                                        let val = deerUtils.getValue(cachedObj[prop])+"" //typecast to a string
                                        prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                        const attr = `data-${prop}`
                                        if(prop === "identifier" && !val){
                                            val = "[ No Shelfmark ]"
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
                                span.innerText = deerUtils.getValue(cachedObj.identifier) ? deerUtils.getValue(cachedObj.identifier) : "Shelfmark Unprocessable"
                                numloaded++
                                let tr = document.createElement("tr")
                                // Setting deer-expanded here means the <li> won't be expanded later as a filterableListItem_ngList (already have the data).
                                if(filterPresent){
                                    tr.classList.add("is-hidden")
                                }
                                a.appendChild(span)
                                li.appendChild(a)
                                tr.appendChild(li)
                                modifyManuscriptTableTR(tr, cachedObj)
                                ul.children[1].appendChild(tr)
                            }
                            else{
                                // This object was not cached so we do not have its properties.
                                // Make this a deer-view so this Manuscript is expanded and we can make attributes from its properties.
                                let div = document.createElement("tr")
                                div.setAttribute("deer-link", "manuscript-metadata.html#")
                                div.setAttribute("deer-template", "filterableListItem_msList")
                                div.setAttribute("deer-id", manuscriptID)
                                if(filterPresent) div.classList.add("is-hidden")
                                div.classList.add("deer-view")
                                span.innerText = `Loading Manuscript #${index + 1}...`
                                a.appendChild(span)
                                li.appendChild(a)
                                div.appendChild(document.createElement('td'))
                                div.appendChild(li)
                                ul.children[1].appendChild(div)
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
                    const approximate = elem.querySelector("#approximate")
                    // Pagination for the progress indicator element.  It should know how many of the items were in cache and 'fully loaded' already.
                    totalsProgress.innerText = `${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%).  This may take a few minutes.  You may click to select any Manuscript loaded already.`
                    totalsProgress.setAttribute("total", total)
                    totalsProgress.setAttribute("count", numloaded)

                    // FIXME this can be improved.  We need to update localStorage, not completely refresh it.
                    elem.querySelector(".newcache").addEventListener("click", ev => {
                        localStorage.clear()
                        location.reload()
                    })

                    // Filter the list of manuscripts as users type their query against 'identifier'
                    function filterHandle() {
                        const val = filter.value.trim()
                        let filterQuery
                        if(val){
                            filterQuery = encodeContentState(JSON.stringify({"identifier" : val}))
                        }
                        else{
                            filterQuery = encodeContentState(JSON.stringify({"identifier" : ""}))
                        }
                        if (options.list)
                            smartFilter()
                        debounce(filterManuscripts(filterQuery))
                    }
                    filter.addEventListener('input', filterHandle)
                    Array.from(approximate.children).forEach(e => e.addEventListener('change', filterHandle))

                    if(numloaded === total){
                        cachedNotice.classList.remove("is-hidden")
                        progressArea.classList.add("is-hidden")
                        approximate.classList.remove("is-hidden")
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
                            debounce(filterManuscripts(elem.$contentState))
                        }
                        hideSearchBar()
                    }

                    /** 
                     * This presumes things are already loaded.  Do not use this function unless all glosses are loaded.
                     * Write the new encoded filter string to the URL with no programmatic page refresh.  If the user refreshes, the filter is applied.
                     */ 
                    function filterManuscripts(queryString=''){
                        const numloaded = parseInt(totalsProgress.getAttribute("count"))
                        const total = parseInt(totalsProgress.getAttribute("total"))
                        let parent = null
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
                        const approximateBar = elem.querySelector('#approximate-bar')
                        if(approximateBar) {
                            approximateBar.classList.add('is-hidden')
                            parent = approximateBar.parentElement
                            parent.removeChild(approximateBar)
                            parent.insertAdjacentElement('afterbegin', approximateBar)
                        }
                        const items = elem.querySelectorAll('tbody tr')
                        items.forEach(tr=>{
                            if(tr === approximateBar) return
                            if(!tr.classList.contains("is-hidden"))
                                tr.classList.add("is-hidden")
                            for(const prop in query){
                                if(tr.children[1].hasAttribute(`data-${prop}`)){
                                    const tr_mod = [tr.children[0].innerHTML.toLowerCase(),
                                        tr.children[1].getAttribute(`data-${prop}`).toLowerCase(),
                                        tr.children[2].innerHTML.toLowerCase()]
                                    const query_mod = query[prop].toLowerCase()
                                    const query_mod_aprox = approximateFilter(query_mod)
                                    const action = tr_mod.map(x => approximateFilter(x).includes(query_mod_aprox)).some(x => x) ? "remove" : "add"
                                    if (action === "remove")
                                        if(!tr_mod.map(x => x.includes(query_mod)).some(x => x))
                                            approximateBar.classList.remove("is-hidden")
                                        else{
                                            if(parent.tagName === "TBODY"){
                                                parent.removeChild(tr)
                                                parent.insertBefore(tr, approximateBar)
                                            }
                                        }
                                    tr.classList[action](`is-hidden`,`un${action}-item`)
                                    setTimeout(()=>tr.classList.remove(`un${action}-item`),500)
                                    // If it is showing, no need to check other properties for filtering.
                                    if(action === "remove") break
                                }
                            }
                        })

                        // This query was applied.  Make this the encoded query in the URL, but don't cause a page reload.
                        const url = new URL(window.location.href)
                        if(query.identifier){
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
         * This corresponds to an existing <tr> element in manuscriptListerFilterable.  These <tr> elements need to be filterable.
         * As such, they require information about the Manuscript they represent, whose URI is the deer-id.
         * That element is expand()ed in order to get the information for this element to be filterable.
         * Since the object is expanded, if reasonable, it should be cached with its information (how would we know if it is out of date?)
         * If a filter was present via the URL on page load, if it matches on this <tr> the <tr> should be filtered immediately.
         */ 
        filterableListItem_msList: function (obj, options = {}) {
            return{
                html: ``,
                then: (elem) => {
                    let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    const containingListElem = elem.closest("deer-view")
                    let filteringProps = Object.keys(obj)
                    let li = document.createElement("td")
                    let a = document.createElement("a")
                    let span = document.createElement("span")
                    span.classList.add("serifText")

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
                    modifyManuscriptTableTR(elem, obj)
                    
                    const createScenario = elem.hasAttribute("create-scenario")
                    const updateScenario = elem.hasAttribute("update-scenario")   
                    const increaseTotal = ((createScenario || updateScenario))
                    const filterPresent = containingListElem.$contentState
                    const filterObj = filterPresent ? decodeContentState(containingListElem.$contentState) : {}
                    span.innerText = deerUtils.getValue(obj.identifier) ? deerUtils.getValue(obj.identifier) : "Label Unprocessable"
                    a.setAttribute("href", options.link + obj['@id'])
                    a.setAttribute("target", "_blank")
                    // Turn each property into an attribute for the <li> element
                    if(filterPresent) elem.classList.add("is-hidden")
                    filteringProps.forEach( (prop) => {
                        // Only processing numbers and strings. FIXME do we need to process anything more complex into an attribute, such as an Array?
                        if(typeof deerUtils.getValue(obj[prop]) === "string" || typeof deerUtils.getValue(obj[prop]) === "number") {
                            let val = deerUtils.getValue(obj[prop])+"" //typecast to a string
                            prop = prop.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                            const attr = `data-${prop}`
                            if(prop === "identifier" && !val){
                                val = "[ No Shelfmark ]"
                                li.setAttribute("data-unlabeled", "true")
                            }
                            li.setAttribute(attr, val)
                        }
                        if(elem.children[1].hasAttribute(`data-${prop}`) && filterPresent && filterObj.hasOwnProperty("text")) {
                        const tr_mod = [elem.children[1].getAttribute(`data-${prop}`).toLowerCase(),
                            elem.children[0].innerHTML.toLowerCase(),
                            elem.children[2].innerHTML.toLowerCase()]
                        const query_mod_aprox = approximateFilter(filterObj["text"].toLowerCase())
                        if (tr_mod.map(x => approximateFilter(x).includes(query_mod_aprox)).some(x => x))
                            elem.classList.remove("is-hidden")
                        }    
                    })

                    // Pagination for the progress indicator element
                    const totalsProgress = containingListElem.querySelector(".totalsProgress")
                    const numloaded = parseInt(totalsProgress.getAttribute("count")) + 1
                    let total = parseInt(totalsProgress.getAttribute("total"))
                    if(increaseTotal) total++
                    const cachedNotice = containingListElem.querySelector(".cachedNotice")
                    const progressArea = containingListElem.querySelector(".progressArea")
                    //const modalBtn = containingListElem.querySelector("gloss-modal-button")
                    const approximate = containingListElem.querySelector("#approximate")
                    const filterInstructions = containingListElem.querySelector(".filterInstructions")
                    totalsProgress.setAttribute("count", numloaded)
                    totalsProgress.setAttribute("total", total)
                    totalsProgress.innerHTML = `
                        ${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%)<br>  
                        You may click to select any Manuscript loaded already.<br>
                        A filter will become available when all items are loaded.`
                    if(numloaded === total){
                        cachedNotice.classList.remove("is-hidden")
                        //if(modalBtn) modalBtn.classList.remove("is-hidden")
                        if(filterInstructions) filterInstructions.classList.remove("is-hidden")
                        progressArea.classList.add("is-hidden")
                        approximate.classList.remove("is-hidden")
                        smartFilter()
                        containingListElem.querySelectorAll("input[filter]").forEach(i => {
                            // The filters that are used now need to be visible and selected / take on the string / etc.
                            i.classList.remove("is-hidden")
                            if(filterObj.hasOwnProperty(i.getAttribute("filter"))){
                                i.value = deerUtils.getValue(filterObj[i.getAttribute("filter")])
                                i.setAttribute("value", deerUtils.getValue(filterObj[i.getAttribute("filter")]))
                                i.dispatchEvent(new Event('input', { bubbles: true }))
                            }
                        })
                        containingListElem.setAttribute("ms-list-loaded", "true")
                        deerUtils.broadcast(undefined, "ms-list-loaded", containingListElem, {})
                        hideSearchBar()
                    }
                }
            }
        },

        /**
         * There may just be a single fragment profile on a page.
         * There may be multiple, such as a version of manuscript-profile.html that uses this template for detailed views of its fragments
         * Can this template work for both cases?
         */ 
        fragmentProfile:  function (obj, options = {}) {
            return{
                html: `
                    <style>
                        .blue {
                            color: blue !important;
                        }
                        .profile-loading {
                            position: relative;
                            display: inline-block;
                            background-image: url(../images/load-blocks.gif);
                            background-repeat: no-repeat;
                            height: 3em;
                            width: 4em;
                            -webkit-filter: invert(100%);
                            filter: invert(100%);
                            background-size: 4em;
                            top: 1em;
                        }
                        .tag.small.secondary{
                            margin-left: 0.65em;
                        }
                    </style>
                `,
                then: async (elem) => {
                    // If these become expensive query driven templates we can add their expanded information into the expandedEntities cache.
                    // If we do that, we will need to offer a way to reset the cache on interfaces that use this template
                    // let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    // cachedFilterableEntities.set(obj["@id"].replace(/^https?:/, 'https:'), obj)
                    // localStorage.setItem("expandedEntities", JSON.stringify(Object.fromEntries(cachedFilterableEntities)))

                    const heading = document.createElement("h4")
                    const loading = document.createElement("div")
                    loading.classList.add("profile-loading")
                    if(obj?.["@type"] !== "WitnessFragment"){
                        const ev = new CustomEvent("NOOOO")
                        deerUtils.globalFeedbackBlip(ev, `The entity supplied is not a Witness Fragment`, false)
                        heading.classList.add("text-error")
                        heading.innerText = `Invalid Entity Type '${obj?.["@type"]}'`
                        elem.appendChild(heading)
                        return
                    }
                    const edit = document.createElement("a")
                    edit.classList.add("tag")
                    edit.classList.add("small")
                    edit.classList.add("secondary")
                    edit.innerText = "edit"
                    edit.setAttribute("type", "button")
                    edit.setAttribute("target", "_blank")
                    edit.setAttribute("href", `fragment-metadata.html#${obj["@id"]}`)

                    heading.classList.add("blue")
                    heading.innerText = obj?.identifier?.value ? obj.identifier.value : "Missing Shelfmark"
                    heading.appendChild(edit)
                    elem.appendChild(heading)
                    elem.appendChild(loading)

                    // Prolly gunna do some async stuff here
                    loading.remove()

                    const manuscript = document.createElement("div")
                    manuscript.innerHTML = `<a target="_blank" href="manuscript-profile.html#${obj?.partOf?.value}">${obj?.partOf?.value ? "See Manuscript Witness" : "Missing Manuscript Witness Connection!"}</a>`
                    elem.appendChild(manuscript)

                    const source = document.createElement("div")
                    source.innerText = `Source: ${obj?.source?.value ? obj.source.value : "Missing Source"}`
                    elem.appendChild(source)

                    // const data = document.createElement("pre")
                    // data.innerText = JSON.stringify(obj, null, 4)
                    // elem.appendChild(data)
                }
            }
        },

        /**
         * There may just be a single manuscript profile on a page.
         * There may be multiple, such as a version of manuscripts.html that uses this template in the list/table it builds.
         * Can this template work for both cases?
         */ 
        manuscriptProfile: function (obj, options = {}) {
            return{
                html: `
                    <style>
                        .green {
                            color: green;
                            display: inline-block;
                        }
                        .profile-loading {
                            position: relative;
                            display: inline-block;
                            background-image: url(../images/load-blocks.gif);
                            background-repeat: no-repeat;
                            height: 3em;
                            width: 4em;
                            -webkit-filter: invert(100%);
                            filter: invert(100%);
                            background-size: 4em;
                            top: 1em;
                        }
                        .tag.small.secondary{
                            margin-left: 0.65em;
                        }

                        h5{
                            margin-top: 1em;
                            color: green
                        }
                    </style>
                `,
                then: async (elem) => {
                    // If these become expensive query driven templates we can add their expanded information into the expandedEntities cache.
                    // If we do that, we will need to offer a way to reset the cache on interfaces that use this template
                    // let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    // cachedFilterableEntities.set(obj["@id"].replace(/^https?:/, 'https:'), obj)
                    // localStorage.setItem("expandedEntities", JSON.stringify(Object.fromEntries(cachedFilterableEntities)))

                    const heading = document.createElement("h4")
                    const loading = document.createElement("div")
                    loading.classList.add("profile-loading")
                    if(obj?.["@type"] !== "ManuscriptWitness"){
                        const ev = new CustomEvent("NOOOO")
                        deerUtils.globalFeedbackBlip(ev, `The entity supplied is not a Witness Fragment`, false)
                        heading.classList.add("text-error")
                        heading.innerText = `Invalid Entity Type '${obj?.["@type"]}'`
                        elem.appendChild(heading)
                        return
                    }
                    const edit = document.createElement("a")
                    edit.classList.add("tag")
                    edit.classList.add("small")
                    edit.classList.add("secondary")
                    edit.innerText = "edit"
                    edit.setAttribute("type", "button")
                    edit.setAttribute("target", "_blank")
                    edit.setAttribute("href", `manuscript-metadata.html#${obj["@id"]}`)

                    heading.classList.add("green")
                    heading.innerText = obj?.identifier?.value ? obj.identifier.value : "Missing Shelfmark"
                    heading.appendChild(edit)
                    elem.appendChild(heading)
                    elem.appendChild(loading)
                    const historyWildcard = { "$exists": true, "$size": 0 }

                    // Each Fragment is partOf a Manuscript.
                    const fragmentAnnosQuery = {
                        "body.partOf.value": httpsIdArray(obj["@id"]),
                        "__rerum.history.next": historyWildcard,
                        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
                    }

                    const fragmentUriSet = await getPagedQuery(100, 0, fragmentAnnosQuery)
                    .then(annos => {
                        return new Set(annos.map(anno => anno.target))
                    })
                    .catch(err => {
                        console.error(err)
                        return Promise.reject([])
                    })
                    obj.fragments = {
                        "value":[...fragmentUriSet]
                    }

                    const sources = await Promise.all([...fragmentUriSet.values()].map( frag => {
                        // Each Witness Fragment has a source.  Witness Fragments of the same Manuscript Witness may have difference sources.
                        const sourceAnnosQuery = {
                            "body.source.value": {"$exists": true},
                            "target" : httpsIdArray(frag),
                            "__rerum.history.next": historyWildcard,
                            "__rerum.generatedBy" : httpsIdArray(__constants.generator)
                        }

                        return fetch(`${__constants.tiny}/query?limit=100&skip=0`, {
                            method: "POST",
                            mode: 'cors',
                            headers: {
                                "Content-Type": "application/json;charset=utf-8"
                            },
                            body: JSON.stringify(sourceAnnosQuery)
                        })
                        .then(response => response.json())
                        .then(annos => {
                            return annos[0]?.body?.source?.value
                        })
                        .catch(err => {
                            console.error(err)
                            return undefined
                        })
                    }))

                    // Only unique entries, duplicates are extraneous.  Ignore undefined in the Set.
                    let sourcesSet = new Set(sources)
                    sourcesSet.delete(undefined)
                    obj.sources = {
                        "value":[...sourcesSet]
                    }

                    loading.remove()
                    // We have these URIs.  We can list them as individual label deer-views for them if we want them by label
                    const sourcesCount = document.createElement("div")
                    sourcesCount.innerText = `# of registered sources: ${sourcesSet.size}`
                    elem.appendChild(sourcesCount)

                    // We have these URIs.  We can list them as individual shelfmark deer-views for them if we want them by identifier
                    const fragmentCount = document.createElement("div")
                    fragmentCount.innerText = `# of registered fragments: ${fragmentUriSet.size}`
                    elem.appendChild(fragmentCount)

                    // Turn these into a list of links
                    const linkHeading = document.createElement("h5")
                    linkHeading.innerText= "Witness Fragment Links"
                    elem.appendChild(linkHeading)
                    const linkList = document.createElement("ul")
                    
                    // Fetch fragment data to get labels
                    const fragmentPromises = obj.fragments.value.map(async (uri, index) => {
                        try {
                            const fragmentData = await deerUtils.expand(uri)
                            const identifier = fragmentData?.identifier?.value || ""
                            const folio = fragmentData?._folio?.value || ""
                            
                            let label
                            if (identifier && folio) {
                                label = `${identifier} - ${folio}`
                            } else if (identifier) {
                                label = identifier
                            } else if (folio) {
                                label = `Folio ${folio}`
                            } else {
                                label = `Witness Fragment #${index + 1}`
                            }
                            
                            return { uri, label, index }
                        } catch (err) {
                            console.error(`Error fetching fragment ${uri}:`, err)
                            return { uri, label: `Witness Fragment #${index + 1}`, index }
                        }
                    })
                    
                    // Wait for all fragments to be fetched and then display them
                    Promise.all(fragmentPromises).then(fragments => {
                        fragments.forEach(({ uri, label }) => {
                            let item = document.createElement("li")
                            let link = document.createElement("a")
                            link.setAttribute("target", "_blank")
                            link.setAttribute("href", `fragment-metadata.html#${uri}`)
                            link.innerText = label
                            item.appendChild(link)
                            linkList.appendChild(item)
                        })
                    }).catch(err => {
                        console.error("Error loading fragment labels:", err)
                    })
                    
                    elem.appendChild(linkList)
                }
            }
        },

        /**
         * There may just be a single Gloss profile on a page.
         * There may be multiple, such as a version of glosses.html that uses this template in the list/table it builds.
         * Can this template work for both cases?
         */ 
        glossProfile: function (obj, options = {}) {
            return{
                html: `
                    <style>
                        .red {
                            color: var(--color-accent);
                            display: inline-block;
                        }
                        .profile-loading {
                            position: relative;
                            display: inline-block;
                            background-image: url(../images/load-blocks.gif);
                            background-repeat: no-repeat;
                            height: 3em;
                            width: 4em;
                            -webkit-filter: invert(100%);
                            filter: invert(100%);
                            background-size: 4em;
                            top: 1em;
                        }
                        .tag.small.secondary{
                            margin-left: 0.65em;
                        }
                        .no-input input{
                            display: none;
                        }
                    </style>
                `,
                then: async (elem) => {
                    // If these become expensive query driven templates we can add their expanded information into the expandedEntities cache.
                    // If we do that, we will need to offer a way to reset the cache on interfaces that use this template
                    // let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    // cachedFilterableEntities.set(obj["@id"].replace(/^https?:/, 'https:'), obj)
                    // localStorage.setItem("expandedEntities", JSON.stringify(Object.fromEntries(cachedFilterableEntities)))

                    const heading = document.createElement("h4")
                    const loading = document.createElement("div")
                    loading.classList.add("profile-loading")
                    if(!(obj?.["@type"] === "Gloss" || obj?.["@type"] === "named-gloss")){
                        deerUtils.broadcast(undefined, "expandError", document, { uri:obj["@id"], error:`Entity type '${obj?.["@type"]}' is not 'Gloss'` })
                        return
                    }
                    const edit = document.createElement("a")
                    edit.classList.add("tag")
                    edit.classList.add("small")
                    edit.classList.add("secondary")
                    edit.innerText = "edit"
                    edit.setAttribute("type", "button")
                    edit.setAttribute("target", "_blank")
                    edit.setAttribute("href", `gloss-metadata.html#${obj["@id"]}`)

                    heading.classList.add("red")
                    heading.innerText = obj?.title?.value ? obj.title.value : "[ unlabeled ]"
                    heading.appendChild(edit)
                    elem.appendChild(heading)
                    elem.appendChild(loading)

                    /**
                     * TODO get connected information and draw some more HTML
                     * How many/which ManuscriptWitnesses or WitnessFragments reference this gloss (via 'attach')?
                     * Is this gloss in the public list?
                     * Are there related or cited third-party Gloss materials?
                     */ 

                    loading.remove()
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

/**
 * Debounces function calls by delaying execution until after a specified time has elapsed since the last call.
 * @param {Function} func Function to debounce.
 * @param {Number} timeout Delay in milliseconds before the function is executed after the last call.
 * @returns {Function} Debounced function.
 */
function debounce(func,timeout = 500) {
    let timeRemains
    return (...args) => {
        clearTimeout(timeRemains)
        timeRemains = setTimeout(()=>func.apply(this,args),timeRemains)
    }
}
/**
 * Attaches event listeners to the search bar to dynamically hide the search submit button
 * when the search bar is empty, reducing visual clutter.
 * This function should be called once to initialize the behavior.
 */
function hideSearchBar() {
    const searchSubmit = document.getElementById('search-submit')
    const searchBar = document.getElementById('search-bar')
    if(searchBar){
        searchBar.addEventListener("keydown", (e)=> {
            if (e.keyIdentifier == 'U+000A' || e.keyIdentifier == 'Enter' || e.keyCode == 13) {
                if (e.target.nodeName == 'INPUT' && e.target.type == 'text') {
                    e.preventDefault()
                }
            }
        }, true)
        searchBar.addEventListener('input', e => searchSubmit.classList[e.target.value.trim().length === 0 ? 'add' : 'remove']("fade"), true)    
    }
}

/**
 * Style a table row and add Reference data pulled from the Title
 * @param {HTMLTableRowElement} tr - HTML <tr> element to style
 * @param {HTMLTableCellElement} obj - HTML <td> element to pull data from
 * @returns {HTMLTableRowElement} - Original HTML <tr> element reference with the modifications
 */
function modifyTableTR(tr, obj) {
    let canonicalReference = obj?.canonicalReference?.value || ""
    let doc = obj?._document?.value
    const section = obj?._section?.value || obj?.targetChapter?.value
    const subsection = obj?._subsection?.value || obj?.targetVerse?.value

    // FIXME we might not want to default to just 'Matthew' here.  This is back support for old data.
    if(!doc && (section && subsection)) doc = "Matthew"

    if(doc && section && subsection) canonicalReference = `${doc} ${section}:${subsection}`
    
    tr.style = "border-bottom: 0.1em solid var(--color-lightGrey);"
    tr.insertAdjacentHTML('afterbegin', `<td>${canonicalReference}</td>`)

    if ("tags" in obj && obj["tags"]["value"] && "items" in obj["tags"]["value"] && obj["tags"]["value"]["items"])
        tr.insertAdjacentHTML('beforeend', `<td style="white-space: nowrap; overflow: auto; text-overflow: clip; max-width: 10em;">${obj["tags"]["value"]["items"]}</td>`)
    else
        tr.insertAdjacentHTML('beforeend', "<td></td>")
    
    return tr
}

/**
 * Style a table row for the Manuscripts table.  For now, this just adds an empty <td> before and after the existing one.
 * 
 * @param {HTMLTableRowElement} tr - HTML <tr> element to style
 * @param {HTMLTableCellElement} obj - HTML <td> element to pull data from
 * @returns {HTMLTableRowElement} - Original HTML <tr> element reference with the modifications
 */
function modifyManuscriptTableTR(tr, obj) {
    tr.style = "border-bottom: 0.1em solid var(--color-lightGrey);"
    //We don't have any extra information to add yet.  However, we get errors if we don't have these tds
    //Specifically in this order. Has to be <td></td> <td> Shelfmark </td> <td></td>
    tr.insertAdjacentHTML('afterbegin', "<td></td>")
    tr.insertAdjacentHTML('beforeend', "<td></td>")
    return tr
}

/**
 * Modifies a given string with a set of orthographic relations to easier match other strings provided to this function
 * @param {string} str - string to convert to approximation
 * @returns modified string
 */
function approximateFilter(str){
    if (document.querySelector("#ignore-whitespace").checked)
        str = str.replaceAll(/[^\w]/g, "")
    if (document.querySelector("#u↔v").checked)
        str = str.replaceAll("u", "v")
    if (document.querySelector("#j↔i").checked)
        str = str.replaceAll("j", "i")
    if (document.querySelector("#y↔i").checked)
        str = str.replaceAll("y", "i")
    if (document.querySelector("#ae↔e").checked)
        str = str.replaceAll("ae", "e")
    if (document.querySelector("#oe↔e").checked)
        str = str.replaceAll("oe", "e")
    if (document.querySelector("#t↔c").checked)
        str = str.replaceAll("t", "c")
    if (document.querySelector("#exsp↔exp").checked)
        str = str.replaceAll("exsp", "exp")
    return str
}

function smartFilter() {
    const ul = document.querySelector("table")
    let sortIndex = 1
    let sortDirection = 1
    for (let i = 0; i < ul.children[0].children[0].childElementCount; i++)
        if (ul.children[0].children[0].children[i].innerHTML.slice(-down.length) === down) {
            sortIndex = i
            sortDirection = -1
        } else if (ul.children[0].children[0].children[i].innerHTML.slice(-up.length) === up) {
            sortIndex = i
            sortDirection = 1
        }
    const approximateBar = document.getElementById('approximate-bar')
    Array.from(ul.children[1].children).sort((a, b) => {
        if (a === approximateBar) return 1
        if (b === approximateBar) return -1
        a = sortSelectors[sortIndex](a)
        b = sortSelectors[sortIndex](b)
        if (a === sortNULLS[sortIndex]) return 1
        if (b === sortNULLS[sortIndex]) return -1
        if (a < b) return -sortDirection
        if (a > b) return sortDirection
        return 0
    }).forEach(e => {
        const parent = e.parentElement
        parent.removeChild(e)
        parent.appendChild(e)
    })
}
