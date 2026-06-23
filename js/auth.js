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

// Import modern Auth0 SPA SDK
import Auth0Client from 'https://cdn.auth0.com/js/auth0-spa-js/2.1.3/auth0-spa-js.production.js'

// Load Auth0 configuration from properties.json (falls back to hardcoded defaults for backward compatibility)
const __authConfig = await fetch("../properties.json").then(r => r.json()).catch(() => ({}))

// Authentication configuration constants - loaded from properties.json with fallback defaults
const AUTH0_DOMAIN = __authConfig.auth0?.domain ?? "cubap.auth0.com"
const AUTH0_CLIENT_ID = __authConfig.auth0?.clientId ?? "4TztHfVXjvs4H6ByCOXgwxtgA8IEQHsD"
const AUTH0_AUDIENCE = __authConfig.auth0?.audience ?? "https://cubap.auth0.com/api/v2/"
const AUTH0_REDIRECT_URI = __authConfig.auth0?.redirectUri ?? origin
const AUTH0_SCOPE = __authConfig.auth0?.scope ?? "read:roles update:current_user_metadata name nickname picture email profile openid offline_access"

// Initialize Auth0 SPA client (replaces deprecated auth0.WebAuth)
let auth0Client = null

async function getAuth0Client() {
    if (auth0Client) return auth0Client
    auth0Client = new Auth0Client({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        audience: AUTH0_AUDIENCE,
        scope: AUTH0_SCOPE,
        redirectUri: AUTH0_REDIRECT_URI,
        useRefreshTokens: true,
        cacheLocation: "localstorage"
    })
    return auth0Client
}

// Logout functionality
const logout = async () => {
    localStorage.removeItem("userToken")
    delete window.GOG_USER
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    const client = await getAuth0Client()
    client.logout({ returnTo: AUTH0_REDIRECT_URI })
}

// Login functionality, supports passing custom configuration
const login = async (custom) => {
    const client = await getAuth0Client()
    client.loginWithRedirect({
        appState: { returnTo: location.href },
        ...custom
    })
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
    async connectedCallback() {
        try {
            const client = await getAuth0Client()
            // Check if user is authenticated
            const isAuthenticated = await client.isAuthenticated()

            if (!isAuthenticated) {
                if (this.getAttribute('disabled') !== null) { return }
                login() // Perform login if not authenticated.
                return
            }

            // Get user profile and raw idToken for Bearer auth
            const user = await client.getUser()
            const idTokenClaims = await client.getIdTokenClaims()

            if (!idTokenClaims) {
                console.error("There was missing token information from the login. Reset the cached User")
                window.GOG_USER = {}
                window.GOG_USER.authorization = "none"
                localStorage.removeItem("userToken")
                return
            }

            // Get the raw idToken string for Bearer token auth (matches TinyMatt #18 backend)
            // The __raw property contains the actual JWT string
            const rawIdToken = idTokenClaims.__raw

            // Store the raw idToken as the Bearer token
            localStorage.setItem("userToken", rawIdToken)

            // Set global user object - use idToken as the authorization Bearer token
            window.GOG_USER = user
            window.GOG_USER.authorization = rawIdToken

            document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
            this.innerText = `Logout ${user.nickname}`
            this.removeAttribute('disabled')

            const loginEvent = new CustomEvent('gog-authenticated', { detail: window.GOG_USER })
            document.dispatchEvent(loginEvent)
        } catch (err) {
            // If checkSession fails (no cached session), trigger login
            if (this.getAttribute('disabled') !== null) { return }
            console.warn("Auth session check failed, initiating login:", err.message)
            login()
        }
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

export default {AuthButton, AuthCreator}
