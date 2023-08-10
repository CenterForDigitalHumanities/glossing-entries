import { default as DEER } from './deer-config.js'
import { default as UTILS } from './deer-utils.js'
import './layout.js'

// Generalized feedback, maybe shouldn't be here.
document.addEventListener('deer-updated', event => {
    globalFeedbackBlip(event, `Saving ${event.detail.name ? "'" + event.detail.name + "' " : ""}successful!`, true)
})