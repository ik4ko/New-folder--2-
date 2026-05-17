import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

/**
 * Decrypt the password stored by `addCarrierLogin`.
 * The encryption routine in `carrier-logins.ts` uses:
 *   - key: SHA-256 hash of the Supabase service role key
 *   - iv : first 16 bytes (hex) stored before the ':'
 *   - ciphertext : hex after the ':'
 */
function decryptPassword(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const ciphertext = Buffer.from(dataHex, 'hex');
  const key = crypto
    .createHash('sha256')
    .update(process.env.SUPABASE_SERVICE_ROLE_KEY!)
    .digest();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { agency_id: agencyId, carrier } = req.query;

  if (!agencyId || typeof agencyId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid agency_id query param' });
  }

  try {
    let query = supabaseAdmin
      .from('carrier_logins')
      .select('carrier, username, password_encrypted');

    query = query.eq('agency_id', agencyId);
    if (carrier && typeof carrier === 'string') {
      query = query.eq('carrier', carrier);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'No credentials found' });

    const credentials = data.map((row) => ({
      carrier: row.carrier,
      username: row.username,
      password: decryptPassword(row.password_encrypted),
    }));

    return res.status(200).json({ credentials });
  } catch (err: any) {
    console.error('Error fetching carrier credentials:', err);
    return res.status(500).json({ error: err.message ?? 'Unexpected error' });
  }
}
