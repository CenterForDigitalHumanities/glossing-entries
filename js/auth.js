/**
 * @module Auth Auth0 authentication for the Gallery of Glosses data entry interfaces.
 * @author cubap
 *
 * @description Self-contained auth module. Include as `<script src="js/auth.js" type="module">`.
 *
 * Flow:
 *  1. Hide page content on load (adds `auth-loading` class to `<html>`).
 *  2. Check for OAuth callback params (code= in URL). If present, handle the
 *     callback, persist the session, and redirect to the originally requested page.
 *  3. Restore a cached session from localStorage if valid (not expired). This is the
 *     primary and authoritative path — no Auth0 network calls are made.
 *  4. If no valid session and page has `data-require-login` on `<body>`, redirect to
 *     Auth0 with the current URL encoded in the `state` parameter.
 *  5. If no valid session and no `data-require-login`, set an anonymous user.
 *  6. Reveal page content (removes `auth-loading` class).
 *
 * Migrated from cookie-based auth to JWT Bearer token authentication (Issue #308).
 * The idToken is used as the Bearer token for API requests (matching TinyMatt #18 backend).
 */

// Hide page until auth resolves
document.documentElement.classList.add("auth-loading")
const revealPage = () => document.documentElement.classList.remove("auth-loading")

// Storage keys
const SESSION_KEY = "gog_session"
const REFERRER_KEY = "gog_referrer"

// Authentication configuration constants
const __authConfig = await fetch("../properties.json").then(r => r.json()).catch(() => ({}))
const AUTH0_DOMAIN = __authConfig.auth0?.domain ?? "cubap.auth0.com"
const AUTH0_CLIENT_ID = __authConfig.auth0?.clientId ?? "4TztHfVXjvs4H6ByCOXgwxtgA8IEQHsD"
const AUTH0_AUDIENCE = __authConfig.auth0?.audience ?? "https://cubap.auth0.com/api/v2/"
const AUTH0_SCOPE = __authConfig.auth0?.scope ?? "openid profile email nickname picture"
// Always redirect to app root — only one callback URL needed in Auth0.
const REDIRECT_URI = `${location.origin}/`

// Auth0 client — may be null if storage is blocked or SDK fails to load
let auth0Client = null

try {
    // Load Auth0 SPA SDK from local UMD build (CDN was blocked)
    const script = document.createElement('script')
    script.src = 'js/auth0-spa-js.production.js'
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

const persistSession = (result) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        idToken: result.idToken,
        accessToken: result.accessToken,
        payload: result.idTokenPayload
    }))
}

const getSession = () => {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try {
        const session = JSON.parse(raw)
        return session?.payload ? session : null
    } catch { return null }
}

const isLive = (session) => session?.payload?.exp * 1000 > Date.now()
const clearSession = () => { localStorage.removeItem(SESSION_KEY) }
const toUser = (payload, accessToken) => ({ ...payload, authorization: accessToken })

const applyUser = (user) => {
    window.GOG_USER = user
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    document.dispatchEvent(new CustomEvent('gog-authenticated', { detail: window.GOG_USER }))
}

const setAnonymous = () => { window.GOG_USER = { authorization: "none" } }

// --- Login / Logout ---

const logout = () => {
    clearSession()
    delete window.GOG_USER
    document.querySelectorAll('[is="auth-creator"]').forEach(el => el.connectedCallback())
    if (auth0Client) {
        auth0Client.logout({ logoutParams: { returnTo: origin } })
    }
}

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

async function handleLoginRedirect() {
    const hasCode = location.search.includes("code=") || location.hash.includes("code=")
    if (!hasCode) return false
    if (!auth0Client) {
        console.error("Cannot handle login redirect: Auth0 client not initialized")
        return false
    }
    try {
        await auth0Client.handleRedirectCallback()
        const claims = await auth0Client.getUser()
        const token = await auth0Client.getIdTokenClaims()

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

        persistSession({ idToken: token.__raw, accessToken: token.__raw, idTokenPayload: token })
        const user = toUser({ ...token, ...claims }, token.__raw)
        applyUser(user)
        history.replaceState({}, document.title, location.pathname)

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

// --- Role-based access guard (exposed for manage-* pages) ---

window.checkAuth = function (requiredRole, redirectUrl, message) {
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

    if (window.GOG_USER && !hasRequiredRole(window.GOG_USER)) {
        denyAccess()
        return
    }

    if (!window.GOG_USER) {
        const onAuth = (e) => {
            if (!hasRequiredRole(e.detail)) denyAccess()
            document.removeEventListener("gog-authenticated", onAuth)
        }
        document.addEventListener("gog-authenticated", onAuth)
    }
}

// --- AuthButton custom element ---

class AuthButton extends HTMLButtonElement {
    constructor() { super() }

    connectedCallback() {
        if (window.GOG_USER && window.GOG_USER.authorization !== "none") {
            const user = window.GOG_USER
            this.innerText = `Logout ${user.nickname ?? user.email?.split('@')[0] ?? 'User'}`
            this.onclick = logout
        } else {
            this.innerText = 'Login'
            this.onclick = () => login()
        }

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

class AuthCreator extends HTMLInputElement {
    constructor() { super() }

    connectedCallback() {
        if (!window.GOG_USER) return
        this.value = GOG_USER["http://store.rerum.io/agent"] ?? "anonymous"
        this.closest("form")?.setAttribute("deer-creator", GOG_USER["http://store.rerum.io/agent"] ?? "anonymous")
    }
}

customElements.define('auth-creator', AuthCreator, { extends: 'input' })

// --- Self-running auth flow ---

// 1. Handle OAuth callback if present
const handled = await handleLoginRedirect()
if (handled) {
    revealPage()
    // Don't continue — will redirect or reload
}

// 2. Restore cached session
const session = getSession()
if (isLive(session)) {
    const user = toUser(session.payload, session.accessToken)
    applyUser(user)
    revealPage()
} else {
    // 3. No valid session
    const requireLogin = document.body.hasAttribute("data-require-login")
    if (requireLogin) {
        login()
        // Don't reveal — will redirect to Auth0
    } else {
        setAnonymous()
        clearSession()
        revealPage()
    }
}
