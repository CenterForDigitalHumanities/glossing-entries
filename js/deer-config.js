import deerUtils from "./deer-utils.js"
import AuthButton from './auth.js'

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

    URLS: {
        BASE_ID: "https://store.rerum.io/v1",
        CREATE: "https://tinydev.rerum.io/app/create",
        UPDATE: "https://tinydev.rerum.io/app/update",
        QUERY: "https://tinydev.rerum.io/app/query?limit=100&skip=0",
        OVERWRITE: "https://tinydev.rerum.io/app/overwrite",
        DELETE: "https://tinydev.rerum.io/app/delete",
        SINCE: "https://store.rerum.io/v1/since"
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
            let html = `<h2>Named Glosses </h2>
            <div class="cachedNotice is-hidden"> These Named Glosses were cached.  To reload the data <a class="newcache">click here</a>. </div>
            <input filter="title" type="text" placeholder="&hellip;Type to filter by incipit" class="is-hidden">
            <div class="progressArea">
                <p class="filterNotice is-hidden"> Named Gloss filter detected.  Please note that Named Glosses will appear as they are fully loaded. </p>
                <div class="totalsProgress" count="0"> {loaded} out of {total} loaded (0%).  This may take a few minutes.  You may click to select any Named Gloss loaded already.</div>
            </div>`
            // The entire Glossing-Matthew-Named-Glosses collection, URIs only.
            const cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
            let numloaded = 0
            const total = obj[options.list].length           
            if (options.list) {
                html += `<ul>`
                let c = deerUtils.getURLParameter("gog-filter") ? "is-hidden" : ""
                const query = deerUtils.getURLParameter("gog-filter") ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
                obj[options.list].forEach((val, index) => {
                    if(cachedFilterableEntities.get(val["@id"].replace(/^https?:/, 'https:'))){
                        const cachedObj = cachedFilterableEntities.get(val["@id"].replace(/^https?:/, 'https:'))
                        let filterFacets = Object.keys(cachedObj)
                        
                        let li = `<li class="${c}" deer-id="${val["@id"]}" data-expanded="true" `
                        filterFacets.forEach( (facet) => {
                            if(typeof deerUtils.getValue(cachedObj[facet]) === "string") {
                                const value = deerUtils.getValue(cachedObj[facet])
                                facet = facet.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                                const attr = `data-${facet}`
                                li += `${attr}="${value}" `
                                if(value.includes(query[facet])){
                                    li = li.replace(`class="${c}"`, "")
                                }
                            }
                        })
                        li += `>
                            <a href="${options.link}${val["@id"]}">
                            <span>${deerUtils.getLabel(cachedObj) ? deerUtils.getLabel(cachedObj) : "Label Unprocessable"}</span>
                            </a>
                        </li>`
                        html += li
                        numloaded++
                    }
                    else{
                        html += `<li class="${c}" deer-id="${val["@id"]}">
                            <a href="${options.link}${val["@id"]}">
                            <span>Loading Named Gloss #${index + 1}...</span>
                            </a>
                        </li>`
                    }
                })    
                html += `</ul>`
            }
            const then = async (elem) => {
                if(deerUtils.getURLParameter("gog-filter")){
                    elem.querySelector(".filterNotice").classList.remove("is-hidden")
                }
                elem.querySelector(".totalsProgress").innerText = `${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%).  This may take a few minutes.  You may click to select any Named Gloss loaded already.`
                elem.querySelector(".totalsProgress").setAttribute("total", total)
                elem.querySelector(".totalsProgress").setAttribute("count", numloaded)
                elem.querySelectorAll("li").forEach((item,index) => {
                    item.setAttribute("deer-template","filterableListItem")
                    if(!item.hasAttribute("data-expanded")){
                        item.classList.add("deer-view")
                    }
                })
                elem.querySelector(".newcache").addEventListener("click", ev => {
                    localStorage.clear()
                    location.reload()
                    return
                })
                const filter = elem.querySelector('input')
                filter.addEventListener('input', ev =>{
                    const filterQuery = encodeContentState(JSON.stringify({"title" : ev?.target.value}))
                    debounce(filterGlosses(filterQuery))
                })

                if(numloaded === total){
                    elem.querySelector(".cachedNotice").classList.remove("is-hidden")
                    const providedFilters = deerUtils.getURLParameter("gog-filter") ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
                    elem.querySelector(".progressArea").classList.add("is-hidden")
                    elem.querySelectorAll("input[filter]").forEach(i => {
                        // The filters that are used now need to be selected or take on the string or whatevs
                        i.classList.remove("is-hidden")
                        if(providedFilters.hasOwnProperty(i.getAttribute("filter"))){
                            i.value = deerUtils.getValue(providedFilters[i.getAttribute("filter")])
                        }

                    })
                    if(deerUtils.getURLParameter("gog-filter")){
                        debounce(filterGlosses(deerUtils.getURLParameter("gog-filter")))
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
                 * This presumes things are already loaded.  Do not use this function unless all named glosses are loaded.
                 */ 
                function filterGlosses(queryString=''){
                    const numloaded = parseInt(elem.querySelector(".totalsProgress").getAttribute("count"))
                    const total = parseInt(elem.querySelector(".totalsProgress").getAttribute("total"))
                    if(numloaded !== total){
                        alert("All data must be loaded to use this filter.  Please wait.")
                        return
                    }
                    const query = decodeContentState(queryString.trim())
                    const items = elem.querySelectorAll('li')
                    items.forEach(el=>{
                        for(const prop in query){
                            if(el.hasAttribute(`data-${prop}`)){
                                const action = el.getAttribute(`data-${prop}`).includes(query[prop]) ? "remove" : "add"
                                el.classList[action](`is-hidden`,`un${action}-item`)
                                setTimeout(()=>el.classList.remove(`un${action}-item`),500)
                                break
                            }
                        }
                    })
                    // TODO now manipulate the gog-filter value based on the new selection of filters.
                }
            }
            return { html, then }
        },

        /**
         * This corresponds to an existing <li> element with a deer-id property.  These <li> elements need to be filterable.
         * As such, they require information about the Named Gloss they represent, whose URI is the deer-id.
         * That element is expand()ed in order to get the information for this element to be filterable.
         * 
         * Once expanded, if reasonable, the object should be cached with its information (how would we know if it is out of date?)
         * 
         * If a filter was present via the URL on page load, if it matches on this <li> the <li> should be filtered immediately.
         * 
         */ 
        filterableListItem: function (obj, options = {}) {
            return{
                html: ``,
                then: (elem) => {
                    let cachedFilterableEntities = localStorage.getItem("expandedEntities") ? new Map(Object.entries(JSON.parse(localStorage.getItem("expandedEntities")))) : new Map()
                    const containingListElem = elem.closest("deer-view[deer-template='ngList']")
                    let filterFacets = Object.keys(obj)
                    let li = document.createElement("li")
                    let a = document.createElement("a")
                    let span = document.createElement("span")
                    span.innerText = deerUtils.getLabel(obj) ? deerUtils.getLabel(obj) : "Label Unprocessable"
                    li.setAttribute("deer-id", obj["@id"])
                    a.setAttribute("href", options.link + obj['@id'])
                    filterFacets.forEach( (facet) => {
                        if(typeof deerUtils.getValue(obj[facet]) === "string") {
                            const val = deerUtils.getValue(obj[facet])
                            facet = facet.replaceAll("@", "") // '@' char cannot be used in HTMLElement attributes
                            const attr = `data-${facet}`
                            li.setAttribute(attr, val)
                        }
                    })

                    li.setAttribute("data-expanded", "true")
                    cachedFilterableEntities.set(obj["@id"].replace(/^https?:/, 'https:'), obj)
                    localStorage.setItem("expandedEntities", JSON.stringify(Object.fromEntries(cachedFilterableEntities)))

                    if(deerUtils.getURLParameter("gog-filter")){
                        li.classList.add("is-hidden")
                        // Check if this object should be hidden or not
                        const query = decodeContentState(deerUtils.getURLParameter("gog-filter").trim())
                        for(const prop in query){
                            if(li.hasAttribute(`data-${prop}`)){
                                if(li.getAttribute(`data-${prop}`).includes(query[prop])){
                                    li.classList.remove("is-hidden")
                                }
                                break
                            }
                        }
                    }
                    else{
                        // Not sure if we need this
                        li.classList.remove("is-hidden")
                    }

                    a.appendChild(span)
                    li.appendChild(a)
                    elem.replaceWith(li)
                    const numloaded = parseInt(containingListElem.querySelector(".totalsProgress").getAttribute("count")) + 1
                    const total = parseInt(containingListElem.querySelector(".totalsProgress").getAttribute("total"))
                    containingListElem.querySelector(".totalsProgress").setAttribute("count", numloaded)
                    containingListElem.querySelector(".totalsProgress").innerText = `${numloaded} of ${total} loaded (${parseInt(numloaded/total*100)}%).  This may take a few minutes.  You may click to select any Named Gloss loaded already.`
                    if(numloaded === total){
                        containingListElem.querySelector(".cachedNotice").classList.remove("is-hidden")
                        const providedFilters = deerUtils.getURLParameter("gog-filter") ? decodeContentState(deerUtils.getURLParameter("gog-filter").trim()) : {}
                        containingListElem.querySelector(".progressArea").classList.add("is-hidden")
                        containingListElem.querySelectorAll("input[filter]").forEach(i => {
                            // The filters that are used now need to be selected or take on the string or whatevs
                            i.classList.remove("is-hidden")
                            if(providedFilters.hasOwnProperty(i.getAttribute("filter"))){
                                i.value = deerUtils.getValue(providedFilters[i.getAttribute("filter")])
                            }
                        })
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
