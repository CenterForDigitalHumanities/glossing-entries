/**
 * @module AuthButton Adds custom element for login/logout of Auth0, based on configuration below.
 * @author cubap
 * 
 * @description This module includes a custom `<button is="auth-button">` element for authentication within 
 * the Gallery of Glosses Project, specifically the data entry interfaces.
 * Notes: 
 * - Include this module and a button[is='auth-button'] element to use. 
 * - Add the `disabled` property on any page that should be available to the public, but knowing the user may be helpful.
 * - This can be made more generic by passing in the constants and parameterizing {app:'glossing'}.
 */

// Import Auth0 library
import 'https://cdn.auth0.com/js/auth0/9.19.0/auth0.min.js'

// Authentication configuration constants
const AUDIENCE = "https://cubap.auth0.com/api/v2/"
const ISSUER_BASE_URL = "cubap.auth0.com"
const CLIENT_ID = "4TztHfVXjvs4H6ByCOXgwxtgA8IEQHsD"
const DOMAIN = "cubap.auth0.com"

// Initialize web authentication using Auth0
const webAuth = new auth0.WebAuth({
    "domain": DOMAIN,
    "clientID": CLIENT_ID,
    "audience": AUDIENCE,
    "scope": "read:roles update:current_user_metadata name nickname picture email profile openid offline_access",
    "redirectUri": origin,
    "responseType": "id_token token",
    "state": urlToBase64(location.href)
})

// Logout functionality
const logout = () => {
    localStorage.removeItem("userToken")
    delete window.GOG_USER
    document.querySelectorAll('[is="auth-creator"]').forEach(el=>el.connectedCallback())
    webAuth.logout({ returnTo: origin })
}
// Login functionality, supports passing custom configuration
const login = (custom) => {
    webAuth.authorize(Object.assign({ authParamsMap: { 'app': 'glossing' } },custom))
}
// Helper function to get referring page from URL state
const getReferringPage = () => {
    try {
        return b64toUrl(location.hash.split("state=")[1].split("&")[0])
    } catch (err) {
        return ""
    }
}
// Custom HTMLButtonElement to manage authentication
class AuthButton extends HTMLButtonElement {
    constructor() {
        super()
        this.onclick = logout // Binds logout function to button click.
        this.login = login
        this.logout = logout
    }
    // Lifecycle callback to handle session check and response handling
    connectedCallback() {
        webAuth.checkSession({}, (err, result) => {
            if (err) {
                if (this.getAttribute('disabled') !== null) { return }
                login() // Perform login if not authenticated.
            }
            const ref = getReferringPage()
            if (ref && ref !== location.href) { location.href = ref }
            if (!(result?.idToken ?? result?.accessToken)){
                console.error("There was missing token information from the login. Reset the cached User")
                window.GOG_USER = {}
                window.GOG_USER.authorization = "none"
                localStorage.removeItem("userToken")
                return
            }
            localStorage.setItem("userToken", result.idToken)
            window.GOG_USER = result.idTokenPayload
            window.GOG_USER.authorization = result.accessToken
            document.querySelectorAll('[is="auth-creator"]').forEach(el=>el.connectedCallback())
            this.innerText = `Logout ${GOG_USER.nickname}`
            this.removeAttribute('disabled')
            const loginEvent = new CustomEvent('gog-authenticated',{detail:window.GOG_USER})
            document.dispatchEvent(loginEvent)
        })
    }
}

customElements.define('auth-button', AuthButton, { extends: 'button' })

// Extends HTMLInputElement to dynamically set creator's details.
class AuthCreator extends HTMLInputElement {
    constructor() {
        super()
    }

    connectedCallback() {
        if(!window.GOG_USER) { return }
        this.value = GOG_USER["http://store.rerum.io/agent"] ?? "anonymous"
        this.closest("form").setAttribute("deer-creator", GOG_USER["http://store.rerum.io/agent"] ?? "anonymous")
    }
}

customElements.define('auth-creator', AuthCreator, { extends: 'input' })


/**
 * Follows the 'base64url' rules to decode a string.
 * @param {String} base64str from `state` parameter in the hash from Auth0
 * @returns referring URL
 */
function b64toUrl(base64str) {
    return window.atob(base64str.replace(/-/g, "+").replace(/_/g, "/"))
}
/**
 * Follows the 'base64url' rules to encode a string.
 * @param {String} url from `window.location.href`
 * @returns encoded string to pass as `state` to Auth0
 */
function urlToBase64(url) {
    return window.btoa(url).replace(/\//g, "_").replace(/\+/g, "-").replace(/=+$/, "")
}

export default {AuthButton, AuthCreator}
