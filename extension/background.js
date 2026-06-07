const API_BASE = 'https://www.aegissage.com'

// ── Startup version / kill-switch check ──────────────────────────────────────
// If the server revokes a key or the extension is retired, this returns
// valid:false. The popup reads the needs_update flag and shows a warning.

chrome.runtime.onInstalled.addListener(checkVersion)
chrome.runtime.onStartup.addListener(checkVersion)

async function checkVersion() {
  const token = await getStoredToken()
  if (!token) return

  try {
    const res = await fetch(`${API_BASE}/api/extension/verify`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = res.ok ? await res.json().catch(() => ({})) : {}
    const valid = res.ok && data.valid !== false

    await chrome.storage.local.set({ needs_update: !valid })

    if (!valid) {
      chrome.action.setBadgeText({ text: '!' })
      chrome.action.setBadgeBackgroundColor({ color: '#ef4444' })
    } else {
      chrome.action.setBadgeText({ text: '' })
    }
  } catch {
    // Network failure — don't lock the user out
  }
}

// ── Storage helpers ───────────────────────────────────────────────────────────

function getStoredToken() {
  return new Promise(resolve => {
    chrome.storage.local.get(['token'], r => resolve(r.token ?? null))
  })
}

// ── Keepalive port handler ────────────────────────────────────────────────────
// Content scripts call chrome.runtime.connect({ name: 'keepalive' }) to wake
// the service worker before sending a message. Disconnect immediately.

chrome.runtime.onConnect.addListener(port => {
  if (port.name === 'keepalive') port.disconnect()
})

// ── Message dispatcher ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch(err => sendResponse({ error: err.message }))
  return true // keep channel open for async response
})

async function handleMessage(message) {
  switch (message.action) {

    // ── Token management ──────────────────────────────────────────────────────

    case 'GET_TOKEN': {
      const data = await chrome.storage.local.get(['token', 'connected_at', 'needs_update', 'agency_name', 'broker_name', 'broker_id', 'agency_id'])
      return {
        token: data.token ?? null,
        connected_at: data.connected_at ?? null,
        needs_update: data.needs_update ?? false,
        agency_name: data.agency_name ?? null,
        broker_name: data.broker_name ?? null,
        broker_id: data.broker_id ?? null,
        agency_id: data.agency_id ?? null,
      }
    }

    case 'STORE_TOKEN': {
      if (!message.token) return { success: false, error: 'No token provided' }

      // Defensive token extraction — handle all mis-wrapped patterns:
      //   Pattern A: message.token = { token: "plain" }    (object, not string)
      //   Pattern B: message.token = '{"token":"plain"}'   (JSON-encoded whole payload)
      //   Pattern C: message.token = "plain"               (correct — no change needed)
      let plainToken = message.token
      if (typeof plainToken === 'object' && plainToken !== null) {
        plainToken = String(plainToken.token ?? '')
      } else if (typeof plainToken === 'string' && plainToken.trimStart().startsWith('{')) {
        try {
          const parsed = JSON.parse(plainToken)
          if (typeof parsed?.token === 'string') plainToken = parsed.token
        } catch {}
      }

      if (!plainToken || plainToken.length < 32) {
        return { success: false, error: 'Invalid token format — must be a plain API key string' }
      }

      console.log('[background] STORE_TOKEN: plain token length:', plainToken.length, '| prefix:', plainToken.slice(0, 8))

      // Verify FIRST — before any storage write
      let verifyData = null
      try {
        const res = await fetch(`${API_BASE}/api/extension/verify`, {
          headers: { 'Authorization': `Bearer ${plainToken}` },
        })
        verifyData = res.ok ? await res.json().catch(() => null) : null
      } catch (e) {
        console.error('[STORE_TOKEN] verify fetch failed:', e)
        return { success: false, error: 'Network error during verification — check connection and try again' }
      }

      if (!verifyData?.valid) {
        console.warn('[STORE_TOKEN] verify rejected:', verifyData)
        return { success: false, error: verifyData?.error ?? 'Token verification failed' }
      }

      // ONE single storage write — token + all identity fields together
      await chrome.storage.local.clear()
      await chrome.storage.local.set({
        token:        plainToken,
        broker_id:    verifyData.broker_id   ?? null,
        agency_id:    verifyData.agency_id   ?? null,
        broker_name:  verifyData.broker_name ?? message.broker_name ?? null,
        agency_name:  verifyData.agency_name ?? message.agency_name ?? null,
        needs_update: false,
        connected_at: Date.now(),
      })

      const saved = await chrome.storage.local.get(['token', 'broker_id', 'agency_id', 'agency_name'])
      console.log('[STORE_TOKEN] Final saved state:', {
        tokenOk:     typeof saved.token === 'string' && saved.token.length > 32,
        broker_id:   saved.broker_id,
        agency_id:   saved.agency_id,
        agency_name: saved.agency_name,
      })

      chrome.action.setBadgeText({ text: '' })

      // Close the connect tab if it was opened from the popup
      chrome.storage.session.get(['connectTabId'], async (data) => {
        if (data.connectTabId) {
          try { await chrome.tabs.remove(data.connectTabId) } catch(e) {}
          chrome.storage.session.remove('connectTabId')
        }
      })

      // Redirect any open aegissage tab to the dashboard
      const [aegisTabs1, aegisTabs2] = await Promise.all([
        chrome.tabs.query({ url: '*://aegissage.com/*' }),
        chrome.tabs.query({ url: '*://www.aegissage.com/*' }),
      ])
      const aegisTabs = [...aegisTabs1, ...aegisTabs2]
      if (aegisTabs.length > 0) {
        chrome.tabs.update(aegisTabs[0].id, {
          url: 'https://www.aegissage.com/dashboard',
          active: true,
        })
      }

      // Notify popup if it's open
      chrome.runtime.sendMessage({
        action: 'CONNECTION_UPDATED',
        broker_name: verifyData.broker_name,
        agency_name: verifyData.agency_name,
      }).catch(() => {}) // popup may not be open — ignore

      return { success: true, broker_name: verifyData.broker_name, agency_name: verifyData.agency_name }
    }

    case 'CLEAR_TOKEN': {
      await chrome.storage.local.remove(['token', 'connected_at', 'needs_update', 'agency_name', 'broker_name', 'broker_id', 'agency_id'])
      chrome.action.setBadgeText({ text: '' })
      return { success: true }
    }

    // ── Roster sync ───────────────────────────────────────────────────────────

    case 'SYNC_TO_SERVER': {
      const token = await getStoredToken()
      if (!token) return { success: false, error: 'Not connected — open the extension and click Connect Account' }

      const res = await fetch(`${API_BASE}/api/extension/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ carrier: message.carrier, rows: message.rows }),
      })

      if (res.status === 401) return { success: false, error: 'Session expired — reconnect your account' }
      if (!res.ok) return { success: false, error: `Server error (${res.status}) — try again` }

      const data = await res.json()
      return { success: true, rows: data.total ?? message.rows?.length ?? 0 }
    }

    // ── AI fallback extraction ────────────────────────────────────────────────

    case 'AI_EXTRACT': {
      const token = await getStoredToken()
      if (!token) return { rows: [], total_found: 0, confidence: 'none' }

      const res = await fetch(`${API_BASE}/api/extension/ai-extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          carrier: message.carrier,
          html: message.html,
          url: message.url,
        }),
      })

      if (!res.ok) return { rows: [], total_found: 0, confidence: 'none' }
      return await res.json()
    }

    // ── Sync history ──────────────────────────────────────────────────────────

    case 'GET_SYNC_HISTORY': {
      const token = await getStoredToken()
      if (!token) return { error: 'Not authenticated' }

      const res = await fetch(`${API_BASE}/api/extension/sync-history`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (res.status === 401) return { error: 'Session expired' }
      if (!res.ok) return { error: `Server error (${res.status})` }
      return await res.json()
    }

    // ── MARx members list ─────────────────────────────────────────────────────

    case 'GET_MARX_MEMBERS': {
      const token = await getStoredToken()
      if (!token) return { members: [], error: 'Not authenticated' }

      // Local rate-limit gate (15 min) — only enforced for popup display, not batch start
      if (!message.forBatch) {
        const stored = await chrome.storage.local.get(['last_marx_batch'])
        const MINIMUM_INTERVAL = 15 * 60 * 1000
        if (stored.last_marx_batch && (Date.now() - stored.last_marx_batch) < MINIMUM_INTERVAL) {
          const minsAgo = Math.round((Date.now() - stored.last_marx_batch) / 60000)
          return {
            rateLimited: true,
            message: `MARx check limited to every 15 min (last: ${minsAgo}m ago)`,
            members: [],
          }
        }
      }

      const res = await fetch(`${API_BASE}/api/marx/members`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (!res.ok) return { members: [] }
      const result = await res.json()
      // Reset stale batch position so next run always starts from index 0
      await chrome.storage.local.remove(['marx_batch_index', 'marx_pending_member'])
      return result
    }

    // ── MARx progress tracking ────────────────────────────────────────────────

    case 'MARX_PROGRESS': {
      // PHI-SAFE: memberName is intentionally excluded — full names are HIPAA identifiers
      // and must not be persisted to chrome.storage.local. The popup displays the index
      // count (current/total) instead.
      const progress = {
        current: message.current,
        total: message.total,
        changesFound: message.changesFound,
        done: message.done,
        message: message.message ?? null,
        timestamp: Date.now(),
      }
      await chrome.storage.local.set({ marx_progress: progress })
      if (message.done) {
        await chrome.storage.local.set({ last_marx_batch: Date.now() })
        // Reload any open AegisSage dashboard tabs so alerts appear immediately
        try {
          const [tabs1, tabs2] = await Promise.all([
            chrome.tabs.query({ url: '*://aegissage.com/*' }),
            chrome.tabs.query({ url: '*://www.aegissage.com/*' }),
          ])
          for (const tab of [...tabs1, ...tabs2]) {
            if (tab.id) chrome.tabs.reload(tab.id)
          }
        } catch {}
      }
      return { success: true }
    }

    // ── MARx single result → server ───────────────────────────────────────────

    case 'PROCESS_MARX_RESULT': {
      const token = await getStoredToken()
      if (!token) return { changed: false }

      const res = await fetch(`${API_BASE}/api/marx/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: message.memberId,
          memberName: message.memberName,
          mbi: message.mbi ?? null,
          // New structured result classification
          marxResult: message.marxResult ?? null,
          detectedPlanCode: message.detectedPlanCode ?? null,
          detectedCarrier: message.detectedCarrier ?? null,
          detectedFuturePlan: message.detectedFuturePlan ?? null,
          detectedFutureStart: message.detectedFutureStart ?? null,
          // Legacy fields for backward compat
          planCode: message.planCode,
          planName: message.planName,
          effectiveDate: message.effectiveDate,
          endDate: message.endDate,
          status: message.status,
          allEnrollments: message.allEnrollments,
          hasActiveMA: message.hasActiveMA,
          onlyPartD: message.onlyPartD,
          noResult: message.noResult,
        }),
      })

      if (!res.ok) return { changed: false }
      return await res.json().catch(() => ({ changed: false }))
    }

    // ── MARx batch control ────────────────────────────────────────────────────

    case 'STOP_MARX_BATCH': {
      await chrome.storage.local.set({ marx_batch_stopped: true })
      return { success: true }
    }

    case 'CLEAR_MARX_COOLDOWN': {
      await chrome.storage.local.remove(['last_marx_batch'])
      return { success: true }
    }

    default:
      return { error: `Unknown action: ${message.action}` }
  }
}
