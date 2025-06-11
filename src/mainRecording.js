/**
 * SPDX-FileCopyrightText: 2019 Nextcloud GmbH and Nextcloud contributors
 * SPDX-FileCopyrightText: 2023 Nextcloud GmbH and Nextcloud contributors
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { getRequestToken } from '@nextcloud/auth'
import { generateFilePath } from '@nextcloud/router'
import Vue from 'vue'
import VueRouter from 'vue-router'
import Vuex from 'vuex'
import Recording from './Recording.vue'
import router from './router/router.ts'
import store from './store/index.js'
import pinia from './stores/pinia.ts'
import {
	signalingGetSettingsForRecording,
	signalingJoinCallForRecording,
	signalingKill,
} from './utils/webrtc/index.js'

import '@nextcloud/dialogs/style.css'
// Leaflet icon patch
import 'leaflet/dist/leaflet.css'
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css' // Re-uses images from ~leaflet package
import 'leaflet-defaulticon-compatibility'

// CSP config for webpack dynamic chunk loading
__webpack_nonce__ = btoa(getRequestToken())

// Correct the root of the app for chunk loading
// OC.linkTo matches the apps folders
// OC.generateUrl ensure the index.php (or not)
// We do not want the index.php since we're loading files
__webpack_public_path__ = generateFilePath('spreed', '', 'js/')

Vue.prototype.OC = OC
Vue.prototype.OCA = OCA

Vue.use(Vuex)
Vue.use(VueRouter)

window.store = store

if (!window.OCA.Talk) {
	window.OCA.Talk = {}
}

const instance = new Vue({
	el: '#content',
	store,
	pinia,
	router,
	render: (h) => h(Recording),
})

// make the instance available to global components that might run on the same page
OCA.Talk.instance = instance

// Expose functions to be called by the recording server
OCA.Talk.signalingGetSettingsForRecording = signalingGetSettingsForRecording
OCA.Talk.signalingJoinCallForRecording = signalingJoinCallForRecording
OCA.Talk.signalingKill = signalingKill

export default instance
