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
const CLIENT_ID = "4TztHfVXjvs4H6ByCOXgwxtgA8IEQHsD"
const DOMAIN = "cubap.auth0.com"

// Persisted-session storage keys.
const SESSION_KEY = "gog_session"
const LOGIN_ATTEMPT_KEY = "gog_login_attempt"

// Initialize web authentication using Auth0
const webAuth = new auth0.WebAuth({
    "domain": DOMAIN,
    "clientID": CLIENT_ID,
    "audience": AUDIENCE,
    "scope": "read:roles update:current_user_metadata name nickname picture email profile openid",
    "redirectUri": origin,
    "responseType": "id_token token",
    "state": urlToBase64(location.href)
})
// A persisted session is { idToken, accessToken, payload }. `payload` is the verified

// Read the persisted session, or null.
const getSession = () => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) { return null }
    try {
        const session = JSON.parse(raw)
        return session?.payload ? session : null
    } catch (err) { return null }
}
// True if the session's id token has not expired.
const isLive = (session) => session?.payload?.exp * 1000 > Date.now()
// Build the in-memory user (payload + authorization) from a session or fresh auth result.
const toUser = (payload, accessToken) => ({ ...payload, authorization: accessToken })
// Persist tokens + verified payload so auth survives navigation without checkSession.
const persistSession = (result) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        idToken: result.idToken,
        accessToken: result.accessToken,
        payload: result.idTokenPayload
    }))
}
// Remove any persisted session.
const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
}
// Apply an authenticated user to the page: cache in memory, refresh creator inputs, announce.
const applyUser = (user) => {
    window.GOG_USER = user
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    document.dispatchEvent(new CustomEvent('gog-authenticated', { detail: window.GOG_USER }))
}
// Reflect an authenticated user on an auth-button.
const markLoggedIn = (btn, user) => {
    btn.innerText = `Logout ${user.nickname ?? ''}`.trim()
    btn.onclick = logout
    btn.removeAttribute('disabled')
}
// Defined, anonymous user so consumers reading GOG_USER.authorization have a value.
const setAnonymous = () => { window.GOG_USER = { authorization: "none" } }

// Logout functionality
const logout = () => {
    clearSession()
    sessionStorage.removeItem(LOGIN_ATTEMPT_KEY)
    delete window.GOG_USER
    document.querySelectorAll('[is="auth-creator"]').forEach(el=>el.connectedCallback())
    webAuth.logout({ returnTo: origin })
}
// Login functionality, supports passing custom Auth0 authorize() options.
// We always send { authParamsMap: { app: 'glossing' } }.
const login = (custom = {}) => {
    webAuth.authorize({ authParamsMap: { app: 'glossing' }, ...custom })
}
// Decode the `state` referrer from the hash, returning it only if it is a same-origin
// http(s) URL — never cross-origin or javascript:/data: — to avoid open-redirect/injection.
const safeReferrer = () => {
    let ref
    try { ref = b64toUrl(location.hash.split("state=")[1].split("&")[0]) }
    catch (err) { return "" }
    try {
        const url = new URL(ref, origin)
        return url.origin === origin ? url.href : ""
    } catch (err) { return "" }
}

// Redirect behavior and token capture
const handleAuthRedirect = () => {
    const params = new URLSearchParams(location.hash.replace(/^#/, ''))
    if (params.has('error')) { return }
    if (!params.has('access_token') && !params.has('id_token')) { return }

    // parseHash has verified the token (signature + nonce + state). Persist it, then
    // either bounce to the page the user started on, or hydrate in place.
    const finish = (result) => {
        persistSession(result)
        sessionStorage.removeItem(LOGIN_ATTEMPT_KEY)
        const ref = safeReferrer()
        if (ref && ref !== location.href) { location.href = ref; return }
        // Fallback (no usable referrer): strip the token hash so it doesn't linger in the URL.
        history.replaceState(null, '', location.pathname + location.search)
    }

    webAuth.parseHash({ hash: location.hash }, (err, result) => {
        if (err || !result?.idToken) {
            history.replaceState(null, '', location.pathname + location.search)
            return
        }
        finish(result)
    })
}

// Custom HTMLButtonElement to manage authentication
class AuthButton extends HTMLButtonElement {
    constructor() {
        super()
        this.onclick = logout
        this.login = login
        this.logout = logout
    }
    // Lifecycle callback to handle session check and response handling
    connectedCallback() {
        const isPublic = this.getAttribute('disabled') !== null

        // Trust a non-expired cached session — no silent auth, no redirect.
        const session = getSession()
        if (isLive(session)) {
            const user = toUser(session.payload, session.accessToken)
            applyUser(user)
            markLoggedIn(this, user)
            return
        }

        //Otherwise try Auth0 silent auth (works only where 3rd-party cookies are allowed).
        webAuth.checkSession({}, (err, result) => {
            if (err || !(result?.idToken ?? result?.accessToken)) {
                setAnonymous()
                clearSession()

                if (isPublic) { return }
                // Allow at most ONE automatic login redirect per tab session.
                if (sessionStorage.getItem(LOGIN_ATTEMPT_KEY)) {
                    sessionStorage.removeItem(LOGIN_ATTEMPT_KEY)
                    this.innerText = 'login'
                    this.onclick = () => login()
                    return
                }
                sessionStorage.setItem(LOGIN_ATTEMPT_KEY, '1')
                login()
                return
            }

            // Silent auth succeeded — persist + hydrate like a fresh login.
            sessionStorage.removeItem(LOGIN_ATTEMPT_KEY)
            persistSession(result)
            const user = toUser(result.idTokenPayload, result.accessToken)
            applyUser(user)
            markLoggedIn(this, user)
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

// Capture any Auth0 redirect tokens as soon as this module loads, before the
// auth-button's silent-auth path runs.
handleAuthRedirect()


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
