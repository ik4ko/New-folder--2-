import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { createServiceClient } from '@/lib/supabase/service'

export interface VCCFieldData {
  client_name: string
  client_dob?: string
  medicare_id?: string
  doctor_name?: string
  doctor_fax?: string
  broker_npn?: string
  broker_name?: string
  carrier_id?: string
  submission_date?: string
}

export interface FieldMapEntry {
  page: number
  x: number
  y: number
  size?: number
  maxLength?: number
}

export async function fillVCCForm(
  templatePath: string,
  fieldMap: Record<string, FieldMapEntry>,
  data: VCCFieldData
): Promise<Uint8Array> {
  const supabase = createServiceClient()

  const dataMap: Record<string, string> = {
    client_name:     data.client_name ?? '',
    client_dob:      data.client_dob ?? '',
    medicare_id:     data.medicare_id ?? '',
    doctor_name:     data.doctor_name ?? '',
    doctor_fax:      data.doctor_fax ?? '',
    broker_npn:      data.broker_npn ?? '',
    broker_name:     data.broker_name ?? '',
    submission_date: data.submission_date ?? new Date().toLocaleDateString('en-US'),
  }

  let pdfDoc: PDFDocument

  // Try to download carrier template; fall back to a blank document
  const { data: fileData, error } = await supabase.storage
    .from('vcc-templates')
    .download(templatePath)

  if (error || !fileData) {
    // No template uploaded yet — build a plain-text PDF
    pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([612, 792])
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const body = await pdfDoc.embedFont(StandardFonts.Helvetica)

    page.drawText('VCC Authorization Form', { x: 50, y: 740, size: 16, font, color: rgb(0, 0, 0) })
    page.drawText(`Generated: ${dataMap.submission_date}`, { x: 50, y: 718, size: 9, font: body, color: rgb(0.4, 0.4, 0.4) })

    const fields = [
      ['Client Name',    dataMap.client_name],
      ['Date of Birth',  dataMap.client_dob],
      ['Doctor Name',    dataMap.doctor_name],
      ['Doctor Fax',     dataMap.doctor_fax],
      ['Broker NPN',     dataMap.broker_npn],
      ['Broker Name',    dataMap.broker_name],
    ]

    let y = 680
    for (const [label, value] of fields) {
      if (!value) continue
      page.drawText(`${label}:`, { x: 50, y, size: 9, font, color: rgb(0, 0, 0) })
      page.drawText(value, { x: 160, y, size: 9, font: body, color: rgb(0, 0, 0) })
      y -= 22
    }

    return pdfDoc.save()
  }

  const arrayBuffer = await fileData.arrayBuffer()
  pdfDoc = await PDFDocument.load(arrayBuffer)
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const pages = pdfDoc.getPages()

  for (const [fieldKey, entry] of Object.entries(fieldMap)) {
    const value = dataMap[fieldKey]
    if (!value) continue

    const page = pages[entry.page - 1]
    if (!page) continue

    page.drawText(entry.maxLength ? value.slice(0, entry.maxLength) : value, {
      x: entry.x,
      y: entry.y,
      size: entry.size ?? 10,
      font,
      color: rgb(0, 0, 0),
    })
  }

  return pdfDoc.save()
}

export async function saveFilledPDF(
  pdfBytes: Uint8Array,
  agencyId: string,
  submissionId: string
): Promise<string> {
  const supabase = createServiceClient()
  const path = `${agencyId}/${submissionId}/filled.pdf`

  const { error } = await supabase.storage
    .from('VCC-filled')
    .upload(path, pdfBytes, { contentType: 'application/pdf', upsert: true })

  if (error) throw new Error(`Failed to save PDF: ${error.message}`)
  return path
}
