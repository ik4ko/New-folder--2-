'use server';

/**
 * @fileOverview Server-side wrapper for the Stedi API.
 * Provides secure interaction with EDI protocols and trading partners.
 */

const STEDI_BASE_URL = 'https://api.stedi.com/v1';

export async function stediRequest(endpoint: string, method: string = 'GET', data: any = null) {
  const apiKey = process.env.STEDI_API_KEY;

  // Mock responses for demo/test mode if API key is missing
  if (!apiKey) {
    console.warn("STEDI_API_KEY missing. Using mock data for demo mode.");
    return getMockResponse(endpoint);
  }

  try {
    const response = await fetch(`${STEDI_BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : null,
    });

    if (!response.ok) {
      throw new Error(`Stedi API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Stedi Request Failed:", error);
    throw error;
  }
}

function getMockResponse(endpoint: string) {
  if (endpoint.includes('/partners')) {
    return [
      { id: 'partner_1', name: 'UnitedHealthcare (EDI)', status: 'Connected' },
      { id: 'partner_2', name: 'Humana (HETS)', status: 'Active' },
      { id: 'partner_3', name: 'Aetna (Direct)', status: 'Pending' }
    ];
  }
  if (endpoint.includes('/transactions')) {
    return [
      { id: 'tx_1', type: '270', status: 'delivered', timestamp: new Date().toISOString() },
      { id: 'tx_2', type: '271', status: 'received', timestamp: new Date().toISOString() }
    ];
  }
  return { success: true, mode: 'mock' };
}
