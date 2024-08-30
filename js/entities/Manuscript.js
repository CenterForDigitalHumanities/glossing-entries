import { default as DEER } from '../deer-utils.js'

/**
 * Manuscript entity. Represents a manuscript witness for that contains glosses.
 * @class Manuscript 
 * @param {string} id - The unique identifier for the manuscript, shelfmark or RERUM id.
 * @throws {Error} - If the provided id is not a valid RERUM id or shelfmark.
 */
class Manuscript {
    #_id
    #identifier
    #actions

    constructor(id) {
        Object.assign(this, assignIdentifier(id))
        if (this.identifier) {
            this.addAction(firstByShelfmark(this.identifier).then(id => {
                if(id) { this._id = id.split("/").pop() }
            }))
        }
        if (this._id) {
            this.addAction(this.load)
        }
    }

    /**
     * Loads the manuscript from RERUM and attaches any annotations discovered.
     * @returns {Promise} - A promise that resolves when the manuscript has been loaded.
     */
    load() {
        DEER.expand(this._id).then(data => this.expanded = Object.assign(this.expanded ?? {}, data))
            .then(this.#_id = this._id)
    }
    #actions = []
    #isRunning = false

    /**
     * Adds an async function to the queue of actions.
     * @param {Function} action - The async function to be added to the queue.
     */
    addAction(action) {
        this.#actions.push(action)
        if (this.#actions.length === 1) {
            this.executeActions()
        }
    }

    /**
     * Executes the actions in the queue in order.
     * @returns {Promise} - A promise that resolves when all actions in the queue have been executed.
     */
    async #executeActions() {
        this.#isRunning = true
        while (this.#actions.length > 0) {
            const action = this.#actions.shift()
            await action()
        }
        this.#isRunning = false
    }

    /**
     * Checks whether actions are still running.
     * @returns {boolean} - True if actions are still running, false otherwise.
     */
    isRunning() {
        return this.#isRunning
    }
}

/**
 * Determines if the provided string is a RERUM id or a Shelfmark, assigning the appropriate Manuscript property.
 * @param {string} id - The unique identifier for the manuscript, shelfmark or RERUM id.
 */
function assignIdentifier(id) {
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
        return { "_id": id }
    }

    if (typeof id === "string" && id.length <= 40) {
        return { "identifier": id }
    }

    throw new Error("Invalid identifier")
}

/**
 * For a given shelfmark, query RERUM to find matching Manuscript Witness entities.
 * 
 * @param shelfmark - A string representing the shelfmark value
 * @return the Manuscript Witness URI
 */ 
async function firstByShelfmark(shelfmark){
    const historyWildcard = { "$exists": true, "$size": 0 }
    const shelfmarkAnnosQuery = {
        "body.identifier.value": shelfmark,
        "__rerum.generatedBy" : httpsIdArray(__constants.generator)
    }
    const shelfmarkAnnos = await DEER.getPagedQuery(100, 0, shelfmarkAnnosQuery)
    while(shelfmarkAnnos.length >0){
        const entity = await fetch(shelfmarkAnnos.pop()?.target).then(resp => resp.json()).catch(err => {throw err})
        if (entity["@type"] === "ManuscriptWitness"){
            return entity["@id"] ?? entity["id"]
        }
    }
    return
}
