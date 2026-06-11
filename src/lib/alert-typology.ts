// Alert typology — shared between server pages and client components.
// MUST stay free of 'use client' and JSX so server components can import it
// (calling a function exported from a client module in a server component
// throws "Attempted to call getAlertTypology() from the server").

export type AlertTypology = 'flight_risk' | 'switched' | 'secured'

// flight_risk = "Leaving Soon": scheduled/future switches we can still save.
// switched    = "Left Plan": the member is already gone (switched or termed).
export const FLIGHT_RISK_TYPES = new Set(['future_plan_change', 'plan_switch', 'pending_switch'])
export const SWITCHED_TYPES    = new Set(['plan_changed', 'carrier_switch', 'termed', 'fully_disenrolled'])

export function getAlertTypology(alert: { status?: string | null; switch_type?: string | null }): AlertTypology {
  if (alert.status === 'resolved') return 'secured'
  const st = alert.switch_type ?? ''
  if (SWITCHED_TYPES.has(st))     return 'switched'
  if (FLIGHT_RISK_TYPES.has(st))  return 'flight_risk'
  // Open/contacted/mitigating alerts without a specific switch_type signal
  // are treated as flight-risk until confirmed otherwise.
  return 'flight_risk'
}
