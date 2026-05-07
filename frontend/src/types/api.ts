export interface Resident {
  id?: number | string
  name?: string
  gender?: string | null
  genderLabel?: string
  dob?: string | null
  dobLabel?: string
  birthYear?: number | null
  cccd?: string | null
  phone?: string | null
  relationship?: string | null
  relationshipLabel?: string
  status?: string | null
  householdId?: number | string | null
  apartmentId?: number | null
  age?: number | null
}

export interface Apartment {
  code?: string
  floorNumber?: number
  area?: number | null
  status?: string | null
  owner?: string | null
  ownerName?: string | null
  people?: number
  peopleCount?: number
  buildingName?: string | null
  buildingCode?: string
  householdId?: number | null
  id?: number | string
}

export interface Building {
  id?: number
  code?: string
  name?: string
  floors?: number
  apartments?: Apartment[]
  residents?: number
  occupied?: number
  vacant?: number
  totalApartments?: number
}

export interface ApiResponse<T = unknown> {
  data: T
}

export interface UserRequestResponse {
  id: number;
  type: 'REPAIR' | 'COMPLAINT' | 'SUPPORT';
  apartmentCode?: string; // Tích hợp từ Backend
  description: string;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'REJECTED';
  createdAt: string;
}

// Interface chuẩn để parse cục Page<T> của Spring Boot trả về
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}
