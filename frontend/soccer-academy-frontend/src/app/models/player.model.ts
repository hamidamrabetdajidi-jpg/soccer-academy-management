export interface Player {
  id: number;
  registration_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'M' | 'F';
  address: Address;
  phone?: string;
  email?: string;
  category_id: number;
  category_name?: string; // Add this for display
  tshirt_number?: number;
  photo_url?: string;
  medical_info?: string;
  emergency_contact: EmergencyContact;
  registration_date: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface Category {
  id: number;
  name: string;
  age_min: number;
  age_max: number;
  description?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface CreatePlayerRequest {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: 'M' | 'F';
  address: Address;
  phone?: string;
  email?: string;
  category_id: number;
  tshirt_number?: number;
  medical_info?: string;
  emergency_contact: EmergencyContact;
}