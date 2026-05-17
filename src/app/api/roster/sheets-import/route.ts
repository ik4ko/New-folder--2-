import { NextRequest, NextResponse } from 'next/server'
import { parseRosterFile } from '@/lib/churn/roster-parser'

export async function POST(req: NextRequest) {
  try {
    const { url, carrier } = await req.json() as { url: string; carrier: string }

    if (!url || !carrier) {
      return NextResponse.json({ error: 'url and carrier are required' }, { status: 400 })
    }

    // Extract Google Sheets ID
    const match = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/.exec(url)
    if (!match) {
      return NextResponse.json({ error: 'Invalid Google Sheets URL. Paste the full URL from your browser.' }, { status: 400 })
    }
    const sheetId = match[1]

    // Fetch as CSV — sheet must be "Anyone with link can view"
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`
    const response = await fetch(csvUrl, { redirect: 'follow' })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Could not fetch sheet. Make sure it is set to "Anyone with link can view" in Google Sheets sharing settings.' },
        { status: 400 },
      )
    }

    const buffer = await response.arrayBuffer()
    const rows = parseRosterFile(buffer, carrier)

    // Return preview rows + full data as base64 so the client can confirm without re-fetching
    const csvBase64 = Buffer.from(buffer).toString('base64')

    return NextResponse.json({
      preview: rows.slice(0, 5),
      rowCount: rows.length,
      csvBase64,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}
