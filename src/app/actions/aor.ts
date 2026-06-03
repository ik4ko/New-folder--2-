import { SignatureMethod } from '@/types/aor'

/**
 * Create AOR submission stub
 * TODO: Implement actual AOR submission logic
 */
export async function createAORSubmission(params: {
  ghlContactId: string
  clientName: string
  medicareId?: string
  clientEmail?: string
  clientPhone?: string
  carrier: string
  carrierFax?: string
  signatureMethod: SignatureMethod
}): Promise<{ submissionId?: string; error?: string }> {
  throw new Error('createAORSubmission not implemented')
}

/**
 * Send AOR to client stub
 * TODO: Implement actual AOR sending logic
 */
export async function sendAORToClient(submissionId: string): Promise<{ pdfDownloadUrl?: string; error?: string }> {
  throw new Error('sendAORToClient not implemented')
}

/**
 * Upload signed AOR stub
 * TODO: Implement actual signed AOR upload logic
 */
export async function uploadSignedAOR(submissionId: string, formData: FormData): Promise<{ error?: string }> {
  throw new Error('uploadSignedAOR not implemented')
}
