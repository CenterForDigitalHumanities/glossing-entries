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
 * 
 * Migrated from cookie-based auth to JWT Bearer token authentication (Issue #308).
 * The idToken is now used as the Bearer token for API requests (matching TinyMatt #18 backend).
 */

// Load Auth0 SPA SDK from local UMD build (CDN was blocked)
// The UMD build exposes createAuth0Client on window when loaded as a script tag
const script = document.createElement('script')
script.src = '../js/auth0-spa-js.production.js'
await new Promise((resolve, reject) => {
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
})

// Load Auth0 configuration from properties.json (falls back to hardcoded defaults for backward compatibility)
const __authConfig = await fetch("../properties.json").then(r => r.json()).catch(() => ({}))

// Authentication configuration constants - loaded from properties.json with fallback defaults
const AUTH0_DOMAIN = __authConfig.auth0?.domain ?? "cubap.auth0.com"
const AUTH0_CLIENT_ID = __authConfig.auth0?.clientId ?? "4TztHfVXjvs4H6ByCOXgwxtgA8IEQHsD"
const AUTH0_AUDIENCE = __authConfig.auth0?.audience ?? "https://cubap.auth0.com/api/v2/"
const AUTH0_SCOPE = __authConfig.auth0?.scope ?? "openid profile email nickname picture"

// Create Auth0 SPA client instance (PKCE flow, no iframe needed)
// Use explicit redirect URI to avoid trailing slash mismatches with Auth0
const REDIRECT_URI = `${location.protocol}//${location.host}`
const auth0Client = await window.auth0.createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    scope: AUTH0_SCOPE,
    authorizationParams: {
        redirect_uri: REDIRECT_URI
    },
    useRefreshTokens: false,
    cacheLocation: 'localstorage',
    onRedirectCallback: (appState) => {
        // Stay on the current page, just clean up OAuth params from URL
        history.replaceState({}, document.title, location.pathname)
    }
})

// Logout functionality
const logout = () => {
    localStorage.removeItem("userToken")
    delete window.GOG_USER
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    auth0Client.logout({ logoutParams: { returnTo: origin } })
}

// Login functionality, supports passing custom configuration
const login = (custom) => {
    auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: REDIRECT_URI
        }
    })
}

// Handle the redirect callback from Auth0 after login
async function handleLoginRedirect() {
    // Only process redirect if we have OAuth parameters in the URL
    const hasCode = location.search.includes("code=") || location.hash.includes("code=")
    if (!hasCode) {
        return false
    }
    try {
        await auth0Client.handleRedirectCallback()
        const claims = await auth0Client.getUser()
        const token = await auth0Client.getIdTokenClaims()
        // Use idToken as the Bearer token for API requests (Issue #308)
        localStorage.setItem("userToken", token.__raw)
        window.GOG_USER = claims
        window.GOG_USER.authorization = token.__raw
        document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
        const loginEvent = new CustomEvent('gog-authenticated', { detail: window.GOG_USER })
        document.dispatchEvent(loginEvent)
        return true
    } catch (err) {
        console.error("Auth redirect error:", err)
    }
    return false
}

// Handle redirect on module load (only if we're processing a callback)
await handleLoginRedirect()

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
        // Don't set onclick here - we handle it in connectedCallback
        this.login = login
        this.logout = logout
    }
    // Lifecycle callback to handle session check and response handling
    connectedCallback() {
        // Check for a cached token in localStorage first
        const cachedToken = localStorage.getItem("userToken")
        if (cachedToken) {
            // Try to decode the cached token to validate it
            try {
                // JWT uses base64url encoding (- and _), convert to standard base64 (+ and /) for atob
                const payload = JSON.parse(atob(cachedToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
                const now = Math.floor(Date.now() / 1000)
                if (payload.exp > now) {
                    // Token is still valid, restore user state
                    window.GOG_USER = payload
                    window.GOG_USER.authorization = cachedToken
                    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
                    this.innerText = `Logout ${payload.nickname}`
                    this.onclick = logout
                    this.removeAttribute('disabled')
                    const loginEvent = new CustomEvent('gog-authenticated', { detail: window.GOG_USER })
                    document.dispatchEvent(loginEvent)
                    return
                } else {
                    // Token expired, clear it
                    localStorage.removeItem("userToken")
                }
            } catch (e) {
                // Token decode failed, clear it
                localStorage.removeItem("userToken")
            }
        }

        // No valid cached token - set up button for login on click
        this.onclick = login
        this.innerText = 'Login'
    }
}

customElements.define('auth-button', AuthButton, { extends: 'button' })

// Extends HTMLInputElement to dynamically set creator's details.
class AuthCreator extends HTMLInputElement {
    constructor() {
        super()
    }

    connectedCallback() {
        if (!window.GOG_USER) { return }
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

export default { AuthButton, AuthCreator }
