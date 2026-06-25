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
 * 
 * Login loop prevention: tracks login attempts in sessionStorage to prevent infinite redirects.
 * Silent auth: tries checkSession before falling back to manual login.
 */

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

// Persisted-session storage keys
const SESSION_KEY = "gog_session"
const LOGIN_ATTEMPT_KEY = "gog_login_attempt"

// Use explicit redirect URI to avoid trailing slash mismatches with Auth0
const REDIRECT_URI = `${location.protocol}//${location.host}`

// Create Auth0 SPA client instance (PKCE flow, no iframe needed)
const auth0Client = await window.auth0.createAuth0Client({
    domain: AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    scope: AUTH0_SCOPE,
    authorizationParams: {
        redirect_uri: REDIRECT_URI,
        audience: AUTH0_AUDIENCE,
        state: urlToBase64(location.href) // Safe referrer: base64-encoded current URL
    },
    useRefreshTokens: false,
    cacheLocation: 'localstorage',
    onRedirectCallback: (appState) => {
        // URL cleanup happens after successful auth restoration below.
    }
})

// --- Session helpers (from hotfix branch) ---

// A persisted session is { idToken, accessToken, payload }. `payload` is the verified
// idTokenPayload. Storing the full payload avoids re-decoding on restore.
const persistSession = (result) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        idToken: result.idToken,
        accessToken: result.accessToken,
        payload: result.idTokenPayload
    }))
}

// Read the persisted session, or null.
const getSession = () => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
        const session = JSON.parse(raw)
        return session?.payload ? session : null
    } catch { return null }
}

// True if the session's id token has not expired.
const isLive = (session) => session?.payload?.exp * 1000 > Date.now()

// Remove any persisted session.
const clearSession = () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem("userToken")
}

// Build the in-memory user (payload + authorization) from a session or fresh auth result.
const toUser = (payload, accessToken) => ({ ...payload, authorization: accessToken })

// Apply an authenticated user to the page: cache in memory, refresh creator inputs, announce.
const applyUser = (user) => {
    window.GOG_USER = user
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    document.dispatchEvent(new CustomEvent('gog-authenticated', { detail: window.GOG_USER }))
}

// Defined, anonymous user so consumers reading GOG_USER.authorization have a value.
const setAnonymous = () => { window.GOG_USER = { authorization: "none" } }

// Logout functionality
const logout = () => {
    clearSession()
    sessionStorage.removeItem(LOGIN_ATTEMPT_KEY)
    delete window.GOG_USER
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    auth0Client.logout({ logoutParams: { returnTo: origin } })
}

// Login functionality, supports passing custom configuration
// We always send the current page as `state` so Auth0 returns us there.
const login = (custom = {}) => {
    auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: REDIRECT_URI,
            audience: AUTH0_AUDIENCE,
            state: urlToBase64(location.href),
            ...custom
        }
    })
}

// Decode the `state` referrer from the hash, returning it only if it is a same-origin
// http(s) URL — never cross-origin or javascript:/data: — to avoid open-redirect/injection.
const safeReferrer = () => {
    let ref
    try { ref = b64toUrl(location.hash.split("state=")[1].split("&")[0]) }
    catch { return "" }
    try {
        const url = new URL(ref, origin)
        return url.origin === origin ? url.href : ""
    } catch { return "" }
}

// Handle the redirect callback from Auth0 after login
async function handleLoginRedirect() {
    // Only process redirect if we have OAuth parameters in the URL
    const hasCode = location.search.includes("code=") || location.hash.includes("code=")
    if (!hasCode) {
        return false
    }
    try {
        const result = await auth0Client.handleRedirectCallback()
        const claims = await auth0Client.getUser()
        const token = await auth0Client.getIdTokenClaims()

        // The app array may be stored in various claim keys depending on Auth0 configuration
        const appClaim = claims["http://rerum.io/apps"] ?? claims.apps ?? claims.app
        if (Array.isArray(appClaim) && !appClaim.includes("glossing")) {
            console.warn("User does not have 'glossing' in their app array. Redirecting to login for consent.")
            clearSession()
            // Force a fresh login to trigger the consent screen
            auth0Client.loginWithRedirect({
                authorizationParams: {
                    redirect_uri: REDIRECT_URI,
                    audience: AUTH0_AUDIENCE,
                    prompt: 'consent' // Force consent screen
                }
            })
            return false
        }

        // Persist the full session (token + verified payload) for reliable restore
        persistSession({ idToken: token.__raw, accessToken: token.__raw, idTokenPayload: claims })
        // Also store raw token for backward compatibility
        localStorage.setItem("userToken", token.__raw)

        // Clear login attempt tracker now that login succeeded
        sessionStorage.removeItem(LOGIN_ATTEMPT_KEY)

        // Apply user state
        const user = toUser(claims, token.__raw)
        applyUser(user)

        // Clean up OAuth params from URL after successful auth
        history.replaceState({}, document.title, location.pathname)

        // Return to the page the user started on (via safe referrer from Auth0 state)
        const ref = safeReferrer()
        if (ref && ref !== location.href) {
            window.location.href = ref
            return true
        }
    } catch (err) {
        console.error("Auth redirect error:", err)
    }
    return false
}

// Handle redirect on module load (only if we're processing a callback)
await handleLoginRedirect()

/**
 * Page-level auth guard.
 * Checks if the current user has the required role(s).
 * Handles both synchronous (GOG_USER already set from cached token) and
 * asynchronous (waits for gog-authenticated event after redirect) cases.
 *
 * @param {string|string[]} requiredRole - Role or array of roles the user must have.
 * @param {string} redirectUrl - URL to redirect unauthorized users to.
 * @param {string} message - Message to show before redirecting.
 */
function checkAuth(requiredRole, redirectUrl, message) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole]

    function hasRequiredRole(user) {
        if (!user) return false
        const userRoles = user["http://rerum.io/user_roles"]?.roles
        if (!Array.isArray(userRoles)) return false
        return roles.some(r => userRoles.includes(r))
    }

    function denyAccess() {
        if (typeof globalFeedbackBlip === "function") {
            const ev = new CustomEvent("Not Authorized")
            globalFeedbackBlip(ev, message, false)
            addEventListener("globalFeedbackFinished", () => {
                location.href = redirectUrl
            })
        } else {
            // Fallback if globalFeedbackBlip isn't available yet
            location.href = redirectUrl
        }
    }

    // Synchronous check: GOG_USER may already be set from cached token
    if (window.GOG_USER) {
        if (!hasRequiredRole(window.GOG_USER)) {
            denyAccess()
        }
        return
    }

    // Asynchronous check: wait for gog-authenticated event
    const onAuth = (e) => {
        if (!hasRequiredRole(e.detail)) {
            denyAccess()
        }
        document.removeEventListener("gog-authenticated", onAuth)
    }
    document.addEventListener("gog-authenticated", onAuth)

    // Safety timeout: if no auth event fires within 10s, deny access
    // (user is not logged in and therefore doesn't have the role)
    setTimeout(() => {
        if (!window.GOG_USER) {
            denyAccess()
        }
    }, 10000)
}

// Reflect an authenticated user on an auth-button.
const markLoggedIn = (btn, user) => {
    btn.innerText = `Logout ${user.nickname ?? user.email?.split('@')[0] ?? 'User'}`
    btn.onclick = logout
    btn.removeAttribute('disabled')
}

// Custom HTMLButtonElement to manage authentication
class AuthButton extends HTMLButtonElement {
    constructor() {
        super()
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

        // Try silent auth (works only where 3rd-party cookies are allowed).
        // This is a fallback for browsers that support it; we don't block on it.
        const handleNoSession = () => {
            setAnonymous()
            clearSession()

            if (isPublic) { return }

            // Allow at most ONE automatic login redirect per tab session (login loop prevention).
            if (sessionStorage.getItem(LOGIN_ATTEMPT_KEY)) {
                sessionStorage.removeItem(LOGIN_ATTEMPT_KEY)
                this.innerText = 'Login'
                this.onclick = () => login()
                return
            }
            sessionStorage.setItem(LOGIN_ATTEMPT_KEY, '1')
            login()
        }

        auth0Client.checkSession().then((result) => {
            if (result?.idToken) {
                persistSession(result)
                localStorage.setItem("userToken", result.idToken)
                const user = toUser(result.idTokenPayload, result.idToken)
                applyUser(user)
                markLoggedIn(this, user)
            } else {
                // checkSession resolved but no valid session — fall through to manual login
                handleNoSession()
            }
        }).catch(() => {
            // Silent auth failed (expected on ITP browsers) — fall through to manual login.
            handleNoSession()
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
        if (!window.GOG_USER) { return }
        this.value = GOG_USER["http://store.rerum.io/agent"] ?? "anonymous"
        this.closest("form").setAttribute("deer-creator", GOG_USER["http://store.rerum.io/agent"] ?? "anonymous")
    }
}

customElements.define('auth-creator', AuthCreator, { extends: 'input' })

export default { AuthButton, AuthCreator }
