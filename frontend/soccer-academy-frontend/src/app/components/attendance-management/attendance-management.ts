import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Attendance, AttendanceSummary, AttendanceStats } from '../../models/attendance.model';
import { SidebarComponent } from '../Shared/sidebar/sidebar.component';
import { FooterComponent  } from '../Shared/footer/footer.component';
@Component({
  selector: 'app-attendance-management',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule,SidebarComponent,FooterComponent],
  templateUrl: './attendance-management.html',
  styleUrls: ['./attendance-management.scss']
})
export class AttendanceManagementComponent implements OnInit {
  attendance: Attendance[] = [];
  attendanceSummary: AttendanceSummary[] = [];
  players: any[] = [];
  trainingSessions: any[] = [];
  stats: AttendanceStats | null = null;
  
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
  
  // Modal states
  showAddAttendanceModal = false;
  showEditModal = false;
  showBulkAttendanceModal = false;
  showSummaryModal = false;
  showDeleteModal = false;
  filteredAttendance: Attendance[] = []; // Add this line

  selectedAttendance: Attendance | null = null;
  editingAttendance: Attendance | null = null;
  attendanceToDelete: Attendance | null = null;
  
  // Forms
  attendanceForm!: FormGroup;
  bulkAttendanceForm!: FormGroup;
  
  // Search and filter
  searchTerm = '';
  selectedStatus = '';
  selectedEventType = '';
  selectedPlayer = '';
  startDate = '';
  endDate = '';
  sortBy = 'event_date';
  sortOrder = 'desc';
  searchTimeout: any;
  
  // View modes
  viewMode: 'list' | 'cards' | 'summary' | 'calendar' = 'cards';
  
  // Attendance status options
  attendanceStatuses = [
    { value: 'present', label: 'Present', color: 'success', icon: 'fas fa-check-circle' },
    { value: 'absent', label: 'Absent', color: 'danger', icon: 'fas fa-times-circle' },
    { value: 'late', label: 'Late', color: 'warning', icon: 'fas fa-clock' },
    { value: 'excused', label: 'Excused', color: 'info', icon: 'fas fa-exclamation-circle' },
    { value: 'partial', label: 'Partial', color: 'secondary', icon: 'fas fa-adjust' }
  ];
  
  // Event types
  eventTypes = [
    { value: 'training', label: 'Training Session', icon: 'fas fa-dumbbell' },
    { value: 'match', label: 'Match', icon: 'fas fa-futbol' },
    { value: 'tournament', label: 'Tournament', icon: 'fas fa-trophy' },
    { value: 'meeting', label: 'Team Meeting', icon: 'fas fa-users' },
    { value: 'camp', label: 'Training Camp', icon: 'fas fa-campground' },
    { value: 'other', label: 'Other Event', icon: 'fas fa-calendar' }
  ];

  // Bulk attendance selection
  selectedPlayerIds: number[] = [];

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadPlayers();
    this.loadTrainingSessions();
    this.loadAttendance();
  }

  initializeForms(): void {
    this.attendanceForm = this.formBuilder.group({
      player_id: ['', [Validators.required]],
      session_id: [''],
      event_type: ['training', [Validators.required]],
      event_date: ['', [Validators.required]],
      event_title: ['', [Validators.required]],
      status: ['present', [Validators.required]],
      check_in_time: [''],
      check_out_time: [''],
      notes: ['']
    });

    this.bulkAttendanceForm = this.formBuilder.group({
      player_ids: [[], [Validators.required]],
      event_type: ['training', [Validators.required]],
      event_date: ['', [Validators.required]],
      event_title: ['', [Validators.required]],
      default_status: ['present', [Validators.required]]
    });
  }

  loadPlayers(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>('http://localhost:3000/api/players', { headers })
      .subscribe({
        next: (response) => {
          this.players = response.players || [];
          console.log('👥 Players loaded:', this.players.length);
        },
        error: (error) => {
          console.error('❌ Error loading players:', error);
        }
      });
  }

  loadTrainingSessions(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Load recent training sessions
    this.http.get<any>('http://localhost:3000/api/training-sessions?limit=20', { headers })
      .subscribe({
        next: (response) => {
          this.trainingSessions = response.sessions || [];
          console.log('🏃 Training sessions loaded:', this.trainingSessions.length);
        },
        error: (error) => {
          console.error('❌ Error loading training sessions:', error);
        }
      });
  }

  loadAttendance(): void {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Build query parameters
    let queryParams = new URLSearchParams();
    
   if (this.searchTerm && this.searchTerm.trim() !== '') {
      queryParams.append('search', this.searchTerm.trim());
    }
    
    if (this.selectedStatus && this.selectedStatus !== '') {
      queryParams.append('status', this.selectedStatus);
    }
    
    if (this.selectedEventType && this.selectedEventType !== '') {
      queryParams.append('event_type', this.selectedEventType);
    }
    
    if (this.selectedPlayer && this.selectedPlayer !== '') {
      queryParams.append('player_id', this.selectedPlayer);
    }
    
    if (this.startDate && this.startDate !== '') {
      queryParams.append('start_date', this.startDate);
    }
    
    if (this.endDate && this.endDate !== '') {
      queryParams.append('end_date', this.endDate);
    }
    
    queryParams.append('sort_by', this.sortBy);
    queryParams.append('sort_order', this.sortOrder);

    const url = `http://localhost:3000/api/attendance${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    console.log('📋 Loading attendance with URL:', url);

    this.http.get<any>(url, { headers })
      .subscribe({
        next: (response) => {
          this.attendance = response.attendance || [];
          this.filteredAttendance = [...this.attendance]; // Add this line
          this.stats = response.stats || null;
          this.isLoading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to load attendance records';
          this.attendance = [];
          this.filteredAttendance = []; // Add this line
          this.isLoading = false;
        }
      });
  }
 filterAttendanceLocally(): void {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredAttendance = [...this.attendance];
      return;
    }
    
    const search = this.searchTerm.toLowerCase().trim();
    
    this.filteredAttendance = this.attendance.filter(record => {
      const playerName = (record.player_name || '').toLowerCase();
      const eventTitle = (record.event_title || '').toLowerCase();
      const status = (record.status || '').toLowerCase();
      
      return playerName.includes(search) || 
             eventTitle.includes(search) ||
             status.includes(search);
    });
  }

  loadAttendanceSummary(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>('http://localhost:3000/api/attendance/summary', { headers })
      .subscribe({
        next: (response) => {
          this.attendanceSummary = response.summary || [];
          console.log('📊 Attendance summary loaded:', this.attendanceSummary.length);
        },
        error: (error) => {
          console.error('❌ Error loading attendance summary:', error);
        }
      });
  }

  // Modal methods
  openAddAttendanceModal(): void {
    this.showAddAttendanceModal = true;
    this.attendanceForm.reset();
    this.attendanceForm.patchValue({
      event_type: 'training',
      event_date: new Date().toISOString().split('T')[0],
      status: 'present'
    });
    this.error = '';
    this.successMessage = '';
  }

  closeAddAttendanceModal(): void {
    this.showAddAttendanceModal = false;
    this.attendanceForm.reset();
  }

  openEditModal(attendance: Attendance): void {
    this.editingAttendance = attendance;
    this.showEditModal = true;
    
    this.attendanceForm.patchValue({
      player_id: attendance.player_id,
      session_id: attendance.session_id,
      event_type: attendance.event_type,
      event_date: attendance.event_date,
      event_title: attendance.event_title,
      status: attendance.status,
      check_in_time: attendance.check_in_time?.slice(11, 16), // HH:MM format
      check_out_time: attendance.check_out_time?.slice(11, 16),
      notes: attendance.notes
    });

    this.error = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingAttendance = null;
    this.attendanceForm.reset();
  }

  openBulkAttendanceModal(): void {
    this.showBulkAttendanceModal = true;
    this.bulkAttendanceForm.reset();
    this.bulkAttendanceForm.patchValue({
      event_type: 'training',
      event_date: new Date().toISOString().split('T')[0],
      default_status: 'present'
    });
    this.selectedPlayerIds = [];
    this.error = '';
    this.successMessage = '';
  }

  closeBulkAttendanceModal(): void {
    this.showBulkAttendanceModal = false;
    this.bulkAttendanceForm.reset();
    this.selectedPlayerIds = [];
  }

  openSummaryModal(): void {
    this.showSummaryModal = true;
    this.loadAttendanceSummary();
  }

  closeSummaryModal(): void {
    this.showSummaryModal = false;
  }

  openDeleteModal(attendance: Attendance): void {
    this.attendanceToDelete = attendance;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.attendanceToDelete = null;
  }

  // CRUD operations
  saveAttendance(): void {
    if (this.attendanceForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.editingAttendance) {
      this.updateAttendance();
    } else {
      this.createAttendance();
    }
  }

  createAttendance(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const attendanceData = {
      ...this.attendanceForm.value,
      // Convert time inputs to full datetime if provided
      check_in_time: this.attendanceForm.value.check_in_time ? 
        `${this.attendanceForm.value.event_date}T${this.attendanceForm.value.check_in_time}:00` : null,
      check_out_time: this.attendanceForm.value.check_out_time ? 
        `${this.attendanceForm.value.event_date}T${this.attendanceForm.value.check_out_time}:00` : null
    };

    this.http.post('http://localhost:3000/api/attendance', attendanceData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Attendance record created successfully!';
          this.closeAddAttendanceModal();
          this.loadAttendance();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create attendance record';
          this.isSubmitting = false;
        }
      });
  }

  updateAttendance(): void {
    if (!this.editingAttendance) return;
    
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const attendanceData = {
      status: this.attendanceForm.value.status,
      check_in_time: this.attendanceForm.value.check_in_time ? 
        `${this.attendanceForm.value.event_date}T${this.attendanceForm.value.check_in_time}:00` : null,
      check_out_time: this.attendanceForm.value.check_out_time ? 
        `${this.attendanceForm.value.event_date}T${this.attendanceForm.value.check_out_time}:00` : null,
      notes: this.attendanceForm.value.notes
    };

    this.http.put(`http://localhost:3000/api/attendance/${this.editingAttendance.id}`, attendanceData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Attendance record updated successfully!';
          this.closeEditModal();
          this.loadAttendance();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to update attendance record';
          this.isSubmitting = false;
        }
      });
  }

  deleteAttendance(): void {
    if (!this.attendanceToDelete) return;
    
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.delete(`http://localhost:3000/api/attendance/${this.attendanceToDelete.id}`, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Attendance record deleted successfully!';
          this.closeDeleteModal();
          this.loadAttendance();
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to delete attendance record';
          this.closeDeleteModal();
        }
      });
  }

  createBulkAttendance(): void {
    if (this.bulkAttendanceForm.invalid || this.selectedPlayerIds.length === 0) {
      this.error = 'Please select at least one player and fill in all required fields.';
      return;
    }

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const bulkData = {
      ...this.bulkAttendanceForm.value,
      player_ids: this.selectedPlayerIds
    };

    this.http.post('http://localhost:3000/api/attendance/bulk', bulkData, { headers })
      .subscribe({
        next: (response: any) => {
          this.successMessage = `Successfully created ${response.success_count} attendance records!`;
          this.closeBulkAttendanceModal();
          this.loadAttendance();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create bulk attendance';
          this.isSubmitting = false;
        }
      });
  }

  // Bulk selection methods
  toggleSelectAllPlayers(event: any): void {
    const isChecked = event.target.checked;
    this.selectedPlayerIds = isChecked ? this.players.map(p => p.id) : [];
    
    // Update all checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="player-"]');
    checkboxes.forEach((checkbox: any) => {
      checkbox.checked = isChecked;
    });
  }

  togglePlayerSelection(playerId: number, event: any): void {
    const isChecked = event.target.checked;
    
    if (isChecked) {
      if (!this.selectedPlayerIds.includes(playerId)) {
        this.selectedPlayerIds.push(playerId);
      }
    } else {
      this.selectedPlayerIds = this.selectedPlayerIds.filter(id => id !== playerId);
    }
    
    // Update bulk form
    this.bulkAttendanceForm.patchValue({
      player_ids: this.selectedPlayerIds
    });
  }

  // Helper methods
  getStatusLabel(status: string): string {
    const statusObj = this.attendanceStatuses.find(s => s.value === status);
    return statusObj ? statusObj.label : status;
  }

  getStatusColor(status: string): string {
    const statusObj = this.attendanceStatuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'secondary';
  }

  getStatusIcon(status: string): string {
    const statusObj = this.attendanceStatuses.find(s => s.value === status);
    return statusObj ? statusObj.icon : 'fas fa-question';
  }

  getEventTypeLabel(type: string): string {
    const typeObj = this.eventTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  getEventTypeIcon(type: string): string {
    const typeObj = this.eventTypes.find(t => t.value === type);
    return typeObj ? typeObj.icon : 'fas fa-calendar';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    return new Date(timeString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDuration(minutes: number): string {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  // Search and filter methods
  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadAttendance();
    }, 300);
  }

  onFilterChange(): void {
    this.loadAttendance();
  }

   clearFilters(): void {
    this.searchTerm = '';
    this.selectedStatus = '';
    this.selectedEventType = '';
    this.selectedPlayer = '';
    this.startDate = '';
    this.endDate = '';
    this.filteredAttendance = [...this.attendance]; // Add this line
    this.loadAttendance();
  }

  // View mode methods
  onViewModeChange(mode: 'list' | 'cards' | 'summary' | 'calendar'): void {
    this.viewMode = mode;
    
    if (mode === 'summary') {
      this.loadAttendanceSummary();
    }
  }

  // Form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.attendanceForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.attendanceForm.controls).forEach(key => {
      const control = this.attendanceForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
getAverageAttendanceRate(): number {
  if (!this.attendanceSummary || this.attendanceSummary.length === 0) {
    return 0;
  }
  
  const total = this.attendanceSummary.reduce((sum, s) => sum + (s.attendance_rate || 0), 0);
  return Number((total / this.attendanceSummary.length).toFixed(1));
}

// Calculate total sessions across all players
getTotalSessions(): number {
  if (!this.attendanceSummary || this.attendanceSummary.length === 0) {
    return 0;
  }
  
  return this.attendanceSummary.reduce((sum, s) => sum + s.total_sessions, 0);
}

// Get count of players needing attention (attendance < 60%)
getPlayersNeedingAttention(): number {
  if (!this.attendanceSummary || this.attendanceSummary.length === 0) {
    return 0;
  }
  
  return this.attendanceSummary.filter(s => (s.attendance_rate || 0) < 60).length;
}

// Filter methods for performance categories
getExcellentPerformers(): AttendanceSummary[] {
  if (!this.attendanceSummary) return [];
  return this.attendanceSummary.filter(s => s.attendance_rate >= 90);
}

getGoodPerformers(): AttendanceSummary[] {
  if (!this.attendanceSummary) return [];
  return this.attendanceSummary.filter(s => s.attendance_rate >= 60 && s.attendance_rate < 90);
}

getPlayersNeedingAttentionList(): AttendanceSummary[] {
  if (!this.attendanceSummary) return [];
  return this.attendanceSummary.filter(s => s.attendance_rate < 60);
}

// Format numbers safely
formatNumber(value: number | undefined | null): string {
  return (value || 0).toFixed(1);
}

// Safe array length check
safeArrayLength(array: any[] | undefined | null): number {
  return array ? array.length : 0;
}
  logout(): void {
    this.authService.logout();
  }
}