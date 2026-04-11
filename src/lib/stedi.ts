
'use server';

/**
 * @fileOverview Server-side wrapper for the Stedi API.
 * Provides secure interaction with EDI 270/271 protocols for Medicare Eligibility Checks (MEC).
 */

const STEDI_BASE_URL = 'https://api.stedi.com/v1';

export async function stediRequest(endpoint: string, method: string = 'GET', data: any = null) {
  const apiKey = process.env.STEDI_API_KEY;

  // Mock responses for demo/test mode if API key is missing
  if (!apiKey) {
    console.warn("STEDI_API_KEY missing. Using mock data for demo mode.");
    return getMockEligibilityResponse(endpoint);
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

/**
 * Simulates a HETS 271 response for switch detection testing.
 */
function getMockEligibilityResponse(endpoint: string) {
  if (endpoint.includes('/eligibility')) {
    const hasSwitch = Math.random() > 0.7;
    return {
      status: 'active',
      currentPlan: {
        contractNumber: 'H1234',
        planName: 'Clover Health Choice',
        effectiveDate: '2024-01-01'
      },
      futureEnrollment: hasSwitch ? {
        contractNumber: 'H5678',
        planName: 'Humana Gold Plus',
        effectiveDate: '2025-01-01',
        status: 'pending_approval'
      } : null,
      lisLevel: 'Level 1',
      medicaidIndicator: true
    };
  }
  
  if (endpoint.includes('/partners')) {
    return [
      { id: 'partner_1', name: 'UnitedHealthcare (EDI)', status: 'Connected' },
      { id: 'partner_2', name: 'Humana (HETS)', status: 'Active' },
      { id: 'partner_3', name: 'Aetna (Direct)', status: 'Pending' }
    ];
  }
  return { success: true, mode: 'mock' };
}
