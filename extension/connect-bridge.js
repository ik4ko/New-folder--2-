;(function () {
  'use strict'
  // AegisSage connect bridge — injected on aegissage.com pages.
  // Pairs the web page with this extension WITHOUT depending on the extension's
  // ID (unpacked installs get a random ID, so externally_connectable/sendMessage
  // by hardcoded ID can't be relied on). Communication is via window.postMessage
  // between the page and this content script; the content script can always
  // reach its own background regardless of extension ID.

  console.log('[AegisBridge] loaded on', window.location.href)

  function post(type, extra) {
    window.postMessage(Object.assign({ source: 'aegissage-ext', type: type }, extra || {}), '*')
  }

  function manifestVersion() {
    try { return chrome.runtime.getManifest().version } catch (e) { return null }
  }

  // 1. Announce presence so the page can show "extension detected" and enable
  //    the one-click button (covers the bridge-loads-after-page case).
  post('AEGISSAGE_EXT_PRESENT', { version: manifestVersion() })

  // 2. Forward a token to the background service worker, ack back to the page.
  function storeToken(token, replyType) {
    try {
      chrome.runtime.sendMessage({ action: 'STORE_TOKEN', token: token }, function (response) {
        if (chrome.runtime.lastError) {
          console.error('[AegisBridge] STORE_TOKEN failed:', chrome.runtime.lastError.message)
          post(replyType, { success: false, error: chrome.runtime.lastError.message })
          return
        }
        var ok = !response || response.success !== false
        console.log('[AegisBridge] token stored:', ok)
        post(replyType, { success: ok })
      })
    } catch (e) {
      console.error('[AegisBridge] STORE_TOKEN threw:', e)
      post(replyType, { success: false, error: String((e && e.message) || e) })
    }
  }

  // 3. Listen for messages from the page.
  window.addEventListener('message', function (event) {
    if (event.source !== window) return
    if (!event.origin || event.origin.indexOf('aegissage.com') === -1) return
    var data = event.data
    if (!data || data.source === 'aegissage-ext') return // ignore our own posts

    // Page asks "are you there?" (covers the page-loads-after-bridge case).
    if (data.type === 'AEGISSAGE_PING') {
      post('AEGISSAGE_EXT_PRESENT', { version: manifestVersion() })
      return
    }

    if (data.type === 'AEGISSAGE_TOKEN' && data.token) {
      console.log('[AegisBridge] token received via postMessage')
      storeToken(data.token, 'AEGISSAGE_TOKEN_STORED')
      return
    }
  })

  // 4. Last-resort fallback: token left in localStorage by an older page build.
  try {
    var pending = localStorage.getItem('aegissage_pending_token')
    if (pending) {
      localStorage.removeItem('aegissage_pending_token')
      var token = pending
      try { var parsed = JSON.parse(pending); token = parsed.token || pending } catch (e) {}
      console.log('[AegisBridge] forwarding localStorage fallback token')
      storeToken(token, 'AEGISSAGE_TOKEN_STORED')
    }
  } catch (e) {}
})()
