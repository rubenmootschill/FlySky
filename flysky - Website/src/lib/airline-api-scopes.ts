export const AIRLINE_API_SCOPES = [
  'airports',
  'awards',
  'expenses',
  'fleet',
  'flights',
  'map',
  'operations',
  'pilots',
  'schedules',
] as const

export type AirlineApiScopeKey = (typeof AIRLINE_API_SCOPES)[number]

export const AIRLINE_API_SCOPE_ENUM_MAP: Record<AirlineApiScopeKey, string> = {
  airports: 'AIRPORTS',
  awards: 'AWARDS',
  expenses: 'EXPENSES',
  fleet: 'FLEET',
  flights: 'FLIGHTS',
  map: 'MAP',
  operations: 'OPERATIONS',
  pilots: 'PILOTS',
  schedules: 'SCHEDULES',
}
