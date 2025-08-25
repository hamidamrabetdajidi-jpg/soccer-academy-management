export interface Attendance {
  id: number;
  player_id: number;
  session_id?: number;
  event_type: 'training' | 'match' | 'tournament' | 'meeting' | 'camp' | 'other';
  event_date: string;
  event_title: string;
  status: 'present' | 'absent' | 'late' | 'excused' | 'partial';
  check_in_time?: string;
  check_out_time?: string;
  duration_minutes?: number;
  notes?: string;
  marked_by_user_id: number;
  created_at: string;
  updated_at?: string;
  
  // Related data (joined from other tables)
  player_name?: string;
  player_email?: string;
  session_title?: string;
  marked_by_name?: string;
}

export interface AttendanceSummary {
  player_id: number;
  player_name: string;
  email?: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  attendance_rate: number;
  last_attendance_date?: string;
  avg_duration_minutes?: number;
}

export interface AttendanceStats {
  total_records: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  total_players: number;
  average_attendance_rate: number;
  total_duration_hours: number;
  most_recent_date?: string;
  oldest_date?: string;
}

export interface AttendancePattern {
  id: number;
  player_id: number;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  typical_status: string;
  attendance_rate: number;
  last_calculated: string;
  player_name?: string;
}

export interface AttendanceAlert {
  id: number;
  player_id: number;
  alert_type: 'low_attendance' | 'consecutive_absences' | 'late_pattern' | 'perfect_attendance';
  alert_message: string;
  threshold_value?: number;
  is_active: boolean;
  last_triggered?: string;
  created_at: string;
  player_name?: string;
}

export interface AttendanceRequest {
  player_id: number;
  session_id?: number;
  event_type: string;
  event_date: string;
  event_title: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
  notes?: string;
}

export interface BulkAttendanceRequest {
  player_ids: number[];
  event_type: string;
  event_date: string;
  event_title: string;
  default_status?: string;
}

export interface AttendanceFilter {
  player_id?: number;
  event_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  session_id?: number;
}

export interface DailyAttendance {
  event_date: string;
  event_title: string;
  event_type: string;
  total_expected: number;
  total_present: number;
  total_absent: number;
  total_late: number;
  total_excused: number;
  attendance_rate: number;
  attendances: Attendance[];
}

export interface WeeklyAttendanceReport {
  week_start: string;
  week_end: string;
  total_sessions: number;
  average_attendance_rate: number;
  daily_breakdown: DailyAttendance[];
  top_performers: AttendanceSummary[];
  concerns: AttendanceSummary[];
}