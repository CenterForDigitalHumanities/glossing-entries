import { default as DEER } from './deer-config.js'
import { default as UTILS } from './deer-utils.js'
import './layout.js'

function globalFeedbackBlip(event, message, success) {
    globalFeedback.innerText = message
    globalFeedback.classList.add("show")
    if (success) {
        globalFeedback.classList.add("bg-success")
    } else {
        globalFeedback.classList.add("bg-error")
    }
    setTimeout(function () {
        globalFeedback.classList.remove("show")
        globalFeedback.classList.remove("bg-error")
        // backup to page before the form
        UTILS.broadcast(event, "globalFeedbackFinished", globalFeedback, { message: message })
    }, 3000)
}

document.addEventListener('deer-updated', event => {
    globalFeedbackBlip(event, `Saving ${event.detail.name ? "'" + event.detail.name + "' " : ""}successful!`, true)
})

/** Auth */
/*

const GLOSSING_USER_ROLES_CLAIM = "http://rerum.io/user_roles"
const GOG_ADMIN = "glossing_user_admin"
const GOG_CONTRIBUTOR = "glossing_user_contribustor"

const auth = document.querySelector('[is="auth-button"]')

auth.addEventListener("gog-authenticated", ev => {
    if (document.querySelector("[data-user='admin']")) {
        if( !tokenHasRole(ev.detail.authorization,GOG_ADMIN)){ document.querySelectorAll("[data-user='admin']").forEach(elem=>elem.replaceWith(`Restricted`)) }
    }

    if (document.querySelector("[data-user='contributor']")) {
        if( !tokenHasRole(ev.detail.authorization,GOG_CONTRIBUTOR)){ document.querySelectorAll("[data-user='contributor']").forEach(elem=>elem.replaceWith(`Restricted`)) }
    }
})
import jwt_decode from "./jwt.js"
function tokenHasRole(token,role) {
    const user = jwt_decode(token)
    return userHasRole(user, role)
}

*/

/**
 * Checks array of stored roles for any of the roles provided.
 * @param {Array} roles Strings of roles to check.
 * @returns Boolean user has one of these roles.
 */
/*

function userHasRole(user, roles) {
    if (!Array.isArray(roles)) { roles = [roles] }
    return Boolean(user?.[GLOSSING_USER_ROLES_CLAIM]?.roles.filter(r => roles.includes(r)).length)
}

*/

