;(function() {
  console.log('[Bridge] Loaded on:', window.location.href)

  // Primary fallback: page sets this in localStorage when chrome.runtime.sendMessage
  // fails (e.g. extension ID mismatch). Bridge picks it up immediately on inject.
  var pendingToken = localStorage.getItem('aegissage_pending_token')
  if (pendingToken) {
    console.log('[Bridge] Found pending token in localStorage, forwarding to background...')
    localStorage.removeItem('aegissage_pending_token')
    chrome.runtime.sendMessage(
      { action: 'STORE_TOKEN', token: pendingToken },
      function(response) {
        if (chrome.runtime.lastError) {
          console.error('[Bridge] sendMessage error (localStorage path):', chrome.runtime.lastError.message)
          return
        }
        console.log('[Bridge] Token stored from localStorage fallback:', response)
      }
    )
  }

  // Secondary fallback: listen for postMessage from the page
  window.addEventListener('message', function(event) {
    console.log('[Bridge] postMessage received | origin:', event.origin, '| type:', event.data && event.data.type)

    if (!event.origin.includes('aegissage.com')) return
    if (!event.data || event.data.type !== 'AEGISSAGE_TOKEN') return

    var token = event.data.token
    if (!token) return

    console.log('[Bridge] Token received via postMessage, forwarding to background...')
    chrome.runtime.sendMessage(
      { action: 'STORE_TOKEN', token: token },
      function(response) {
        if (chrome.runtime.lastError) {
          console.error('[Bridge] sendMessage error (postMessage path):', chrome.runtime.lastError.message)
          window.postMessage({ type: 'AEGISSAGE_TOKEN_STORED', success: false }, '*')
          return
        }
        console.log('[Bridge] Token stored via postMessage path:', response)
        window.postMessage({ type: 'AEGISSAGE_TOKEN_STORED', success: true }, '*')
      }
    )
  })
})()
