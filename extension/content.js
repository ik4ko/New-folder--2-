// Injected into carrier portal pages.
// Scrapes the active roster directly from the DOM — no file download needed.
// No bot detection risk; runs inside the broker's real authenticated session.

const AEGISSAGE_URL = 'https://aegissage.com'

const CARRIER_DOMAINS = {
  'agentportal.humana.com': 'humana',
  'evolvenxt.com': 'clover',
  'uhcprovider.com': 'uhc',
  'producer.aetna.com': 'aetna',
  'agent.devoted.com': 'devoted',
  'myhfgroup.org': 'healthfirst',
}

// ── Sync telemetry error codes ────────────────────────────────────────────────
// Written to chrome.storage.local under 'aegis_sync_status'.
// popup.js polls this key every 750ms during an active sync.

const SYNC_ERROR_CODES = {
  // Active states (shown as live status messages in the popup)
  IDLE:                'IDLE',
  CONNECTING:          'CONNECTING',
  RETRYING:            'RETRYING',
  EXTRACTING:          'EXTRACTING',
  UPLOADING:           'UPLOADING',
  // Terminal success
  SUCCESS:             'SUCCESS',
  // Terminal error codes — each maps to a broker-facing message below
  PORTAL_TIMEOUT:      'PORTAL_TIMEOUT',
  SELECTOR_MISMATCH:   'SELECTOR_MISMATCH',
  NOT_CONNECTED:       'NOT_CONNECTED',
  NO_ROSTER_PAGE:      'NO_ROSTER_PAGE',
  NETWORK_ERROR:       'NETWORK_ERROR',
  CARRIER_UNSUPPORTED: 'CARRIER_UNSUPPORTED',
}

// Human-readable messages for each terminal error code.
// These are shown directly in the popup UI — keep them actionable.
const SYNC_ERROR_MESSAGES = {
  PORTAL_TIMEOUT:      'Portal timed out. Please refresh the carrier page and try again.',
  SELECTOR_MISMATCH:   'No member rows detected. Navigate to Active Policies or Member Roster first.',
  NOT_CONNECTED:       'Not connected to AegisSage. Open the extension and click Connect Account.',
  NO_ROSTER_PAGE:      'No roster data found. Navigate to the member list page and try again.',
  NETWORK_ERROR:       'Upload failed. Check your internet connection and try again.',
  CARRIER_UNSUPPORTED: 'This portal is not yet supported. Contact support@aegissage.com.',
}

/**
 * emitSyncStatus — write telemetry to chrome.storage.local.
 * Content scripts have direct storage access — no background routing needed.
 *
 * @param {string} code       - One of SYNC_ERROR_CODES
 * @param {string} message    - Human-readable status text for the popup
 * @param {number|null} attempt  - Current retry attempt (1-based), or null
 * @param {number|null} total    - Total retry attempts, or null
 */
function emitSyncStatus(code, message, attempt = null, total = null) {
  const isTerminal = ['SUCCESS', 'ERROR',
    'PORTAL_TIMEOUT', 'SELECTOR_MISMATCH', 'NOT_CONNECTED',
    'NO_ROSTER_PAGE', 'NETWORK_ERROR', 'CARRIER_UNSUPPORTED'].includes(code)
  try {
    chrome.storage.local.set({
      aegis_sync_status: {
        code,
        message,
        attempt,
        total,
        active:    !isTerminal,
        timestamp: Date.now(),
      }
    })
  } catch (e) {
    // Storage write failures must never crash the sync loop
  }
}

/**
 * waitForElementWithRetry — DOM selector with retry and live popup telemetry.
 *
 * Wraps waitForElement() with up to `maxAttempts` tries. Before each retry
 * it emits a RETRYING status so the popup UI updates from a frozen spinner
 * to an informative "Attempt N/3" message.
 *
 * @param {string} selector           - CSS selector to wait for
 * @param {object} opts
 * @param {number} opts.maxAttempts   - Total attempts before throwing (default 3)
 * @param {number} opts.delayBetween  - ms to wait between attempts (default 1500)
 * @param {number} opts.timeout       - ms per attempt before giving up (default 8000)
 * @param {string} opts.context       - Human-readable label for error messages
 * @returns {Promise<Element>}
 * @throws Error with .code = 'PORTAL_TIMEOUT' after all retries exhausted
 */
async function waitForElementWithRetry(selector, {
  maxAttempts  = 3,
  delayBetween = 1500,
  timeout      = 8000,
  context      = 'member data',
} = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Emit status before each attempt so the popup is never frozen
    if (attempt === 1) {
      emitSyncStatus(SYNC_ERROR_CODES.CONNECTING, 'Connecting to portal...')
    } else {
      emitSyncStatus(
        SYNC_ERROR_CODES.RETRYING,
        `Carrier responding slowly… Retrying connection (Attempt ${attempt}/${maxAttempts})`,
        attempt,
        maxAttempts
      )
    }

    try {
      const el = await waitForElement(selector, timeout)
      // Element found — emit EXTRACTING and return
      emitSyncStatus(SYNC_ERROR_CODES.EXTRACTING, 'Extracting member row data…')
      return el
    } catch (_timeoutErr) {
      if (attempt === maxAttempts) {
        // All retries exhausted — throw a typed error
        const err = new Error(
          `${SYNC_ERROR_MESSAGES.PORTAL_TIMEOUT} (selector: "${context}", ${maxAttempts} attempts)`
        )
        err.code = SYNC_ERROR_CODES.PORTAL_TIMEOUT
        throw err
      }
      // Wait before the next attempt
      await new Promise(r => setTimeout(r, delayBetween))
    }
  }
}

// ── Service worker messaging with retry ───────────────────────────────────────
// Chrome suspends the service worker after ~30s of inactivity.
// Sending a message to a suspended worker throws "Receiving end does not exist".
// This wrapper wakes the worker (via a brief port.connect()) and retries.

async function sendMessageWithRetry(message, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(response)
          }
        })
      })
    } catch (err) {
      console.log('[AegisSage] Retry', i + 1, '- waking service worker...')
      try {
        const port = chrome.runtime.connect({ name: 'keepalive' })
        port.disconnect()
      } catch {}
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error('Service worker unreachable after retries')
}

// ── Entry point ───────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'SYNC_ROSTER') {
    handleSync().then(sendResponse).catch(err =>
      sendResponse({ success: false, error: err.message })
    )
    return true
  }
})

async function handleSync() {
  // Clear stale sync status from any prior run
  emitSyncStatus(SYNC_ERROR_CODES.CONNECTING, 'Initializing sync…')

  // Nuke all sessionStorage so no stale batch state can bleed into this run
  sessionStorage.clear()

  try {
    const carrier = detectCarrier()
    if (!carrier) {
      const msg = SYNC_ERROR_MESSAGES.CARRIER_UNSUPPORTED
      emitSyncStatus(SYNC_ERROR_CODES.CARRIER_UNSUPPORTED, msg)
      return { success: false, error: msg, code: SYNC_ERROR_CODES.CARRIER_UNSUPPORTED }
    }

    const token = await getToken()
    if (!token) {
      const msg = SYNC_ERROR_MESSAGES.NOT_CONNECTED
      emitSyncStatus(SYNC_ERROR_CODES.NOT_CONNECTED, msg)
      return { success: false, error: msg, code: SYNC_ERROR_CODES.NOT_CONNECTED }
    }

    // MARx is different — run batch MBI lookup instead of roster scrape
    if (carrier === 'marx') {
      emitSyncStatus(SYNC_ERROR_CODES.CONNECTING, 'Connecting to CMS MARx Portal…')
      clearBatchState()
      await chrome.storage.local.remove(['marx_batch_index', 'marx_pending_member', 'marx_progress', 'marx_batch_stopped'])
      await runMarxBatchLookup()
      return { success: true, marxBatchStarted: true }
    }

    emitSyncStatus(SYNC_ERROR_CODES.CONNECTING, 'Connecting to portal…')
    const rows = await scrapeWithAIFallback(carrier)

    if (rows.length === 0) {
      const msg = SYNC_ERROR_MESSAGES.NO_ROSTER_PAGE
      emitSyncStatus(SYNC_ERROR_CODES.NO_ROSTER_PAGE, msg)
      return { success: false, error: msg, code: SYNC_ERROR_CODES.NO_ROSTER_PAGE }
    }

    emitSyncStatus(SYNC_ERROR_CODES.UPLOADING, `Uploading ${rows.length} member records to AegisSage…`)

    // Route through background service worker — content scripts run on carrier
    // domains and hit CORS; background scripts bypass it entirely.
    const result = await sendMessageWithRetry({ action: 'SYNC_TO_SERVER', carrier, rows })

    if (result?.success) {
      emitSyncStatus(SYNC_ERROR_CODES.SUCCESS, `Synced ${result.rows ?? rows.length} members successfully`)
    } else {
      const msg = result?.error ?? SYNC_ERROR_MESSAGES.NETWORK_ERROR
      emitSyncStatus(SYNC_ERROR_CODES.NETWORK_ERROR, msg)
    }

    return result

  } catch (err) {
    // Intercept typed errors from waitForElementWithRetry and map to clean error codes
    const code    = err.code ?? SYNC_ERROR_CODES.PORTAL_TIMEOUT
    const message = SYNC_ERROR_MESSAGES[code] ?? err.message ?? 'An unexpected error occurred. Please try again.'

    emitSyncStatus(code, message)

    return {
      success: false,
      error:   message,
      code,
    }
  }
}

// ── Part 1: DOM scraping with pagination ─────────────────────────────────────

async function scrapeWithAIFallback(carrier) {
  try {
    const rows = await scrapeAllPages(carrier)
    if (rows.length > 0) {
      console.log(`[AegisSage] CSS scrape succeeded: ${rows.length} rows`)
      return rows
    }
    console.log('[AegisSage] CSS scrape returned 0 rows — trying AI fallback')
  } catch (err) {
    console.log('[AegisSage] CSS scrape failed, trying AI fallback:', err.message)
  }

  // Part 2: AI fallback
  return scrapeWithAI(carrier)
}

async function scrapeAllPages(carrier) {
  const allRows = []
  let pageNum = 1

  while (true) {
    const rawResult = carrier === 'humana'
      ? await scrapeHumanaRoster()
      : carrier === 'clover'
        ? await scrapeCloverRoster()
        : carrier === 'devoted'
          ? await scrapeDevotedRoster()
          : carrier === 'healthfirst'
            ? await scrapeHealthFirstRoster()
            : await scrapeGenericRoster()

    // devoted/healthfirst return array or null; normalize to standard shape
    const result = (Array.isArray(rawResult) || rawResult === null)
      ? { rows: rawResult ?? [], totalCount: (rawResult ?? []).length, pageCount: (rawResult ?? []).length, hasMorePages: false }
      : rawResult

    allRows.push(...result.rows)
    console.log(`[AegisSage] Page ${pageNum}: ${result.rows.length} rows (total so far: ${allRows.length}/${result.totalCount})`)

    const hasMore = result.hasMorePages && allRows.length < result.totalCount

    if (!hasMore) break

    const nextBtn = document.querySelector(
      '.k-pager-nav[title="Go to the next page"]:not(.k-disabled), ' +
      'button[aria-label="Next page"]:not([disabled]), ' +
      'a[aria-label="Next"]:not(.disabled), ' +
      '.pagination .next:not(.disabled), ' +
      'a.next:not(.disabled), ' +
      '[class*="pagination"] a[rel="next"]:not(.disabled)'
    )

    if (!nextBtn) break

    nextBtn.click()
    await new Promise(r => setTimeout(r, 2000))
    await waitForElement('.k-grid-content tr, table tbody tr', 10000).catch(() => {})
    pageNum++

    if (pageNum > 50) break // safety cap
  }

  return allRows
}

async function scrapeHumanaRoster() {
  // Humana Vantage uses Kendo UI grid (.k-grid-*)
  await waitForElementWithRetry('.k-grid-content tr, table tbody tr', {
    timeout: 12000, context: 'Humana roster table',
  })

  const headers = []
  document.querySelectorAll(
    '.k-grid-header th, .k-grid-header [role="columnheader"], thead th, [role="columnheader"]'
  ).forEach(th => {
    headers.push(th.textContent?.trim() ?? '')
  })

  const rows = []
  document.querySelectorAll(
    '.k-grid-content tbody tr, .k-virtual-content tbody tr, table tbody tr'
  ).forEach(row => {
    const cells = row.querySelectorAll('td')
    if (cells.length < 2) return

    const rowData = {}
    cells.forEach((cell, i) => {
      const key = headers[i] || `col_${i}`
      rowData[key] = cell.textContent?.trim() ?? ''
    })

    if (Object.values(rowData).some(v => String(v).length > 2)) {
      rows.push(rowData)
    }
  })

  // Check Kendo pager for total count
  const pagerText = document.querySelector(
    '.k-pager-info, [class*="pager-info"], .k-pager-sizes'
  )?.textContent ?? ''
  const totalMatch = pagerText.match(/of\s+([\d,]+)/i)
  const totalCount = totalMatch
    ? parseInt(totalMatch[1].replace(/,/g, ''))
    : rows.length

  return {
    rows,
    totalCount,
    pageCount: rows.length,
    hasMorePages: totalCount > rows.length,
  }
}

async function scrapeCloverRoster() {
  // Clover / EvolveNXT portal — member_search.htm uses a standard HTML table
  await waitForElementWithRetry('table tbody tr, .member-results tbody tr, [id*="searchResults"] tr', {
    timeout: 12000, context: 'Clover member search results',
  })

  // Prefer the search-results table; fall back to the largest table on the page
  let table = document.querySelector(
    '#memberSearchResults table, .member-results table, [id*="searchResults"] table'
  )
  if (!table) {
    const tables = Array.from(document.querySelectorAll('table'))
    table = tables.reduce((best, t) => {
      const count = t.querySelectorAll('tbody tr').length
      return count > ((best && best._count) || 0)
        ? Object.assign(t, { _count: count })
        : best
    }, null)
  }

  if (!table) return { rows: [], totalCount: 0, pageCount: 0, hasMorePages: false }

  const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th'))
    .map(h => h.textContent?.trim() ?? '')

  const rows = []
  table.querySelectorAll('tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td')
    if (cells.length < 2) return

    const rowData = {}
    cells.forEach((cell, i) => {
      const key = headers[i] || `col_${i}`
      rowData[key] = cell.textContent?.trim() ?? ''
    })

    if (Object.values(rowData).some(v => String(v).length > 2)) rows.push(rowData)
  })

  // Clover portal pager: "Showing X-Y of Z members"
  const pagerText = document.querySelector(
    '[class*="pager"], [class*="pagination"], [class*="showing"], .results-count'
  )?.textContent ?? ''
  const totalMatch = pagerText.match(/of\s+([\d,]+)/i)
  const totalCount = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : rows.length

  // Log unique status values for diagnostic purposes
  const statusKeys = ['Status', 'status', 'Policy Status', 'Member Status', 'Enrollment Status']
  const uniqueStatuses = [...new Set(rows.map(r => {
    for (const k of statusKeys) if (r[k]) return r[k]
    return ''
  }))].filter(Boolean)
  console.log('[Clover] Row count:', rows.length, '| Total:', totalCount)
  console.log('[Clover] Unique status values:', JSON.stringify(uniqueStatuses))
  if (rows[0]) console.log('[Clover] Row0 keys:', JSON.stringify(Object.keys(rows[0])))

  // Next page: standard Clover pagination link
  const hasMorePages = totalCount > rows.length

  return { rows, totalCount, pageCount: rows.length, hasMorePages }
}

async function scrapeGenericRoster() {
  // Best-effort wait — generic scraper has no guaranteed selector so we don't
  // throw on timeout, we just proceed with whatever the DOM has at that point.
  await waitForElementWithRetry('table tbody tr, [role="row"]', {
    timeout: 8000, context: 'generic portal table',
  }).catch(() => {})

  const tables = Array.from(document.querySelectorAll('table, [role="grid"], [role="table"]'))
  if (!tables.length) return { rows: [], totalCount: 0, pageCount: 0, hasMorePages: false }

  const table = tables.reduce((best, t) => {
    const count = t.querySelectorAll('tbody tr, [role="row"]').length
    return count > ((best)._count ?? 0) ? Object.assign(t, { _count: count }) : best
  })

  const headers = Array.from(
    table.querySelectorAll('thead th, [role="columnheader"]')
  ).map(h => h.textContent?.trim().toLowerCase() ?? '')

  const rows = []
  table.querySelectorAll('tbody tr, [role="row"]').forEach(row => {
    const cells = row.querySelectorAll('td, [role="cell"], [role="gridcell"]')
    if (cells.length < 2) return

    const rowData = {}
    cells.forEach((cell, i) => {
      const key = headers[i] || `col_${i}`
      rowData[key] = cell.textContent?.trim() ?? ''
    })

    if (Object.values(rowData).some(v => String(v).length > 2)) rows.push(rowData)
  })

  const pagerText = document.querySelector(
    '[class*="pager"], [class*="pagination"], .k-pager-info'
  )?.textContent ?? ''
  const totalMatch = pagerText.match(/of\s+([\d,]+)/i)
  const totalCount = totalMatch ? parseInt(totalMatch[1].replace(/,/g, '')) : rows.length

  return { rows, totalCount, pageCount: rows.length, hasMorePages: totalCount > rows.length }
}

// ── Devoted Health scraper (React SPA) ────────────────────────────────────────

async function scrapeDevotedRoster() {
  // Devoted Health is a React SPA — content renders asynchronously after load.
  // Wait for any recognizable member data container before scraping.
  await waitForElementWithRetry(
    'table tbody tr, [role="row"], [data-testid="member-row"], [class*="contact-row"]',
    { maxAttempts: 3, timeout: 7000, delayBetween: 2000, context: 'Devoted Health member list' }
  ).catch(() => {
    // If still not found after retries, proceed — scrapeGenericTable/scrapeDivLayout
    // do their own presence checks and return null gracefully.
  })

  let result = scrapeGenericTable('devoted')
  if (result && result.length > 0) return result

  result = scrapeDivLayout('devoted')
  if (result && result.length > 0) return result

  return null
}

// ── Health First scraper (React SPA) ──────────────────────────────────────────

async function scrapeHealthFirstRoster() {
  // HealthFirst is a React SPA on myhfgroup.org — typically needs 4–8s to render.
  // Use waitForElementWithRetry so slow portal responses show "Retrying" in the popup
  // instead of a frozen spinner.
  await waitForElementWithRetry(
    'table tbody tr, [class*="member"], [class*="row"]:not([class*="header"])',
    { maxAttempts: 3, timeout: 8000, delayBetween: 2500, context: 'HealthFirst member list' }
  ).catch(() => {
    // Not found after retries — proceed anyway; scraper functions handle empty DOM gracefully.
  })

  let result = scrapeGenericTable('healthfirst')

  if (!result || result.length === 0) {
    result = scrapeDivLayout('healthfirst')
  }

  return result
}

// Synchronous generic table scrape — returns rows array or null
function scrapeGenericTable(carrier) {
  const rows = []
  const headers = []
  document.querySelectorAll('table thead th, thead td, th').forEach(th => {
    headers.push(th.textContent?.trim() ?? '')
  })
  // PHI-SAFE: log column count only — never log header names or row contents
  console.log('[' + carrier + '] Table header count:', headers.length)
  document.querySelectorAll('table tbody tr').forEach((row) => {
    const cells = row.querySelectorAll('td')
    if (cells.length < 2) return
    const rowData = {}
    cells.forEach((cell, i) => {
      const key = headers[i] || 'col_' + i
      rowData[key] = cell.textContent?.trim() ?? ''
    })
    if (Object.values(rowData).some(v => String(v).length > 1)) {
      rows.push(rowData)
    }
  })
  console.log('[' + carrier + '] scrapeGenericTable rows found:', rows.length)
  return rows.length > 0 ? rows : null
}

// Div-based layout scraper for React apps that don't use <table>
function scrapeDivLayout(carrier) {
  const rows = []
  const headers = []
  const headerEl = document.querySelector(
    '[class*="header-row"], [class*="HeaderRow"], ' +
    '[role="rowgroup"]:first-child, ' +
    '[class*="column-header"], [class*="ColumnHeader"]'
  )
  if (headerEl) {
    headerEl.querySelectorAll(
      '[role="columnheader"], [class*="header-cell"], [class*="HeaderCell"], th, div'
    ).forEach(h => {
      const t = h.textContent?.trim()
      if (t && t.length < 60) headers.push(t)
    })
  }
  // PHI-SAFE: log column count only
  console.log('[' + carrier + '] Div header count:', headers.length)

  document.querySelectorAll(
    '[role="row"]:not(:first-child), ' +
    '[class*="data-row"], [class*="DataRow"], ' +
    '[class*="member-row"], [class*="MemberRow"], ' +
    '[class*="contact-row"], [class*="ContactRow"]'
  ).forEach((row, idx) => {
    const cells = row.querySelectorAll(
      '[role="cell"], [class*="cell"], [class*="Cell"], td'
    )
    if (cells.length < 2) return
    const rowData = {}
    cells.forEach((cell, i) => {
      const key = headers[i] || 'col_' + i
      rowData[key] = cell.textContent?.trim() ?? ''
    })
    if (Object.values(rowData).some(v => String(v).length > 2)) {
      rows.push(rowData)
    }
  })
  return rows.length > 0 ? rows : null
}

// ── Part 2: AI fallback ───────────────────────────────────────────────────────

async function scrapeWithAI(carrier) {
  console.log('[AegisSage] Sending page HTML to AI extraction endpoint via background')

  const truncatedHTML = document.documentElement.outerHTML.slice(0, 50000)

  try {
    const response = await sendMessageWithRetry({
      action: 'AI_EXTRACT',
      carrier: carrier,
      html: truncatedHTML,
      url: window.location.href,
    })
    console.log('[AegisSage] AI extracted', response?.rows?.length ?? 0, 'rows (confidence:', response?.confidence + ')')
    return response?.rows ?? []
  } catch (err) {
    console.error('[AegisSage] AI_EXTRACT error:', err.message)
    return []
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function detectCarrier() {
  const host = window.location.hostname
  if (host.includes('agentportal.humana.com')) return 'humana'
  if (host.includes('evolvenxt.com')) return 'clover'
  if (host.includes('agent.devoted.com')) return 'devoted'
  if (host.includes('myhfgroup.org')) return 'healthfirst'
  if (host.includes('portal.cms.gov')) return 'marx'
  for (const [domain, carrier] of Object.entries(CARRIER_DOMAINS)) {
    if (host.includes(domain)) return carrier
  }
  return null
}

function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const el = document.querySelector(selector)
    if (el) return resolve(el)

    const observer = new MutationObserver(() => {
      const found = document.querySelector(selector)
      if (found) {
        observer.disconnect()
        resolve(found)
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })

    setTimeout(() => {
      observer.disconnect()
      reject(new Error(`Timeout waiting for: ${selector}`))
    }, timeout)
  })
}

async function getToken() {
  try {
    const response = await sendMessageWithRetry({ action: 'GET_TOKEN' })
    return response?.token ?? null
  } catch {
    return null
  }
}

// ── MARx / CMS Portal ────────────────────────────────────────────────────────

const BATCH_KEY = 'aegissage_marx_batch'

// Set to true the moment a fresh batch is explicitly started via runMarxBatchLookup().
// The IIFE page-load handler checks this flag before resuming from sessionStorage,
// so a 1-second-delayed auto-resume cannot race with a fresh start.
let freshBatchStarted = false

// Normalize plan codes for comparison: strip dashes/spaces, uppercase
function normalizeMarxCode(code) {
  if (!code) return null
  return code.replace(/[-\s]/g, '').toUpperCase()
}

// Classify MARx page result into one of 5 states.
// storedPlanCode comes from lastKnownPlanCode in the members list (GET_MARX_MEMBERS).
function classifyMarxResult(result, storedPlanCode) {
  // No table found at all — MBI not found, wrong MBI, or data error
  if (!result) return 'not_found'

  const allEnrollments = result.allEnrollments ?? []

  // Has enrollment rows, but no H-contract with an open end date
  if (!result.hasActiveMA) {
    // If there are rows at all, member exists but dropped MA
    return allEnrollments.length > 0 ? 'no_ma_plan' : 'not_found'
  }

  // Pending switch: active on current plan but a future plan starts soon
  if (result.hasPendingSwitch && result.pendingFuturePlan) {
    return 'pending_switch'
  }

  // Active MA plan found — compare plan code to stored baseline
  if (!storedPlanCode) {
    // First time checking this member — establish baseline, no alert
    return 'active_same'
  }

  const detected = normalizeMarxCode(result.contractPBP)
  const stored = normalizeMarxCode(storedPlanCode)
  return detected === stored ? 'active_same' : 'active_changed'
}

function saveBatchState(state) {
  state.timestamp = Date.now()
  sessionStorage.setItem(BATCH_KEY, JSON.stringify(state))
}

function loadBatchState() {
  try {
    const s = sessionStorage.getItem(BATCH_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

function clearBatchState() {
  sessionStorage.removeItem(BATCH_KEY)
}

async function runMarxBatchLookup() {
  // Mark that a fresh batch is starting — prevents the IIFE page-load resume
  // from firing concurrently when the user is already on the M232 page.
  freshBatchStarted = true

  // Reset sessionStorage batch state so no stale index bleeds into this run.
  clearBatchState()

  // Clear all known chrome.storage batch keys.
  await new Promise(resolve =>
    chrome.storage.local.remove(
      ['marx_batch_index', 'marx_pending_member', 'marx_progress',
       'last_marx_batch', 'batchIndex', 'pendingMember'],
      resolve
    )
  )
  console.log('[MARx] Module state reset, storage cleared')

  const M232_PATH = 'BeneEligibilityDisplayServlet'
  if (!window.location.href.includes(M232_PATH)) {
    console.log('[MARx] Not on M232 page, navigating...')
    sessionStorage.setItem('aegissage_marx_autostart', '1')
    sessionStorage.setItem('aegissage_marx_autostart_time', Date.now().toString())
    window.location.href = 'https://portal.cms.gov/mma/servlet/mmcs.beneficiaries.eligibility.BeneEligibilityDisplayServlet'
    return
  }

  let state = loadBatchState()

  if (!state) {
    console.log('[MARx] Starting new batch...')

    let membersData = null
    try {
      membersData = await sendMessageWithRetry({ action: 'GET_MARX_MEMBERS', forBatch: true })
    } catch (err) {
      console.error('[MARx] GET_MARX_MEMBERS failed:', err.message)
    }

    if (membersData?.rateLimited) {
      console.log('[MARx] Rate limited:', membersData.message)
      sendMessageWithRetry({
        action: 'MARX_PROGRESS',
        current: 0, total: 0, changesFound: 0,
        done: true,
        message: membersData.message
      })
      return
    }

    const members = membersData?.members ?? []

    // Always log which account is active so "No members" is diagnosable
    const debugInfo = await new Promise(resolve =>
      chrome.storage.local.get(['token', 'broker_name', 'agency_name', 'broker_id', 'agency_id'], resolve)
    )
    console.log('[MARx] === BATCH START ===')
    console.log('[MARx] Agency:', debugInfo.agency_name ?? 'unknown', '| ID:', debugInfo.agency_id ?? 'unknown')
    console.log('[MARx] Broker:', debugInfo.broker_name ?? 'unknown', '| ID:', debugInfo.broker_id ?? 'unknown')
    console.log('[MARx] Token prefix:', debugInfo.token?.slice(0, 8) ?? 'none')
    // PHI-SAFE: log count only — never log names or MBI values
    console.log('[MARx] Members returned by API:', members.length)
    console.log('[MARx] === END BATCH START ===')

    if (members.length === 0) {
      console.log('[MARx] No members with MBIs stored — check above account info is correct')
      sendMessageWithRetry({
        action: 'MARX_PROGRESS',
        current: 0, total: 0, changesFound: 0,
        done: true,
        message: 'No MBI numbers stored yet'
      })
      return
    }

    state = { members, currentIndex: 0, changesFound: 0, startedAt: Date.now() }
    saveBatchState(state)
    console.log('[MARx] Batch started:', members.length, 'members')
  } else {
    console.log('[MARx] Resuming batch at index', state.currentIndex, 'of', state.members.length)
  }

  const member = state.members[state.currentIndex]
  if (!member) {
    console.log('[MARx] Batch complete:', state.members.length, 'checked,', state.changesFound, 'changes')
    sendMessageWithRetry({
      action: 'MARX_PROGRESS',
      current: state.members.length,
      total: state.members.length,
      changesFound: state.changesFound,
      done: true,
      message: state.changesFound > 0
        ? state.changesFound + ' clients may have switched'
        : 'All clients verified — no changes detected'
    })
    clearBatchState()
    return
  }

  sendMessageWithRetry({
    action: 'MARX_PROGRESS',
    current: state.currentIndex + 1,
    total: state.members.length,
    changesFound: state.changesFound,
    done: false,
    memberName: member.fullName
  }).catch(() => {})

  console.log('[MARx] Looking up:', member.fullName,
    '(' + (state.currentIndex + 1) + '/' + state.members.length + ')')

  await lookupSingleMBI(member.mbi, member.fullName, member.id, state)
}

async function fillMBI(mbi) {
  const mbiClean = mbi.replace(/-/g, '').toUpperCase().trim()
  if (mbiClean.length !== 11) {
    console.error('[MARx] Invalid MBI length:', mbiClean.length, ':', mbi)
    return false
  }
  const claimInput = document.querySelector('#claimNumber')
  if (!claimInput) {
    console.error('[MARx] #claimNumber not found')
    return false
  }
  claimInput.value = ''
  claimInput.focus()
  await new Promise(r => setTimeout(r, 200))
  claimInput.value = mbiClean
  claimInput.dispatchEvent(new Event('focus', { bubbles: true }))
  claimInput.dispatchEvent(new Event('input', { bubbles: true }))
  claimInput.dispatchEvent(new Event('change', { bubbles: true }))
  claimInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }))
  console.log('[MARx] Beneficiary ID filled:', mbiClean.slice(0, 4) + '-' + mbiClean.slice(4, 7) + '-' + mbiClean.slice(7))
  for (let i = 1; i <= 11; i++) {
    const prtField = document.querySelector('#prtMbi' + i)
    if (prtField) prtField.value = ''
  }
  return true
}

async function lookupSingleMBI(mbi, memberName, memberId, state) {
  if (!mbi || typeof mbi !== 'string') {
    console.warn('[MARx] Skipping member with no MBI:', memberName)
    advanceBatch(state, memberId, null)
    return
  }
  const mbiClean = mbi.replace(/-/g, '').toUpperCase().trim()
  if (mbiClean.length !== 11) {
    console.error('[MARx] Invalid MBI:', mbi)
    advanceBatch(state, memberId, null)
    return
  }

  const claimInput = document.querySelector('#claimNumber')
  if (!claimInput) {
    console.error('[MARx] #claimNumber not found')
    advanceBatch(state, memberId, null)
    return
  }

  claimInput.value = ''
  await new Promise(r => setTimeout(r, 100))
  claimInput.value = mbiClean
  claimInput.dispatchEvent(new Event('input', { bubbles: true }))
  claimInput.dispatchEvent(new Event('change', { bubbles: true }))

  const ua = document.querySelector('input[name="userAction"]')
  if (ua) ua.value = 'retrieve'

  await new Promise(r => setTimeout(r, 300))

  if (state) {
    state.pendingMemberId = memberId
    state.pendingMemberName = memberName
    state.pendingFromUrl = window.location.href
    saveBatchState(state)
  }

  const findBtn = document.querySelector('button[name="submitBtn"]')
  if (findBtn) {
    console.log('[MARx] Submitting for:', memberName)
    findBtn.click()
    // Page navigates here — execution resumes in readMarxResults() after reload
  } else {
    console.error('[MARx] Find button not found')
    advanceBatch(state, memberId, null)
  }
}

async function readMarxResults() {
  console.log('[MARx] readMarxResults() called')
  console.log('[MARx] Current URL:', window.location.href)
  console.log('[MARx] Has statusMsg:', window.location.href.includes('statusMsg'))
  console.log('[MARx] eligTable7:', !!document.querySelector('.eligTable7'))
  console.log('[MARx] eligTables count:', document.querySelectorAll('[class*="eligTable"]').length)

  if (!window.location.href.includes('statusMsg')) {
    console.log('[MARx] NOT on results page — skipping')
    return
  }

  const state = loadBatchState()
  if (!state?.pendingMemberId) return

  console.log('[MARx] Reading results for:', state.pendingMemberName)
  console.log('[MARx] URL:', window.location.href)
  console.log('[MARx] Title:', document.title)
  console.log('[MARx] .eligTable7 found:', !!document.querySelector('.eligTable7'))
  console.log('[MARx] Total [class*=eligTable] elements:', document.querySelectorAll('[class*="eligTable"]').length)
  console.log('[MARx] Body excerpt:', document.body.innerText.slice(0, 300))

  function tablePresent() {
    return !!document.querySelector('.eligTable7') ||
      (document.querySelectorAll('[class*="eligTable"]').length > 3 &&
       document.body.innerText.includes('Enrollment'))
  }

  let hasResults = tablePresent()

  if (!hasResults) {
    console.log('[MARx] No results table yet — waiting 3s and retrying...')
    await new Promise(r => setTimeout(r, 3000))
    console.log('[MARx] Retry: .eligTable7 found:', !!document.querySelector('.eligTable7'))
    console.log('[MARx] Retry: eligTable count:', document.querySelectorAll('[class*="eligTable"]').length)
    hasResults = tablePresent()
  }

  if (!hasResults) {
    console.log('[MARx] No results table after retry — skipping')
    advanceBatch(state, state.pendingMemberId, null)
    return
  }

  const result = parseMarxTable()
  console.log('[MARx] Result:', result ? result.contractPBP : 'null')

  // Capture beneficiary name from CMS MARx results page
  const firstEl = document.querySelector('td[headers="firstName"]')
  const lastEl  = document.querySelector('td[headers="lastName"]')
  let capturedName = null
  if (firstEl || lastEl) {
    const firstName = firstEl?.textContent?.replace(/\s+/g, ' ').trim() || ''
    const lastName  = lastEl?.textContent?.replace(/\s+/g, ' ').trim() || ''
    const combined  = `${firstName} ${lastName}`.trim()
    if (combined && /^[A-Za-z\s\-'.]{2,50}$/.test(combined)) capturedName = combined
  }
  console.log('[MARx] Name capture:', {
    firstName: firstEl?.textContent?.trim() ?? 'none',
    lastName:  lastEl?.textContent?.trim() ?? 'none',
    capturedName,
  })

  // Classify into one of 5 states using the member's stored plan code as baseline
  const pendingMember = state.members.find(m => m.id === state.pendingMemberId) ?? null
  const marxResult = classifyMarxResult(result, pendingMember?.lastKnownPlanCode ?? null)
  console.log('[MARx] marxResult:', marxResult,
    '| storedCode:', pendingMember?.lastKnownPlanCode ?? 'none',
    '| detectedCode:', result?.contractPBP ?? 'null')

  // Wake service worker — it goes idle during page navigation
  const port = chrome.runtime.connect({ name: 'keepalive' })
  port.disconnect()
  await new Promise(r => setTimeout(r, 500))

  sendMessageWithRetry({
    action: 'PROCESS_MARX_RESULT',
    memberId: state.pendingMemberId,
    memberName: state.pendingMemberName,
    mbi: pendingMember?.mbi ?? null,
    capturedName,
    marxResult,
    detectedPlanCode: result?.contractPBP ?? null,
    detectedCarrier: null, // CMS MARx page does not expose carrier name directly
    // Legacy fields kept for backward compat with older server versions
    planCode: result?.contractPBP ?? null,
    planName: result?.planDescription ?? null,
    effectiveDate: result?.startDate ?? null,
    endDate: result?.endDate ?? null,
    status: result?.status ?? 'unknown',
    allEnrollments: result?.allEnrollments ?? [],
    hasActiveMA: result?.hasActiveMA ?? false,
    onlyPartD: result?.onlyPartD ?? false,
    detectedFuturePlan: result?.pendingFuturePlan ?? null,
    detectedFutureStart: result?.pendingFutureStart ?? null,
    noResult: !result
  }, 5).then(response => {
    console.log('[MARx] Server response:', response)
    if (response?.changed) {
      state.changesFound++
      console.log('[MARx] CHANGE DETECTED for:', state.pendingMemberName)
    }
    advanceBatch(state, state.pendingMemberId, result)
  }).catch(err => {
    console.error('[MARx] Process error:', err.message)
    advanceBatch(state, state.pendingMemberId, result)
  })
}

async function advanceBatch(state, memberId, result) {
  if (!state) return

  delete state.pendingMemberId
  delete state.pendingMemberName
  state.currentIndex++
  saveBatchState(state)

  // Check if user pressed Stop
  const stopped = await new Promise(resolve => {
    chrome.storage.local.get(['marx_batch_stopped'], r => resolve(!!r.marx_batch_stopped))
  })
  if (stopped) {
    console.log('[MARx] Batch stopped by user at index', state.currentIndex)
    clearBatchState()
    chrome.storage.local.remove(['marx_batch_stopped'])
    sendMessageWithRetry({
      action: 'MARX_PROGRESS',
      current: state.currentIndex,
      total: state.members.length,
      changesFound: state.changesFound,
      done: true,
      message: 'Verification stopped by user'
    }).catch(() => {})
    return
  }

  if (state.currentIndex >= state.members.length) {
    console.log('[MARx] All members checked')
    clearBatchState()
    sendMessageWithRetry({
      action: 'MARX_PROGRESS',
      current: state.members.length,
      total: state.members.length,
      changesFound: state.changesFound,
      done: true,
      message: state.changesFound > 0
        ? state.changesFound + ' clients may have switched'
        : 'All clients verified — no changes detected'
    }).catch(() => {})
    return
  }

  const delay = 5000 + Math.random() * 3000
  console.log('[MARx] Next lookup in', Math.round(delay / 1000) + 's...')
  await new Promise(r => setTimeout(r, delay))

  if (!window.location.href.includes('BeneEligibilityDisplayServlet')) {
    window.location.href =
      'https://portal.cms.gov/mma/servlet/mmcs.beneficiaries.eligibility.BeneEligibilityDisplayServlet'
    return
  }

  const resetBtn = document.querySelector('button[name="resetBtn"]')
  if (resetBtn) {
    resetBtn.click()
    await new Promise(r => setTimeout(r, 1000))
  } else {
    const claimInput = document.querySelector('#claimNumber')
    if (claimInput) claimInput.value = ''
  }

  const nextMember = state.members[state.currentIndex]
  sendMessageWithRetry({
    action: 'MARX_PROGRESS',
    current: state.currentIndex + 1,
    total: state.members.length,
    changesFound: state.changesFound,
    done: false,
    memberName: nextMember.fullName
  }).catch(() => {})

  await lookupSingleMBI(nextMember.mbi, nextMember.fullName, nextMember.id, state)
}

function isActive(end) { return !end || end.trim() === '' }

function parseMarxTable() {
  let table = document.querySelector('.eligTable7')

  if (!table) {
    for (const t of document.querySelectorAll('[class*="eligTable"]')) {
      if (t.innerText.includes('Enrollment Information') || t.innerText.includes('Enrollment')) {
        table = t
        break
      }
    }
  }

  if (!table) return null

  // PHI-SAFE: log structural metadata only — no raw HTML, no beneficiary cell content
  const eligTableCount = document.querySelectorAll('[class*="eligTable"]').length
  const rowCount = table.querySelectorAll('tbody tr').length
  console.log('[MARx] parseMarxTable: eligTables found:', eligTableCount, '| data rows:', rowCount)

  const enrollments = []
  const dataRows = table.querySelectorAll('tbody tr')

  dataRows.forEach((row, idx) => {
    // MARx uses <th scope="row"> for the Contract cell — must include th
    const cells = row.querySelectorAll('td, th')

    if (cells.length < 3) return

    // Skip divider rows (colspan=6)
    if (cells[0].getAttribute('colspan') === '6') return

    const contract   = cells[0]?.textContent?.trim() ?? ''
    const pbp        = cells[1]?.textContent?.trim() ?? ''
    const planDesc   = cells[2]?.textContent?.trim() ?? ''
    const startDate  = cells[3]?.textContent?.trim() ?? ''
    const endDateRaw = cells[4]?.textContent?.trim() ?? ''
    const drugPlan   = cells[5]?.textContent?.trim() ?? ''

    // MARx renders empty end dates as a hidden <span>blank</span>
    const endDate = (endDateRaw === 'blank' || endDateRaw === '') ? '' : endDateRaw

    if (!contract || contract.length < 3) return

    // Skip header rows and non-contract values
    const INVALID_CONTRACT_VALUES = ['contract', 'contract-pbp', 'pbp', 'plan', 'start', 'end', 'drug plan', 'contract number']
    if (INVALID_CONTRACT_VALUES.includes(contract.toLowerCase())) return
    if (!/^[HSE]\d{4}/.test(contract)) return

    enrollments.push({
      'Contract': contract,
      'PBP': pbp,
      'Plan Type Code & Description': planDesc,
      'Start': startDate,
      'End': endDate,
      'Drug Plan': drugPlan
    })

    console.log('[MARx] Row', idx, ':', contract, pbp, planDesc, startDate, '->', endDate || 'ACTIVE')
  })

  if (enrollments.length === 0) return null

  const planInfo   = findContractPBP(enrollments)
  const activePlan = enrollments.find(e => isActive(e['End'] ?? '')) ?? enrollments[0]

  console.log('[MARx] Active plan found:', planInfo)
  console.log('[MARx] All enrollments:', enrollments.map(e =>
    e['Contract'] + '-' + e['PBP'] + ' end:' + (e['End'] || 'active')
  ).join(', '))

  const hasActiveMA = enrollments.some(e =>
    e['Contract'].startsWith('H') && isActive(e['End'])
  )
  const onlyPartD = enrollments.every(e =>
    e['Contract'].startsWith('S') || e['Contract'].startsWith('E')
  )

  // Pending switch: multiple active H-contract rows (future plan already scheduled)
  const activeMARows = enrollments.filter(e => e['Contract'].startsWith('H') && isActive(e['End']))
  let hasPendingSwitch = false
  let pendingFuturePlan = null
  let pendingFutureStart = null
  if (activeMARows.length > 1) {
    const today = new Date()
    const sorted = activeMARows.slice().sort((a, b) => new Date(b['Start']) - new Date(a['Start']))
    const futureRow = sorted.find(row => new Date(row['Start']) > today)
    if (futureRow) {
      hasPendingSwitch = true
      pendingFuturePlan = futureRow['Contract'] + '-' + futureRow['PBP']
      pendingFutureStart = futureRow['Start']
    }
  }

  console.log('[MARx] hasActiveMA:', hasActiveMA)
  console.log('[MARx] onlyPartD:', onlyPartD)
  console.log('[MARx] hasPendingSwitch:', hasPendingSwitch, '| future:', pendingFuturePlan ?? 'none')

  return {
    contractPBP: planInfo.contractPBP,
    contract: planInfo.contract,
    pbp: planInfo.pbp,
    planDescription: activePlan?.['Plan Type Code & Description'] ?? '',
    startDate: activePlan?.['Start'] ?? '',
    endDate: activePlan?.['End'] ?? '',
    drugPlan: activePlan?.['Drug Plan'] ?? '',
    status: activePlan?.['End'] ? 'termed' : 'active',
    hasActiveMA,
    onlyPartD,
    hasPendingSwitch,
    pendingFuturePlan,
    pendingFutureStart,
    allEnrollments: enrollments,
  }
}

function findContractPBP(enrollments) {
  // Active plan = row with empty End date; fall back to first row
  const activePlan = enrollments.find(e => isActive(e['End'] ?? '')) ?? enrollments[0]

  if (!activePlan) return { contractPBP: null, contract: null, pbp: null }

  const contract = activePlan['Contract'] ?? ''
  const pbp      = activePlan['PBP'] ?? ''

  if (contract && pbp) {
    return { contractPBP: contract + '-' + pbp, contract, pbp }
  }

  return { contractPBP: null, contract: null, pbp: null }
}

// ── MARx DOM Debug ────────────────────────────────────────────────────────
if (detectCarrier() === 'marx') {
  console.log('[MARx] === PAGE SNAPSHOT ===')
  console.log('[MARx] URL:', window.location.href)
  console.log('[MARx] Title:', document.title)

  const inputs = document.querySelectorAll('input')
  inputs.forEach((inp, i) => {
    console.log('[MARx] Input ' + i + ':', JSON.stringify({
      id: inp.id,
      name: inp.name,
      type: inp.type,
      placeholder: inp.placeholder,
      className: inp.className?.slice ? inp.className.slice(0, 50) : '',
      ariaLabel: inp.getAttribute('aria-label'),
      value: inp.value ? '[has value]' : '[empty]'
    }))
  })

  const buttons = document.querySelectorAll('button, input[type="submit"], a[class*="btn"]')
  buttons.forEach((btn, i) => {
    console.log('[MARx] Button ' + i + ':', JSON.stringify({
      text: btn.textContent?.trim().slice(0, 50),
      id: btn.id,
      name: btn.name,
      value: btn.value,
      type: btn.getAttribute('type'),
      className: btn.className?.slice ? btn.className.slice(0, 50) : ''
    }))
  })

  const forms = document.querySelectorAll('form')
  console.log('[MARx] Forms found:', forms.length)
  forms.forEach((form, i) => {
    console.log('[MARx] Form ' + i + ':', JSON.stringify({
      id: form.id,
      action: form.action,
      method: form.method
    }))
  })

  const tables = document.querySelectorAll('table')
  console.log('[MARx] Tables:', tables.length)
  if (tables.length > 0) {
    const headers = []
    tables[0].querySelectorAll('th').forEach(th => {
      headers.push(th.textContent?.trim())
    })
    console.log('[MARx] Table 1 headers:', headers)
  }

  console.log('[MARx] Body text sample:', document.body.innerText.slice(0, 800))
  console.log('[MARx] === END SNAPSHOT ===')
}

// ── M002 Role Selection Auto-Handler ──────────────────────────────────────────
// CMS M002 page appears after login — broker must pick a role before reaching M232.
// Auto-select MAPD AGENT (radio value "47") and submit.

if (detectCarrier() === 'marx' && window.location.href.includes('logonDisplay')) {
  console.log('[MARx] M002 role selection page — auto-selecting MAPD AGENT')
  setTimeout(function() {
    const mapdRadio = document.getElementById('47') || document.querySelector('input[value="47"]')
    if (mapdRadio) {
      mapdRadio.checked = true
      mapdRadio.click()
      mapdRadio.dispatchEvent(new Event('change', { bubbles: true }))
      console.log('[MARx] Selected MAPD AGENT radio')
      setTimeout(function() {
        const roleBtn = document.getElementById('userRole') ||
          document.querySelector('[name="userRole"], input[value="Select Role"], button[id="userRole"]')
        if (roleBtn) {
          roleBtn.click()
          console.log('[MARx] Clicked role selection button')
        } else {
          console.warn('[MARx] Role button not found — available buttons:',
            Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]'))
              .map(b => ({ id: b.id, name: b.name, value: b.value })))
        }
      }, 500)
    } else {
      console.warn('[MARx] MAPD AGENT radio (#47) not found — available radios:',
        Array.from(document.querySelectorAll('input[type="radio"]'))
          .map(r => ({ id: r.id, value: r.value, name: r.name })))
    }
  }, 1500)
}

// ── M232 Page Load Handler ────────────────────────────────────────────────────
// URL-based dispatch: results page has ?statusMsg= in the URL;
// search page does not. This prevents readMarxResults() from firing
// on the wrong page after advanceBatch() navigates back.

if (detectCarrier() === 'marx' &&
    window.location.href.includes('BeneEligibilityDisplayServlet')) {
  ;(async () => {
    const state = loadBatchState()

    const isResultsPage = window.location.href.includes('statusMsg')
    const isSearchPage = !isResultsPage

    console.log('[MARx] Page type:', isResultsPage ? 'RESULTS' : 'SEARCH',
      '| pendingMember:', state?.pendingMemberId ?? 'none',
      '| batchIndex:', state?.currentIndex ?? 'none')

    if (isResultsPage && state?.pendingMemberId) {
      await new Promise(r => setTimeout(r, 4000))

      const eligTables = document.querySelectorAll('[class*="eligTable"]')
      console.log('[MARx] Results page eligTables:', eligTables.length)

      if (eligTables.length < 5) {
        console.log('[MARx] Insufficient tables, retrying...')
        await new Promise(r => setTimeout(r, 3000))
      }

      readMarxResults()
      return
    }

    if (isSearchPage && state && !state.pendingMemberId && !freshBatchStarted) {
      const savedTime = state.timestamp || 0
      const ageMinutes = (Date.now() - savedTime) / 1000 / 60

      if (ageMinutes > 30) {
        console.log('[MARx] Stale batch state discarded (age:', Math.round(ageMinutes), 'min)')
        clearBatchState()
        return
      }

      console.log('[MARx] Search page — resuming batch at index', state.currentIndex)
      await new Promise(r => setTimeout(r, 1000))
      // Re-check: a fresh batch may have been started during the sleep
      if (!freshBatchStarted) {
        runMarxBatchLookup()
      } else {
        console.log('[MARx] Fresh batch started during sleep — skipping stale resume')
      }
      return
    }

    if (isSearchPage && state?.pendingMemberId) {
      console.log('[MARx] WARNING: On search page with pending member:', state.pendingMemberId)
      console.log('[MARx] Skipping failed lookup')
      delete state.pendingMemberId
      delete state.pendingMemberName
      state.currentIndex++
      saveBatchState(state)
      await new Promise(r => setTimeout(r, 1000))
      runMarxBatchLookup()
      return
    }

    // Fresh batch auto-start
    const autoStart = sessionStorage.getItem('aegissage_marx_autostart')
    const autoStartTime = sessionStorage.getItem('aegissage_marx_autostart_time')
    const isRecent = autoStartTime && (Date.now() - parseInt(autoStartTime)) < 10000

    if (autoStart && isRecent) {
      sessionStorage.removeItem('aegissage_marx_autostart')
      sessionStorage.removeItem('aegissage_marx_autostart_time')
      await new Promise(r => setTimeout(r, 2000))
      runMarxBatchLookup()
    }
  })()
}

// ── Manual test helper ────────────────────────────────────────────────────────
// Call window.aegissageTestLookup(mbi) from the content script devtools context
// (chrome-extension:// panel) — no script injection into the page needed.

async function aegissageTestLookup(mbi) {
  console.log('[MARx] Test lookup triggered:', mbi)
  const state = loadBatchState() ?? { members: [], currentIndex: 0, changesFound: 0 }
  await lookupSingleMBI(mbi, 'Test Client', 'test-' + Date.now(), state)
}

// ── Token bridge for aegissage.com connect page ───────────────────────────────
// When the web page can't send a message directly (extension ID mismatch on
// sideloaded/beta installs), it stores the token in localStorage + fires a
// CustomEvent. Content scripts can always message their own extension without
// knowing the ID, so this bridge works for any install method.

if (window.location.hostname.includes('aegissage.com')) {
  function relayToken(raw) {
    try {
      const payload = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (!payload?.token) return
      chrome.runtime.sendMessage({
        action: 'STORE_TOKEN',
        token: payload.token,
        agency_name: payload.agency_name ?? null,
        broker_name: payload.broker_name ?? null,
      }, function(r) {
        if (r?.success) console.log('[AegisSage] Bridge: token relayed to extension')
      })
    } catch (err) {
      console.warn('[AegisSage] Bridge relay failed:', err)
    }
  }

  // Listen for the CustomEvent fired immediately after storage
  window.addEventListener('aegissage_connect', function(event) {
    relayToken(event.detail)
  })

  // Also check localStorage on load (handles page-refresh-after-connect case)
  const pending = localStorage.getItem('aegissage_pending_token')
  if (pending) {
    localStorage.removeItem('aegissage_pending_token')
    relayToken(pending)
  }
}
