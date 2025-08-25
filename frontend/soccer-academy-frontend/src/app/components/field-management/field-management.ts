import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Field,FieldBooking, FieldStats } from '../../models/field.model';

@Component({
  selector: 'app-field-management',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './field-management.html',
  styleUrls: ['./field-management.scss']
})
export class FieldManagementComponent implements OnInit {
  fields: Field[] = [];
  stats: FieldStats | null = null;
  minDate: string = new Date().toISOString().split('T')[0];
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
  
  // Modal states
  showAddFieldModal = false;
  showEditModal = false;
  showViewModal = false;
  showDeleteModal = false;
  
  selectedField: Field | null = null;
  editingField: Field | null = null;
  fieldToDelete: Field | null = null;
  viewingField: Field | null = null;
  
  // Forms
  fieldForm!: FormGroup;
  
  // Search and filter
  searchTerm = '';
  selectedFieldType = '';
  selectedSurfaceType = '';
  selectedLocation = '';
  isIndoorFilter = '';
  hasLightingFilter = '';
  minCapacity = '';
  maxCapacity = '';
  sortBy = 'name';
  sortOrder = 'asc';
  searchTimeout: any;
  showAdvancedFilters = false;
availableLocations: string[] = [];
selectedStatus = '';
filterIndoor = false;
filterLighting = false;
filterParking = false;
filterChangingRooms = false;
minRate = '';
maxRate = '';

  // View modes
  viewMode: 'list' | 'cards' | 'grid' = 'cards';
  showBookingModal = false;
selectedFieldForBooking: Field | null = null;
bookingForm!: FormGroup;
fieldBookings: FieldBooking[] = [];
availabilityCheck: any = null;
isCheckingAvailability = false;

bookingTypes = [
  { value: 'training', label: 'Training Session', icon: 'fas fa-dumbbell', color: 'primary' },
  { value: 'match', label: 'Match', icon: 'fas fa-futbol', color: 'danger' },
  { value: 'tournament', label: 'Tournament', icon: 'fas fa-trophy', color: 'warning' },
  { value: 'maintenance', label: 'Maintenance', icon: 'fas fa-tools', color: 'secondary' },
  { value: 'event', label: 'Special Event', icon: 'fas fa-star', color: 'success' },
  { value: 'rental', label: 'External Rental', icon: 'fas fa-handshake', color: 'info' }
];
  // Field type and surface options
  fieldTypes = [
    { value: 'full_size', label: 'Full Size (11v11)' },
    { value: 'three_quarter', label: 'Three Quarter Size' },
    { value: 'half_size', label: 'Half Size (7v7/9v9)' },
    { value: 'indoor_court', label: 'Indoor Court' },
    { value: 'training_area', label: 'Training Area' }
  ];
  
  surfaceTypes = [
    { value: 'natural_grass', label: 'Natural Grass' },
    { value: 'artificial_turf', label: 'Artificial Turf' },
    { value: 'indoor_surface', label: 'Indoor Surface' },
    { value: 'concrete', label: 'Concrete' },
    { value: 'sand', label: 'Sand' }
  ];

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {}



  initializeForm(): void {
    this.fieldForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      field_type: ['full_size', [Validators.required]],
      surface_type: ['natural_grass', [Validators.required]],
      dimensions: [''],
      capacity: ['22', [Validators.required, Validators.min(1), Validators.max(100)]],
      location: [''],
      address: [''],
      facilities: [''],
      equipment_available: [''],
      hourly_rate: ['0.00', [Validators.min(0)]],
      is_indoor: [false],
      has_lighting: [false],
      has_parking: [true],
      has_changing_rooms: [true],
      maintenance_notes: ['']
    });
    this.bookingForm = this.formBuilder.group({
    booking_title: ['', [Validators.required, Validators.minLength(3)]],
    booking_type: ['training', [Validators.required]],
    booking_date: [new Date().toISOString().split('T')[0], [Validators.required]],
    start_time: ['', [Validators.required]],
    end_time: ['', [Validators.required]],
    notes: [''],
    recurring_type: ['none'],
    recurring_end_date: ['']
  });

    this.bookingForm.get('start_time')?.valueChanges.subscribe(() => this.checkAvailabilityIfReady());
  this.bookingForm.get('end_time')?.valueChanges.subscribe(() => this.checkAvailabilityIfReady());
  this.bookingForm.get('booking_date')?.valueChanges.subscribe(() => this.checkAvailabilityIfReady());
  }
openBookingModal(field: Field): void {
  this.selectedFieldForBooking = field;
  this.showBookingModal = true;
  this.bookingForm.reset();
  this.bookingForm.patchValue({
    booking_type: 'training',
    booking_date: new Date().toISOString().split('T')[0]
  });
  this.availabilityCheck = null;
  this.loadFieldBookings(field.id);
  this.error = '';
  this.successMessage = '';
}
closeBookingModal(): void {
  this.showBookingModal = false;
  this.selectedFieldForBooking = null;
  this.bookingForm.reset();
  this.fieldBookings = [];
  this.availabilityCheck = null;
}
loadFieldBookings(fieldId: number): void {
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Get bookings for the next 7 days
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const url = `http://localhost:3000/api/field-bookings/field/${fieldId}?start_date=${today.toISOString().split('T')[0]}&end_date=${nextWeek.toISOString().split('T')[0]}`;

  this.http.get<any>(url, { headers })
    .subscribe({
      next: (response) => {
        this.fieldBookings = response.bookings || [];
        console.log('📅 Field bookings loaded:', this.fieldBookings.length);
      },
      error: (error) => {
        console.error('❌ Error loading field bookings:', error);
      }
    });
}
checkAvailabilityIfReady(): void {
  const formValue = this.bookingForm.value;
  if (formValue.booking_date && formValue.start_time && formValue.end_time && this.selectedFieldForBooking) {
    this.checkAvailability();
  }
}

checkAvailability(): void {
  if (!this.selectedFieldForBooking) return;
  
  const formValue = this.bookingForm.value;
  if (!formValue.booking_date || !formValue.start_time || !formValue.end_time) return;

  this.isCheckingAvailability = true;
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const params = new URLSearchParams({
    field_id: this.selectedFieldForBooking.id.toString(),
    date: formValue.booking_date,
    start_time: formValue.start_time,
    end_time: formValue.end_time
  });

  this.http.get<any>(`http://localhost:3000/api/field-bookings/availability?${params}`, { headers })
    .subscribe({
      next: (response) => {
        this.availabilityCheck = response;
        this.isCheckingAvailability = false;
        console.log('🔍 Availability check:', response);
      },
      error: (error) => {
        console.error('❌ Error checking availability:', error);
        this.isCheckingAvailability = false;
      }
    });
}
createBooking(): void {
  if (this.bookingForm.invalid || !this.selectedFieldForBooking) {
    this.markFormGroupTouched();
    return;
  }

  if (this.availabilityCheck && !this.availabilityCheck.is_available) {
    this.error = 'Selected time slot is not available. Please choose a different time.';
    return;
  }

  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const bookingData = {
    field_id: this.selectedFieldForBooking.id,
    ...this.bookingForm.value
  };

  this.http.post('http://localhost:3000/api/field-bookings', bookingData, { headers })
    .subscribe({
      next: (response) => {
        this.successMessage = 'Field booked successfully!';
        this.closeBookingModal();
        this.loadFields(); // Refresh fields to update availability status
        this.isSubmitting = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to create booking';
        this.isSubmitting = false;
      }
    });
}

// Helper methods for booking
getBookingTypeLabel(type: string): string {
  const bookingType = this.bookingTypes.find(bt => bt.value === type);
  return bookingType ? bookingType.label : type;
}

getBookingTypeIcon(type: string): string {
  const bookingType = this.bookingTypes.find(bt => bt.value === type);
  return bookingType ? bookingType.icon : 'fas fa-calendar';
}

getBookingTypeColor(type: string): string {
  const bookingType = this.bookingTypes.find(bt => bt.value === type);
  return bookingType ? bookingType.color : 'secondary';
}

formatTimeSlot(startTime: string, endTime: string): string {
  return `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
}

formatTime(time: string): string {
  if (!time) return '';
  return new Date(`1970-01-01T${time}`).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

getDuration(startTime: string, endTime: string): number {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
}

selectAlternativeSlot(slot: any): void {
  this.bookingForm.patchValue({
    start_time: slot.start_time,
    end_time: slot.end_time
  });
  this.checkAvailability();
}
// In field-management.component.ts, update loadFields method:
loadFields(): void {
  this.isLoading = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Build comprehensive query parameters
  let queryParams = new URLSearchParams();
  
  if (this.searchTerm && this.searchTerm.trim() !== '') {
    queryParams.append('search', this.searchTerm.trim());
  }
  
  if (this.selectedFieldType && this.selectedFieldType !== '') {
    queryParams.append('field_type', this.selectedFieldType);
  }
  
  if (this.selectedSurfaceType && this.selectedSurfaceType !== '') {
    queryParams.append('surface_type', this.selectedSurfaceType);
  }
  
  if (this.selectedLocation && this.selectedLocation !== '') {
    queryParams.append('location', this.selectedLocation);
  }
  
  if (this.selectedStatus && this.selectedStatus !== '') {
    queryParams.append('availability_status', this.selectedStatus);
  }
  
  // Advanced filters
  if (this.filterIndoor) {
    queryParams.append('is_indoor', 'true');
  }
  
  if (this.filterLighting) {
    queryParams.append('has_lighting', 'true');
  }
  
  if (this.filterParking) {
    queryParams.append('has_parking', 'true');
  }
  
  if (this.filterChangingRooms) {
    queryParams.append('has_changing_rooms', 'true');
  }
  
  if (this.minCapacity && this.minCapacity !== '') {
    queryParams.append('min_capacity', this.minCapacity);
  }
  
  if (this.maxCapacity && this.maxCapacity !== '') {
    queryParams.append('max_capacity', this.maxCapacity);
  }
  
  if (this.minRate && this.minRate !== '') {
    queryParams.append('min_rate', this.minRate);
  }
  
  if (this.maxRate && this.maxRate !== '') {
    queryParams.append('max_rate', this.maxRate);
  }
  
  queryParams.append('sort_by', this.sortBy);
  queryParams.append('sort_order', this.sortOrder);

  const url = `http://localhost:3000/api/fields${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
  
  console.log('🔍 Loading fields with advanced filters:', url);

  this.http.get<any>(url, { headers })
    .subscribe({
      next: (response) => {
        this.fields = response.fields || [];
        this.stats = response.stats || null;
        this.availableLocations = response.filter_options?.locations || [];
        this.isLoading = false;
        console.log('🏟️ Loaded fields:', this.fields.length);
        console.log('📊 Available locations:', this.availableLocations);
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to load fields';
        this.fields = [];
        this.isLoading = false;
        console.error('❌ Error loading fields:', error);
      }
    });
}
toggleAdvancedFilters(): void {
  this.showAdvancedFilters = !this.showAdvancedFilters;
  console.log('🔧 Advanced filters:', this.showAdvancedFilters ? 'shown' : 'hidden');
}

hasActiveFilters(): boolean {
  return !!(
    this.searchTerm ||
    this.selectedFieldType ||
    this.selectedSurfaceType ||
    this.selectedLocation ||
    this.selectedStatus ||
    this.filterIndoor ||
    this.filterLighting ||
    this.filterParking ||
    this.filterChangingRooms ||
    this.minCapacity ||
    this.maxCapacity ||
    this.minRate ||
    this.maxRate
  );
}

clearSearch(): void {
  this.searchTerm = '';
  this.onFilterChange();
}

clearAllFilters(): void {
  this.searchTerm = '';
  this.selectedFieldType = '';
  this.selectedSurfaceType = '';
  this.selectedLocation = '';
  this.selectedStatus = '';
  this.filterIndoor = false;
  this.filterLighting = false;
  this.filterParking = false;
  this.filterChangingRooms = false;
  this.minCapacity = '';
  this.maxCapacity = '';
  this.minRate = '';
  this.maxRate = '';
  this.onFilterChange();
  console.log('🧹 All filters cleared');
}

toggleSortOrder(): void {
  this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
  this.onFilterChange();
  console.log('🔄 Sort order changed to:', this.sortOrder);
}

// Enhanced search change with better debouncing
onSearchChange(): void {
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    console.log('🔍 Search term changed:', this.searchTerm);
    this.loadFields();
  }, 500); // Increased delay for better UX
}



// Update the existing clearFilters method
clearFilters(): void {
  this.clearAllFilters();
}

// Add these helper methods for advanced filtering
getActiveFiltersCount(): number {
  let count = 0;
  if (this.searchTerm) count++;
  if (this.selectedFieldType) count++;
  if (this.selectedSurfaceType) count++;
  if (this.selectedLocation) count++;
  if (this.selectedStatus) count++;
  if (this.filterIndoor) count++;
  if (this.filterLighting) count++;
  if (this.filterParking) count++;
  if (this.filterChangingRooms) count++;
  if (this.minCapacity) count++;
  if (this.maxCapacity) count++;
  if (this.minRate) count++;
  if (this.maxRate) count++;
  return count;
}

getFilterSummary(): string {
  const activeCount = this.getActiveFiltersCount();
  if (activeCount === 0) return 'No filters applied';
  if (activeCount === 1) return '1 filter applied';
  return `${activeCount} filters applied`;
}

// Enhanced field status methods
getAvailabilityStatusIcon(status: string): string {
  const icons = {
    'available': 'fas fa-check-circle',
    'occupied': 'fas fa-users',
    'maintenance': 'fas fa-tools'
  };
  return icons[status as keyof typeof icons] || 'fas fa-question-circle';
}

getAvailabilityStatusColor(status: string): string {
  const colors = {
    'available': 'success',
    'occupied': 'danger',
    'maintenance': 'warning'
  };
  return colors[status as keyof typeof colors] || 'secondary';
}

// Save filter preferences to localStorage
saveFilterPreferences(): void {
  const filters = {
    selectedFieldType: this.selectedFieldType,
    selectedSurfaceType: this.selectedSurfaceType,
    selectedLocation: this.selectedLocation,
    showAdvancedFilters: this.showAdvancedFilters,
    sortBy: this.sortBy,
    sortOrder: this.sortOrder
  };
  localStorage.setItem('fieldFilters', JSON.stringify(filters));
  console.log('💾 Filter preferences saved');
}

// Load filter preferences from localStorage
loadFilterPreferences(): void {
  const saved = localStorage.getItem('fieldFilters');
  if (saved) {
    try {
      const filters = JSON.parse(saved);
      this.selectedFieldType = filters.selectedFieldType || '';
      this.selectedSurfaceType = filters.selectedSurfaceType || '';
      this.selectedLocation = filters.selectedLocation || '';
      this.showAdvancedFilters = filters.showAdvancedFilters || false;
      this.sortBy = filters.sortBy || 'name';
      this.sortOrder = filters.sortOrder || 'asc';
      console.log('📥 Filter preferences loaded');
    } catch (error) {
      console.error('❌ Error loading filter preferences:', error);
    }
  }
}

// Update ngOnInit to load preferences
ngOnInit(): void {
  this.initializeForm();
  this.loadFilterPreferences(); // Load saved preferences
  this.loadFields();
}

// Save preferences when filters change
onFilterChange(): void {
  console.log('🔧 Filters changed, reloading...');
  this.saveFilterPreferences(); // Save current state
  this.loadFields();
}
  // Modal methods
  openAddFieldModal(): void {
    this.showAddFieldModal = true;
    this.fieldForm.reset();
    this.fieldForm.patchValue({
      field_type: 'full_size',
      surface_type: 'natural_grass',
      capacity: 22,
      hourly_rate: 0.00,
      is_indoor: false,
      has_lighting: false,
      has_parking: true,
      has_changing_rooms: true
    });
    this.error = '';
    this.successMessage = '';
  }

  closeAddFieldModal(): void {
    this.showAddFieldModal = false;
    this.fieldForm.reset();
  }

  openEditModal(field: Field): void {
    this.editingField = field;
    this.showEditModal = true;
    
    this.fieldForm.patchValue({
      name: field.name,
      description: field.description,
      field_type: field.field_type,
      surface_type: field.surface_type,
      dimensions: field.dimensions,
      capacity: field.capacity,
      location: field.location,
      address: field.address,
      facilities: field.facilities,
      equipment_available: field.equipment_available,
      hourly_rate: field.hourly_rate,
      is_indoor: field.is_indoor,
      has_lighting: field.has_lighting,
      has_parking: field.has_parking,
      has_changing_rooms: field.has_changing_rooms,
      maintenance_notes: field.maintenance_notes
    });

    this.error = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingField = null;
    this.fieldForm.reset();
  }

  openViewModal(field: Field): void {
    this.viewingField = field;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewingField = null;
  }

  openDeleteModal(field: Field): void {
    this.fieldToDelete = field;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.fieldToDelete = null;
  }

  saveField(): void {
  if (this.fieldForm.invalid) {
    this.markFormGroupTouched();
    console.log('❌ Form is invalid:', this.fieldForm.errors);
    return;
  }

  console.log('💾 Saving field, isEditing:', this.editingField ? true : false);

  if (this.editingField) {
    this.updateField();
  } else {
    this.createField();
  }
}
  createField(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const fieldData = this.fieldForm.value;

    this.http.post('http://localhost:3000/api/fields', fieldData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Field created successfully!';
          this.closeAddFieldModal();
          this.loadFields();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create field';
          this.isSubmitting = false;
        }
      });
  }

updateField(): void {
  if (!this.editingField) {
    console.error('❌ No editing field set');
    return;
  }
  
  console.log('🔄 Updating field:', this.editingField.id);
  console.log('📝 Form data:', this.fieldForm.value);
  
  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const fieldData = {
    ...this.fieldForm.value,
    // Ensure booleans are properly converted
    is_indoor: !!this.fieldForm.value.is_indoor,
    has_lighting: !!this.fieldForm.value.has_lighting,
    has_parking: !!this.fieldForm.value.has_parking,
    has_changing_rooms: !!this.fieldForm.value.has_changing_rooms,
    // Ensure numbers are properly converted
    capacity: parseInt(this.fieldForm.value.capacity) || 22,
    hourly_rate: parseFloat(this.fieldForm.value.hourly_rate) || 0.00
  };

  console.log('📤 Sending update data:', fieldData);

  this.http.put(`http://localhost:3000/api/fields/${this.editingField.id}`, fieldData, { headers })
    .subscribe({
      next: (response: any) => {
        console.log('✅ Update response:', response);
        this.successMessage = 'Field updated successfully!';
        this.closeEditModal();
        this.loadFields(); // Refresh the fields list
        this.isSubmitting = false;
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          this.successMessage = '';
        }, 3000);
      },
      error: (error) => {
        console.error('❌ Update error:', error);
        console.error('❌ Error details:', error.error);
        this.error = error.error?.error || 'Failed to update field';
        this.isSubmitting = false;
        
        // Clear error message after 5 seconds
        setTimeout(() => {
          this.error = '';
        }, 5000);
      }
    });
}
debugEdit(field: Field): void {
  console.log('🐛 Debug Edit - Field data:', field);
  console.log('🐛 Opening edit modal...');
  this.openEditModal(field);
}

debugDelete(field: Field): void {
  console.log('🐛 Debug Delete - Field data:', field);
  if (confirm(`Are you sure you want to delete ${field.name}?`)) {
    this.fieldToDelete = field;
    this.deleteField();
  }
}
deleteField(): void {
  if (!this.fieldToDelete) return;
  
  console.log('🗑️ Attempting to delete field:', this.fieldToDelete.id);
  
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  this.http.delete(`http://localhost:3000/api/fields/${this.fieldToDelete.id}`, { headers })
    .subscribe({
      next: (response: any) => {
        console.log('✅ Delete response:', response);
        this.successMessage = 'Field deleted successfully!';
        this.closeDeleteModal();
        this.loadFields();
        setTimeout(() => { this.successMessage = ''; }, 3000);
      },
      error: (error) => {
        console.error('❌ Delete error:', error);
        console.error('❌ Error status:', error.status);
        console.error('❌ Error message:', error.error);
        console.error('❌ Full error object:', JSON.stringify(error.error, null, 2));
        
        // Show the actual error message from backend
        this.error = error.error?.error || error.error?.message || 'Failed to delete field';
        this.closeDeleteModal();
        setTimeout(() => { this.error = ''; }, 5000);
      }
    });
}

  // Helper methods
  getFieldTypeLabel(type: string): string {
    const fieldType = this.fieldTypes.find(ft => ft.value === type);
    return fieldType ? fieldType.label : type;
  }

  getSurfaceTypeLabel(type: string): string {
    const surfaceType = this.surfaceTypes.find(st => st.value === type);
    return surfaceType ? surfaceType.label : type;
  }

  getFieldTypeIcon(type: string): string {
    const icons = {
      'full_size': 'fas fa-futbol',
      'three_quarter': 'fas fa-dot-circle',
      'half_size': 'fas fa-circle',
      'indoor_court': 'fas fa-home',
      'training_area': 'fas fa-running'
    };
    return icons[type as keyof typeof icons] || 'fas fa-map-marker';
  }

  getFieldStatusColor(field: Field): string {
    if (field.availability_status === 'occupied') return 'danger';
    if (field.availability_status === 'maintenance') return 'warning';
    return 'success';
  }

  getFieldStatusIcon(field: Field): string {
    if (field.availability_status === 'occupied') return 'fas fa-users';
    if (field.availability_status === 'maintenance') return 'fas fa-tools';
    return 'fas fa-check-circle';
  }






  // Form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.fieldForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.fieldForm.controls).forEach(key => {
      const control = this.fieldForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}