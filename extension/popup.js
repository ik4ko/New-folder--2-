const AEGISSAGE_URL = 'https://aegissage.com'

const SUPPORTED_PORTALS = {
  'agentportal.humana.com': 'Humana',
  'evolvenxt.com': 'Clover',
  'agent.devoted.com': 'Devoted Health',
  'myhfgroup.org': 'Health First',
  'uhcprovider.com': 'UHC',
  'producer.aetna.com': 'Aetna',
  'portal.cms.gov': 'marx',
}

async function openConnectPage() {
  const existingTabs = await chrome.tabs.query({
    url: ['*://aegissage.com/*', '*://www.aegissage.com/*']
  })
  if (existingTabs.length > 0) {
    await chrome.tabs.update(existingTabs[0].id, {
      active: true,
      url: 'https://www.aegissage.com/extension/connect'
    })
    await chrome.windows.update(existingTabs[0].windowId, { focused: true })
  } else {
    const tab = await chrome.tabs.create({
      url: 'https://www.aegissage.com/extension/connect'
    })
    chrome.storage.session.set({ connectTabId: tab.id })
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = await getStoredToken()

  if (token) {
    showConnected()
    checkCurrentTab()
  } else {
    showDisconnected()
  }

  document.getElementById('connect-btn')
    ?.addEventListener('click', openConnectPage)

  document.getElementById('marx-btn')
    ?.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const url = tab?.url ?? ''
      if (url.includes('portal.cms.gov')) {
        // Already on MARx portal — trigger the batch
        syncCurrentPortal()
      } else {
        // Open the CMS MARx portal; content.js will auto-prompt the batch
        chrome.tabs.create({
          url: 'https://portal.cms.gov/mma/servlet/mmcs.beneficiaries.eligibility.BeneEligibilityDisplayServlet',
        })
      }
    })

  document.getElementById('sync-btn')
    ?.addEventListener('click', syncCurrentPortal)

  document.getElementById('stop-btn')
    ?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'STOP_MARX_BATCH' }, function() {
        var stopBtn = document.getElementById('stop-btn')
        if (stopBtn) stopBtn.style.display = 'none'
        var syncBtn = document.getElementById('sync-btn')
        if (syncBtn) {
          syncBtn.textContent = 'Run MARx Verification'
          syncBtn.disabled = false
          syncBtn.className = 'btn btn-primary'
        }
        var portalStatus = document.getElementById('portal-status')
        if (portalStatus) {
          portalStatus.textContent = 'Verification stopped'
          portalStatus.style.color = '#fbbf24'
        }
      })
    })

  document.getElementById('disconnect-btn')
    ?.addEventListener('click', async () => {
      console.log('[AegisSage] CLEAR_TOKEN called from:', new Error().stack)
      chrome.runtime.sendMessage({ action: 'CLEAR_TOKEN' }, () => {
        showDisconnected()
      })
    })

  document.getElementById('debug-btn')
    ?.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'GET_TOKEN' }, function(r) {
        if (chrome.runtime.lastError) {
          alert('Error reaching service worker:\n' + chrome.runtime.lastError.message)
          return
        }
        alert(
          'Token: ' + (r?.token ? 'EXISTS (' + r.token.length + ' chars)' : 'MISSING') +
          '\nConnected at: ' + (r?.connected_at ? new Date(r.connected_at).toLocaleString() : 'Never')
        )
      })
    })
})

function getStoredToken() {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ action: 'GET_TOKEN' }, response => {
      if (chrome.runtime.lastError) {
        console.error('[AegisSage popup] GET_TOKEN error:', chrome.runtime.lastError.message)
        resolve(null)
        return
      }
      resolve(response?.token ?? null)
    })
  })
}

function showConnected() {
  const status = document.getElementById('status')
  status.className = 'status connected'
  status.innerHTML = '<div class="status-dot"></div><span>Connected to AegisSage</span>'
  document.getElementById('not-connected').style.display = 'none'
  document.getElementById('connected').style.display = 'block'
  loadAccountInfo()
}

function loadAccountInfo() {
  chrome.runtime.sendMessage({ action: 'GET_TOKEN' }, function(r) {
    if (chrome.runtime.lastError || !r) return

    const brokerEl  = document.getElementById('broker-name')
    const agencyEl  = document.getElementById('agency-name')
    const infoCard  = document.getElementById('account-info')

    if (r.broker_name && brokerEl) brokerEl.textContent = r.broker_name
    if (r.agency_name && agencyEl) agencyEl.textContent = r.agency_name

    if ((r.broker_name || r.agency_name) && infoCard) {
      infoCard.style.display = 'block'
      // Add switch-account link if not already present
      if (!document.getElementById('switch-account-link')) {
        const switchLink = document.createElement('a')
        switchLink.id = 'switch-account-link'
        switchLink.href = '#'
        switchLink.style.cssText = 'font-size:11px;color:#6366f1;text-decoration:none;display:block;margin-top:6px;'
        switchLink.textContent = 'Switch account →'
        switchLink.addEventListener('click', function(e) {
          e.preventDefault()
          openConnectPage()
        })
        infoCard.appendChild(switchLink)
      }
    }
  })

  // Member count — how many have MBIs ready for MARx
  chrome.runtime.sendMessage({ action: 'GET_MARX_MEMBERS', forBatch: true }, function(res) {
    if (chrome.runtime.lastError) return
    const count   = res?.members?.length ?? 0
    const countEl = document.getElementById('member-count')
    const infoCard = document.getElementById('account-info')
    if (countEl) {
      countEl.textContent = count > 0
        ? count + ' member' + (count === 1 ? '' : 's') + ' · MARx ready'
        : 'No MBI numbers stored yet'
      countEl.style.color = count > 0 ? '#4ade80' : '#475569'
    }
    if (infoCard) infoCard.style.display = 'block'
  })
}

async function showDisconnected() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const isAegisPage = tab?.url?.includes('aegissage.com') ?? false

  const status = document.getElementById('status')
  status.className = 'status disconnected'
  status.innerHTML = '<div class="status-dot"></div><span>Not connected to AegisSage</span>'

  if (!isAegisPage) {
    // On an external page — don't show the connect form; redirect instead
    document.getElementById('not-connected').style.display = 'none'
    document.getElementById('connected').style.display = 'none'
    if (!document.getElementById('redirect-to-aegis')) {
      const msg = document.createElement('div')
      msg.id = 'redirect-to-aegis'
      msg.style.cssText = 'text-align:center;padding:20px 12px;'
      msg.innerHTML =
        '<p style="margin:0 0 8px;color:#94a3b8;font-size:13px;font-weight:600;">Connect your account first</p>' +
        '<p style="margin:0 0 16px;font-size:11px;color:#64748b;line-height:1.5;">Visit aegissage.com to link your AegisSage account to this extension.</p>' +
        '<button id="open-aegis-btn" style="width:100%;padding:10px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;">Open AegisSage</button>'
      document.body.appendChild(msg)
      document.getElementById('open-aegis-btn')?.addEventListener('click', openConnectPage)
    }
  } else {
    document.getElementById('not-connected').style.display = 'block'
    document.getElementById('connected').style.display = 'none'
  }
}

async function checkCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''

  let portalName = null
  for (const [domain, name] of Object.entries(SUPPORTED_PORTALS)) {
    if (url.includes(domain)) { portalName = name; break }
  }

  const portalStatus = document.getElementById('portal-status')
  const syncBtn = document.getElementById('sync-btn')
  const marxBtn = document.getElementById('marx-btn')
  const hint = document.getElementById('portal-hint')

  if (portalName) {
    if (portalName === 'marx') {
      if (marxBtn) marxBtn.style.display = 'none'
      if (portalStatus) {
        portalStatus.textContent = '✓ On CMS MARx Portal'
        portalStatus.style.color = '#6ee7b7'
      }

      // Check rate limit + member count (read-only, don't set last_marx_batch yet)
      chrome.storage.local.get(['last_marx_batch'], function(stored) {
        var now = Date.now()
        var MINIMUM_INTERVAL = 15 * 60 * 1000 // 15 min (raise to 4h before launch)
        var lastBatch = stored.last_marx_batch

        if (lastBatch && (now - lastBatch) < MINIMUM_INTERVAL) {
          var minsAgo = Math.round((now - lastBatch) / 60000)
          if (portalStatus) {
            portalStatus.textContent = 'Last check ' + minsAgo + 'm ago · limited to every 15m'
            portalStatus.style.color = '#fbbf24'
          }
          if (syncBtn) {
            syncBtn.textContent = 'MARx check cooling down'
            syncBtn.disabled = true
          }
          // Show manual reset link for testing
          var existing = document.getElementById('reset-cooldown')
          if (!existing) {
            var resetLink = document.createElement('a')
            resetLink.id = 'reset-cooldown'
            resetLink.href = '#'
            resetLink.style.cssText = 'font-size:11px;color:#475569;text-decoration:none;display:block;margin-top:6px;'
            resetLink.textContent = 'Reset cooldown (testing only)'
            resetLink.addEventListener('click', function(e) {
              e.preventDefault()
              chrome.runtime.sendMessage({ action: 'CLEAR_MARX_COOLDOWN' }, function() {
                resetLink.remove()
                checkCurrentTab()
              })
            })
            if (portalStatus && portalStatus.parentNode) {
              portalStatus.parentNode.insertBefore(resetLink, portalStatus.nextSibling)
            }
          }
          return
        }

        // Check stored members via direct API (bypass rate-limit gate for count-only)
        chrome.runtime.sendMessage({ action: 'GET_MARX_MEMBERS' }, function(res) {
          if (res?.rateLimited) {
            if (portalStatus) {
              portalStatus.textContent = res.message
              portalStatus.style.color = '#fbbf24'
            }
            if (syncBtn) {
              syncBtn.textContent = 'MARx check cooling down'
              syncBtn.disabled = true
            }
            return
          }

          var count = res?.members?.length ?? 0
          if (count > 0) {
            if (portalStatus) {
              portalStatus.textContent = '✓ On MARx — ' + count + ' client(s) ready'
              portalStatus.style.color = '#6ee7b7'
            }
            if (syncBtn) {
              syncBtn.textContent = 'Run MARx Verification (' + count + ')'
              syncBtn.disabled = false
            }
          } else {
            if (portalStatus) {
              portalStatus.textContent = '✓ On MARx — Add MBI numbers first'
              portalStatus.style.color = '#fbbf24'
            }
            if (syncBtn) {
              syncBtn.textContent = 'Open Book of Business'
              syncBtn.disabled = false
              syncBtn.onclick = function() {
                chrome.tabs.create({ url: 'https://www.aegissage.com/dashboard/book' })
              }
            }
          }
        })
      })

      // Poll for live progress every 2 seconds
      var progressInterval = setInterval(function() {
        chrome.storage.local.get(['marx_progress'], function(result) {
          var prog = result.marx_progress
          if (!prog) return
          // Only show progress from this session (last 30 min)
          if (Date.now() - prog.timestamp > 30 * 60 * 1000) return

          var stopBtn = document.getElementById('stop-btn')
          var marxBtn = document.getElementById('marx-btn')
          if (prog.done) {
            if (portalStatus) {
              portalStatus.textContent = prog.message
              portalStatus.style.color = prog.changesFound > 0 ? '#f87171' : '#6ee7b7'
            }
            if (syncBtn) {
              syncBtn.textContent = 'Run MARx Verification Again'
              syncBtn.disabled = false
            }
            if (stopBtn) stopBtn.style.display = 'none'
            if (marxBtn) marxBtn.style.display = 'none'
            clearInterval(progressInterval)
          } else if (prog.total > 0) {
            var pct = Math.round((prog.current / prog.total) * 100)
            if (portalStatus) {
              portalStatus.textContent = 'Checking ' + prog.memberName + '... (' + prog.current + '/' + prog.total + ')'
            }
            if (syncBtn) {
              syncBtn.textContent = pct + '% complete'
              syncBtn.disabled = true
            }
            if (stopBtn) stopBtn.style.display = 'block'
            if (marxBtn) marxBtn.style.display = 'none'
          }
        })
      }, 2000)

      window.addEventListener('unload', function() {
        clearInterval(progressInterval)
      })
    } else {
      if (marxBtn) marxBtn.style.display = 'none'
      if (portalStatus) {
        portalStatus.textContent = `✓ On ${portalName} — ready to sync`
        portalStatus.style.color = '#4ade80'
      }
    }
  } else {
    if (portalStatus) {
      portalStatus.textContent = 'Not on a carrier or MARx portal'
      portalStatus.style.color = '#94a3b8'
    }
    if (hint) hint.style.display = 'block'
    if (marxBtn) marxBtn.style.display = 'none'
    if (syncBtn) {
      syncBtn.disabled = false
      syncBtn.textContent = 'Open MARx Portal'
      syncBtn.className = 'btn btn-primary'
      syncBtn.onclick = function() {
        chrome.tabs.create({
          url: 'https://portal.cms.gov/mma/servlet/mmcs.beneficiaries.eligibility.BeneEligibilityDisplayServlet'
        })
      }
    }
  }
}

// Listen for connection updates from background (e.g. after auto-close of connect tab)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'CONNECTION_UPDATED') {
    showConnected()
  }
})

async function syncCurrentPortal() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url || !tab?.id) return

  const btn = document.getElementById('sync-btn')
  btn.textContent = 'Syncing...'
  btn.disabled = true

  chrome.tabs.sendMessage(tab.id, { action: 'SYNC_ROSTER' }, response => {
    if (chrome.runtime.lastError) {
      btn.textContent = 'Error — reload portal page'
      btn.className = 'btn btn-error'
      btn.disabled = false
      return
    }

    if (response?.marxBatchStarted) {
      btn.textContent = 'MARx verification running...'
      btn.className = 'btn btn-success'
      btn.disabled = true
    } else if (response?.success) {
      btn.textContent = `Synced ${response.rows} members`
      btn.className = 'btn btn-success'
    } else {
      btn.textContent = response?.error ?? 'Sync failed — try again'
      btn.className = 'btn btn-error'
      btn.disabled = false
    }
  })
}

