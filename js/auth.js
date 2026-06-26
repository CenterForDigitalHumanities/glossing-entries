/**
 * @module Auth Auth0 authentication for the Gallery of Glosses data entry interfaces.
 * @author cubap
 *
 * @description Provides a single `initAuth()` function for page-level authentication,
 * a login/logout `AuthButton` custom element, and an `AuthCreator` input element.
 *
 * Flow:
 *  1. On load, check for OAuth callback params (code= in URL). If present, handle the
 *     callback, persist the session, and redirect to the originally requested page.
 *  2. Restore a cached session from localStorage if valid (not expired). This is the
 *     primary and authoritative path — no Auth0 network calls are made.
 *  3. If no valid session and `requireLogin: true`, redirect to Auth0 with the current
 *     URL encoded in the `state` parameter so the user returns to the original page.
 *  4. If no valid session and `requireLogin: false`, set an anonymous user.
 *
 * Migrated from cookie-based auth to JWT Bearer token authentication (Issue #308).
 * The idToken is used as the Bearer token for API requests (matching TinyMatt #18 backend).
 */

// Storage keys
const SESSION_KEY = "gog_session"
const REFERRER_KEY = "gog_referrer"

// Authentication configuration constants (needed outside try block for login/logout)
const __authConfig = await fetch("../properties.json").then(r => r.json()).catch(() => ({}))
const AUTH0_DOMAIN = __authConfig.auth0?.domain ?? "cubap.auth0.com"
const AUTH0_CLIENT_ID = __authConfig.auth0?.clientId ?? "4TztHfVXjvs4H6ByCOXgwxtgA8IEQHsD"
const AUTH0_AUDIENCE = __authConfig.auth0?.audience ?? "https://cubap.auth0.com/api/v2/"
const AUTH0_SCOPE = __authConfig.auth0?.scope ?? "openid profile email nickname picture"
const REDIRECT_URI = `${location.protocol}//${location.host}`

// Auth0 client — may be null if storage is blocked or SDK fails to load
let auth0Client = null

try {
    // Load Auth0 SPA SDK from local UMD build (CDN was blocked)
    // The UMD build exposes createAuth0Client on window when loaded as a script tag
    const script = document.createElement('script')
    script.src = '../js/auth0-spa-js.production.js'
    await new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
    })

    // Create Auth0 SPA client instance (PKCE flow, no iframe needed)
    auth0Client = await window.auth0.createAuth0Client({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        scope: AUTH0_SCOPE,
        authorizationParams: {
            redirect_uri: REDIRECT_URI,
            audience: AUTH0_AUDIENCE,
        },
        useRefreshTokens: false,
        cacheLocation: 'localstorage',
        onRedirectCallback: (appState) => {
            // URL cleanup happens after successful auth restoration below.
        }
    })
} catch (err) {
    console.warn("Auth0 client failed to initialize (storage blocked or SDK error):", err.message)
}

// --- Session helpers ---

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

// --- Login / Logout ---

// Logout: clear session, update UI, redirect to Auth0 logout.
const logout = () => {
    clearSession()
    delete window.GOG_USER
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    if (auth0Client) {
        auth0Client.logout({ logoutParams: { returnTo: origin } })
    }
}

// Login: save the current URL as referrer, redirect to Auth0.
const login = (custom = {}) => {
    if (!auth0Client) {
        console.error("Cannot login: Auth0 client not initialized (storage may be blocked)")
        return
    }
    sessionStorage.setItem(REFERRER_KEY, location.href)
    auth0Client.loginWithRedirect({
        authorizationParams: {
            redirect_uri: REDIRECT_URI,
            audience: AUTH0_AUDIENCE,
            ...custom
        }
    })
}

// --- OAuth callback handler ---

// Handle the redirect callback from Auth0 after login.
// Returns true if a callback was processed, false otherwise.
async function handleLoginRedirect() {
    const hasCode = location.search.includes("code=") || location.hash.includes("code=")
    if (!hasCode) {
        return false
    }
    if (!auth0Client) {
        console.error("Cannot handle login redirect: Auth0 client not initialized (storage may be blocked)")
        return false
    }
    try {
        const result = await auth0Client.handleRedirectCallback()
        const claims = await auth0Client.getUser()
        const token = await auth0Client.getIdTokenClaims()

        // Check that the user has 'glossing' in their app array
        const appClaim = claims["http://rerum.io/apps"] ?? claims.apps ?? claims.app
        if (Array.isArray(appClaim) && !appClaim.includes("glossing")) {
            console.warn("User does not have 'glossing' in their app array. Redirecting for consent.")
            clearSession()
            auth0Client.loginWithRedirect({
                authorizationParams: {
                    redirect_uri: REDIRECT_URI,
                    audience: AUTH0_AUDIENCE,
                    prompt: 'consent'
                }
            })
            return false
        }

        // Persist the full session for reliable restore
        persistSession({ idToken: token.__raw, accessToken: token.__raw, idTokenPayload: token })

        // Apply user state — merge user profile claims with token claims for full profile
        const user = toUser({ ...token, ...claims }, token.__raw)
        applyUser(user)

        // Clean up OAuth params from URL after successful auth
        history.replaceState({}, document.title, location.pathname)

        // Return to the page the user started on
        const ref = sessionStorage.getItem(REFERRER_KEY)
        sessionStorage.removeItem(REFERRER_KEY)
        if (ref && ref !== location.href) {
            window.location.href = ref
            return true
        }
    } catch (err) {
        console.error("Auth redirect error:", err)
    }
    return false
}

// --- Page-level auth initialization ---

/**
 * Initialize authentication for a page.
 *
 * Order of operations:
 *  1. Check for OAuth callback params → handle callback, persist session, redirect to referrer.
 *  2. Restore cached session from localStorage if valid → apply user immediately.
 *  3. If no valid session and `requireLogin: true` → redirect to Auth0.
 *  4. If no valid session and `requireLogin: false` → set anonymous user.
 *
 * @param {Object} options
 * @param {boolean} [options.requireLogin=false] - If true and not authenticated, redirect to Auth0.
 */
async function initAuth({ requireLogin = false } = {}) {
    // 1. Handle OAuth callback if present
    const handled = await handleLoginRedirect()
    if (handled) return

    // 2. Restore cached session (primary path — no Auth0 calls)
    const session = getSession()
    if (isLive(session)) {
        const user = toUser(session.payload, session.accessToken)
        applyUser(user)
        return
    }

    // 3. No valid session
    if (requireLogin) {
        // Redirect to Auth0 with current URL as referrer
        sessionStorage.setItem(REFERRER_KEY, location.href)
        login()
    } else {
        setAnonymous()
        clearSession()
    }
}

// --- Role-based access guard ---

/**
 * Page-level auth guard.
 * Checks if the current user has the required role(s).
 * Call after `initAuth()` has completed.
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
            location.href = redirectUrl
        }
    }

    // Synchronous check: GOG_USER should already be set by initAuth()
    if (window.GOG_USER && !hasRequiredRole(window.GOG_USER)) {
        denyAccess()
        return
    }

    // If GOG_USER is not set yet, wait for the gog-authenticated event
    if (!window.GOG_USER) {
        const onAuth = (e) => {
            if (!hasRequiredRole(e.detail)) {
                denyAccess()
            }
            document.removeEventListener("gog-authenticated", onAuth)
        }
        document.addEventListener("gog-authenticated", onAuth)
    }
}

// --- AuthButton custom element ---

/**
 * Custom `<button is="auth-button">` element for login/logout.
 * Shows "Login" when unauthenticated, "Logout {nickname}" when authenticated.
 * No auto-login logic — that is handled by `initAuth()` on each page.
 */
class AuthButton extends HTMLButtonElement {
    constructor() {
        super()
    }

    connectedCallback() {
        // Check if user is logged in
        if (window.GOG_USER && window.GOG_USER.authorization !== "none") {
            const user = window.GOG_USER
            this.innerText = `Logout ${user.nickname ?? user.email?.split('@')[0] ?? 'User'}`
            this.onclick = logout
        } else {
            this.innerText = 'Login'
            this.onclick = () => login()
        }

        // Listen for auth state changes (e.g., after initAuth completes)
        const onAuth = (e) => {
            this.innerText = `Logout ${e.detail.nickname ?? e.detail.email?.split('@')[0] ?? 'User'}`
            this.onclick = logout
            document.removeEventListener("gog-authenticated", onAuth)
        }
        document.addEventListener("gog-authenticated", onAuth)
    }
}

customElements.define('auth-button', AuthButton, { extends: 'button' })

// --- AuthCreator custom element ---

/**
 * Extends HTMLInputElement to dynamically set creator's details from GOG_USER.
 */
class AuthCreator extends HTMLInputElement {
    constructor() {
        super()
    }

    connectedCallback() {
        if (!window.GOG_USER) { return }
        this.value = GOG_USER["http://store.rerum.io/agent"] ?? "anonymous"
        this.closest("form")?.setAttribute("deer-creator", GOG_USER["http://store.rerum.io/agent"] ?? "anonymous")
    }
}

customElements.define('auth-creator', AuthCreator, { extends: 'input' })

// Expose functions to the global scope so inline (non-module) scripts can call them
window.initAuth = initAuth
window.checkAuth = checkAuth
