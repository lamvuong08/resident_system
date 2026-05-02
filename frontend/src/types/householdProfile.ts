/** Dòng cư dân từ GET /households/me/residents — khớp HouseholdController#toResidentResponse */
export type MyHouseholdResident = {
  id: number
  name: string
  gender: string | null
  dob: string | null
  age: number | null
  cccd: string | null
  phone: string | null
  relationship: string | null
  residentCategory: string | null
  occupancyStatus: string | null
  status: string | null
  householdId: number
}
