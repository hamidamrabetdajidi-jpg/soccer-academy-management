import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { SidebarComponent } from '../Shared/sidebar/sidebar.component';
import { FooterComponent  } from '../Shared/footer/footer.component';
@Component({
  selector: 'app-training-sessions',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule,SidebarComponent,FooterComponent],
  templateUrl: './training-sessions.html',
  styleUrls: ['./training-sessions.scss']
})
export class TrainingSessionsComponent implements OnInit {
  // Data arrays
  sessions: any[] = [];
  players: any[] = [];
  teams: any[] = [];
  fields: any[] = [];
   showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showAttendanceModal = false;
  showSessionAttendanceModal = false; // Make sure this exists
  
  // Attendance data
  sessionAttendance: any[] = [];
  sessionAttendanceStats: any = null;
  unmarkedPlayers: any[] = [];
  // Loading states
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
  
  // Modal states

  
  // Selected items
  editingSession: any = null;
  sessionToDelete: any = null;
  selectedSessionForAttendance: any = null;
  
  // Forms
  sessionForm!: FormGroup;
  attendanceForm!: FormGroup;
  
  // Attendance data

  selectedPlayerIds: number[] = [];
  
  // Search and filter
  searchTerm = '';
  selectedType = '';
  selectedLocation = '';
  startDate = '';
  endDate = '';
  sortBy = 'session_date';
  sortOrder = 'desc';
  searchTimeout: any;
  
  // Session types
  sessionTypes = [
    { value: 'training', label: 'Training', icon: 'fas fa-dumbbell' },
    { value: 'tactical', label: 'Tactical', icon: 'fas fa-chess' },
    { value: 'fitness', label: 'Fitness', icon: 'fas fa-heartbeat' },
    { value: 'scrimmage', label: 'Scrimmage', icon: 'fas fa-futbol' },
    { value: 'recovery', label: 'Recovery', icon: 'fas fa-spa' }
  ];

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.initializeAttendanceForms();
    this.loadPlayers();
    this.loadTrainingSessions();
  }

  initializeForms(): void {
    this.sessionForm = this.formBuilder.group({
      title: ['', [Validators.required]],
      description: [''],
      session_date: ['', [Validators.required]], // This is the key field
      start_time: [''],
      end_time: [''],
      field_id: [''],
      coach_id: [''],
      category_id: [''],
      team_id: [''],
      session_type: ['training', [Validators.required]],
      objectives: [''],
      drills: [''],
      equipment_needed: [''],
      max_participants: [''],
      is_mandatory: [false],
      weather_conditions: [''],
      notes: ['']
    });
  }

  initializeAttendanceForms(): void {
    this.attendanceForm = this.formBuilder.group({
      player_ids: [[]],
      default_status: ['present', [Validators.required]]
    });
  }

  // Load methods
  loadTrainingSessions(): void {
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
    
    if (this.selectedType && this.selectedType !== '') {
      queryParams.append('session_type', this.selectedType);
    }
    
    if (this.selectedLocation && this.selectedLocation !== '') {
      queryParams.append('location', this.selectedLocation);
    }
    
    if (this.startDate && this.startDate !== '') {
      queryParams.append('start_date', this.startDate);
    }
    
    if (this.endDate && this.endDate !== '') {
      queryParams.append('end_date', this.endDate);
    }
    
    queryParams.append('sort_by', this.sortBy);
    queryParams.append('sort_order', this.sortOrder);

    const url = `http://localhost:3000/api/training-sessions${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    
    console.log('🏃 Loading training sessions with URL:', url);

    this.http.get<any>(url, { headers })
      .subscribe({
        next: (response) => {
          this.sessions = response.sessions || [];
          this.isLoading = false;
          console.log('🏃 Loaded training sessions:', this.sessions.length);
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to load training sessions';
          this.sessions = [];
          this.isLoading = false;
          console.error('❌ Error loading training sessions:', error);
        }
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
          console.log('👥 Players loaded for attendance:', this.players.length);
        },
        error: (error) => {
          console.error('❌ Error loading players:', error);
          this.players = [];
        }
      });
  }

  // Modal methods
  openAddModal(): void {
    this.showAddModal = true;
    this.sessionForm.reset();
    this.sessionForm.patchValue({
      session_type: 'training',
      session_date: new Date().toISOString().split('T')[0] // Set today's date
    });
    this.error = '';
    this.successMessage = '';
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.sessionForm.reset();
  }

  openEditModal(session: any): void {
    this.editingSession = session;
    this.showEditModal = true;
    
    // Populate form with existing session data
    this.sessionForm.patchValue({
      title: session.title,
      description: session.description,
      session_date: session.session_date?.split('T')[0], // Convert to date format
      start_time: session.start_time?.slice(11, 16), // HH:MM format
      end_time: session.end_time?.slice(11, 16), // HH:MM format
      field_id: session.field_id,
      coach_id: session.coach_id,
      category_id: session.category_id,
      team_id: session.team_id,
      session_type: session.session_type,
      objectives: session.objectives,
      drills: session.drills,
      equipment_needed: session.equipment_needed,
      max_participants: session.max_participants,
      is_mandatory: session.is_mandatory,
      weather_conditions: session.weather_conditions,
      notes: session.notes
    });

    this.error = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingSession = null;
    this.sessionForm.reset();
  }

  openDeleteModal(session: any): void {
    this.sessionToDelete = session;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.sessionToDelete = null;
  }

  // CRUD operations
  saveSession(): void {
    if (this.sessionForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.editingSession) {
      this.updateSession();
    } else {
      this.createSession();
    }
  }

  createSession(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const sessionData = {
      ...this.sessionForm.value,
      // Combine date and time if provided
      start_time: this.sessionForm.value.start_time ? 
        `${this.sessionForm.value.session_date}T${this.sessionForm.value.start_time}:00` : null,
      end_time: this.sessionForm.value.end_time ? 
        `${this.sessionForm.value.session_date}T${this.sessionForm.value.end_time}:00` : null
    };

    this.http.post('http://localhost:3000/api/training-sessions', sessionData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Training session created successfully!';
          this.closeAddModal();
          this.loadTrainingSessions();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create training session';
          this.isSubmitting = false;
        }
      });
  }

  updateSession(): void {
    if (!this.editingSession) return;
    
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const sessionData = {
      ...this.sessionForm.value,
      // Combine date and time if provided
      start_time: this.sessionForm.value.start_time ? 
        `${this.sessionForm.value.session_date}T${this.sessionForm.value.start_time}:00` : null,
      end_time: this.sessionForm.value.end_time ? 
        `${this.sessionForm.value.session_date}T${this.sessionForm.value.end_time}:00` : null
    };

    this.http.put(`http://localhost:3000/api/training-sessions/${this.editingSession.id}`, sessionData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Training session updated successfully!';
          this.closeEditModal();
          this.loadTrainingSessions();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to update training session';
          this.isSubmitting = false;
        }
      });
  }

  deleteSession(): void {
    if (!this.sessionToDelete) return;
    
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.delete(`http://localhost:3000/api/training-sessions/${this.sessionToDelete.id}`, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Training session deleted successfully!';
          this.closeDeleteModal();
          this.loadTrainingSessions();
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to delete training session';
          this.closeDeleteModal();
        }
      });
  }

  // Attendance methods
  openAttendanceModal(session: any): void {
    console.log('📋 Opening attendance modal for session:', session.title);
    this.selectedSessionForAttendance = session;
    this.showAttendanceModal = true;
    this.selectedPlayerIds = [];
    
    this.attendanceForm.reset();
    this.attendanceForm.patchValue({
      default_status: 'present',
      player_ids: []
    });
    
    this.error = '';
    this.successMessage = '';
  }

  closeAttendanceModal(): void {
    this.showAttendanceModal = false;
    this.selectedSessionForAttendance = null;
    this.selectedPlayerIds = [];
    this.attendanceForm.reset();
  }
createSessionAttendance(): void {
  console.log('📋 Creating session attendance...');
  console.log('📋 Form valid:', this.attendanceForm.valid);
  console.log('📋 Selected players:', this.selectedPlayerIds);
  console.log('📋 Session:', this.selectedSessionForAttendance);
  
  if (this.attendanceForm.invalid) {
    console.log('❌ Form is invalid');
    this.error = 'Please fill in all required fields.';
    return;
  }
  
  if (!this.selectedSessionForAttendance) {
    console.log('❌ No session selected');
    this.error = 'No training session selected.';
    return;
  }
  
  if (this.selectedPlayerIds.length === 0) {
    console.log('❌ No players selected');
    this.error = 'Please select at least one player.';
    return;
  }

  this.isSubmitting = true;
  this.error = '';
  
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const attendanceData = {
    player_ids: this.selectedPlayerIds,
    default_status: this.attendanceForm.value.default_status || 'present'
  };
  
  console.log('📋 Sending attendance data:', attendanceData);
  const url = `http://localhost:3000/api/training-sessions/${this.selectedSessionForAttendance.id}/attendance`;
  console.log('📋 POST URL:', url);

  this.http.post(url, attendanceData, { headers })
    .subscribe({
      next: (response: any) => {
        console.log('✅ Attendance creation response:', response);
        
        let message = `Successfully processed attendance for ${response.success_count} players!`;
        if (response.created_count > 0) {
          message += ` (${response.created_count} new records created`;
        }
        if (response.updated_count > 0) {
          message += response.created_count > 0 ? `, ${response.updated_count} updated)` : ` (${response.updated_count} records updated)`;
        } else if (response.created_count > 0) {
          message += ')';
        }
        
        this.successMessage = message;
        this.closeAttendanceModal();
        this.isSubmitting = false;
        
        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (error) => {
        console.error('❌ Attendance creation error:', error);
        this.error = error.error?.error || 'Failed to create session attendance';
        this.isSubmitting = false;
      }
    });
}
  // Player selection methods
  toggleSelectAllPlayers(event: any): void {
    const isChecked = event.target.checked;
    this.selectedPlayerIds = isChecked ? this.players.map(p => p.id) : [];
    
    this.attendanceForm.patchValue({
      player_ids: this.selectedPlayerIds
    });
    
    const checkboxes = document.querySelectorAll('input[type="checkbox"][id^="session-player-"]');
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
    
    this.attendanceForm.patchValue({
      player_ids: this.selectedPlayerIds
    });
  }

  // Helper methods
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

  getSessionTypeLabel(type: string): string {
    const typeObj = this.sessionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  }

  getSessionTypeIcon(type: string): string {
    const typeObj = this.sessionTypes.find(t => t.value === type);
    return typeObj ? typeObj.icon : 'fas fa-dumbbell';
  }

  // Form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.sessionForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.sessionForm.controls).forEach(key => {
      const control = this.sessionForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  // Search and filter methods
  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadTrainingSessions();
    }, 300);
  }

  onFilterChange(): void {
    this.loadTrainingSessions();
  }
openSessionAttendanceModal(session: any): void {
  this.selectedSessionForAttendance = session;
  this.showSessionAttendanceModal = true;
  this.loadSessionAttendance(session.id);
}

closeSessionAttendanceModal(): void {
  this.showSessionAttendanceModal = false;
  this.selectedSessionForAttendance = null;
  this.sessionAttendance = [];
  this.sessionAttendanceStats = null;
  this.unmarkedPlayers = [];
}

loadSessionAttendance(sessionId: number): void {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  this.http.get<any>(`http://localhost:3000/api/training-sessions/${sessionId}/attendance`, { headers })
    .subscribe({
      next: (response) => {
        this.sessionAttendance = response.attendance || [];
        this.sessionAttendanceStats = response.stats || null;
        this.unmarkedPlayers = response.unmarked_players || [];
        console.log('📊 Session attendance loaded:', this.sessionAttendance.length);
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to load session attendance';
        console.error('❌ Error loading session attendance:', error);
      }
    });
}

// Add these helper methods for attendance status
getStatusLabel(status: string): string {
  const statusMap: { [key: string]: string } = {
    'present': 'Present',
    'absent': 'Absent', 
    'late': 'Late',
    'excused': 'Excused',
    'partial': 'Partial'
  };
  return statusMap[status] || status;
}

getStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    'present': 'success',
    'absent': 'danger',
    'late': 'warning', 
    'excused': 'info',
    'partial': 'secondary'
  };
  return colorMap[status] || 'secondary';
}
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedType = '';
    this.selectedLocation = '';
    this.startDate = '';
    this.endDate = '';
    this.loadTrainingSessions();
  }

  logout(): void {
    this.authService.logout();
  }
}