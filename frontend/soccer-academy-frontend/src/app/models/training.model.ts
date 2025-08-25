export interface TrainingSession {
   id: number;
  title: string;
  description?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  field_id?: number;
  coach_id: number;
  category_id?: number;
  team_id?: number;
  session_type: 'training' | 'match' | 'friendly' | 'tournament';
  objectives?: string;
  drills?: string;
  equipment_needed?: string;
  max_participants?: number;
  is_mandatory: boolean;
  weather_conditions?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  
  // Related data
  coach_name?: string;
  field_name?: string;
  category_name?: string;
  team_name?: string;
  attendees_count?: number;
  attendance_rate?: number;
}

export interface SessionAttendance {
    attendance_id?: number;
  player_id: number;
  first_name: string;
  last_name: string;
  registration_number: string;
  photo_url?: string;
  birth_date: string;
  attendance_status: 'present' | 'absent' | 'late' | 'excused';
  arrival_time?: string;
  departure_time?: string;
  late_minutes?: number;
  performance_rating?: number;
  coach_notes?: string;
  excuse_reason?: string;
  excuse_approved?: boolean;
  is_assigned: boolean;
}
export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  rate: number;
}

export interface AttendanceResponse {
  session: TrainingSession;
  attendance: SessionAttendance[];
  stats: AttendanceStats;
}
