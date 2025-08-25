export interface Field {
  id: number;
  name: string;
  description?: string;
  field_type: 'full_size' | 'three_quarter' | 'half_size' | 'indoor_court' | 'training_area';
  surface_type: 'natural_grass' | 'artificial_turf' | 'indoor_surface' | 'concrete' | 'sand';
  dimensions?: string;
  capacity: number;
  location?: string;
  address?: string;
  facilities?: string;
  equipment_available?: string;
  hourly_rate?: number;
  is_indoor: boolean;
  has_lighting: boolean;
  has_parking: boolean;
  has_changing_rooms: boolean;
  maintenance_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  
  // Calculated fields
  current_booking?: FieldBooking;
  next_booking?: FieldBooking;
  availability_status?: 'available' | 'occupied' | 'maintenance' | 'unavailable';
  total_bookings?: number;
  utilization_rate?: number;
}
export interface BookingConflict {
  id: number;
  booking_id: number;
  conflicting_booking_id: number;
  conflict_type: 'overlap' | 'same_time' | 'maintenance' | 'unavailable';
  resolved: boolean;
  resolved_by_user_id?: number;
  resolved_at?: string;
  created_at: string;
  
  // Related data
  booking_title?: string;
  conflicting_booking_title?: string;
  field_name?: string;
}
export interface FieldAvailabilitySlot {
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking?: FieldBooking;
  reason?: string;
}
export interface BookingRequest {
  field_id: number;
  session_id?: number;
  booking_type: string;
  booking_title: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  notes?: string;
  recurring_type?: string;
  recurring_end_date?: string;
}
export interface FieldBooking {
  id: number;
  field_id: number;
  session_id?: number;
  booking_type: 'training' | 'match' | 'maintenance' | 'event' | 'rental' | 'tournament';
  booking_title: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booked_by_user_id: number;
  notes?: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurring_end_date?: string;
  created_at: string;
  updated_at?: string;
  
  // Related data
  field_name?: string;
  booked_by_name?: string;
  session_title?: string;
  duration_hours?: number;
  is_conflict?: boolean;
}
export interface AvailabilityCheck {
  field_id: number;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  conflicts?: FieldBooking[];
  alternative_slots?: FieldAvailabilitySlot[];
}
export interface FieldMaintenance {
  id: number;
  field_id: number;
  maintenance_type: string;
  description?: string;
  scheduled_date: string;
  start_time?: string;
  end_time?: string;
  maintenance_company?: string;
  cost?: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  completed_date?: string;
  notes?: string;
  created_by_user_id: number;
  created_at: string;
  
  // Related data
  field_name?: string;
  created_by_name?: string;
}

export interface FieldAvailability {
  field_id: number;
  date: string;
  time_slots: TimeSlot[];
}

export interface TimeSlot {
  start_time: string;
  end_time: string;
  is_available: boolean;
  booking?: FieldBooking;
  maintenance?: FieldMaintenance;
}

export interface FieldStats {
  total_fields: number;
  active_fields: number;
  indoor_fields: number;
  outdoor_fields: number;
  total_capacity: number;
  fields_in_use: number;
  fields_under_maintenance: number;
  utilization_rate: number;
}
