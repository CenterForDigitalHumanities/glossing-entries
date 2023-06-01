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
        CREATE: "https://tinymatt.rerum.io/gloss/create",
        UPDATE: "https://tinymatt.rerum.io/gloss/update",
        QUERY: "https://tinymatt.rerum.io/gloss/query?limit=100&skip=0",
        OVERWRITE: "https://tinymatt.rerum.io/gloss/overwrite",
        DELETE: "https://tinymatt.rerum.io/gloss/delete",
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
            if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Glossing Matthew users.</h4>` }
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
            if(!userHasRole(["glossing_user_manager", "glossing_user_contributor", "glossing_user_public"])) { return `<h4 class="text-error">This function is limited to registered Glossing Matthew users.</h4>` }
            let html = `<a href="./manage-glosses.html" class="button">Manage Named Glosses</a> <h2>Named Glosses</h2>
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
