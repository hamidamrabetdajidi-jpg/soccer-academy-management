import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Player, Category, CreatePlayerRequest } from '../../models/player.model';
import { Router } from '@angular/router';
import { SidebarComponent } from '../Shared/sidebar/sidebar.component';
import { FooterComponent  } from '../Shared/footer/footer.component';
@Component({
  selector: 'app-player-management',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule,SidebarComponent,FooterComponent],
  templateUrl: './player-management.html',
  styleUrls: ['./player-management.scss']
})
export class PlayerManagementComponent implements OnInit {
  players: Player[] = [];
  categories: Category[] = [];
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
  selectedFile: File | null = null;
photoPreview: string | null = null;
isUploading = false
  // Modal states
  showAddPlayerModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showViewModal = false;
  editingPlayer: Player | null = null;
  playerToDelete: Player | null = null;
  viewingPlayer: Player | null = null;
  
  // Form
  playerForm!: FormGroup;
  
  // Search and filter
  searchTerm = '';
  selectedCategory = '';
  selectedGender = '';
  searchTimeout: any;

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService,
     private router: Router 
  ) {}

ngOnInit(): void {
  console.log('PlayerManagement component initialized');
  this.initializeForm();
  this.loadCategories();
  this.loadPlayers();
}
  initializeForm(): void {
    this.playerForm = this.formBuilder.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      date_of_birth: ['', [Validators.required]],
      gender: ['', [Validators.required]],
      
      // Address
      street: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
      postal_code: ['', [Validators.required]],
      country: ['Morocco', [Validators.required]],
      
      phone: [''],
      email: ['', [Validators.email]],
      category_id: ['', [Validators.required]],
      tshirt_number: [''],
      medical_info: [''],
      
      // Emergency contact
      emergency_contact_name: ['', [Validators.required]],
      emergency_contact_relationship: ['', [Validators.required]],
      emergency_contact_phone: ['', [Validators.required]],
      emergency_contact_email: ['', [Validators.email]]
    });
  }
loadCategories(): void {
  console.log('Loading categories...');
  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  this.http.get<any>('http://localhost:3000/api/categories', { headers })
    .subscribe({
      next: (response) => {
        console.log('Categories loaded successfully:', response);
        this.categories = response.categories || [];
        console.log('Categories array:', this.categories);
      },
      error: (error) => {
        console.error('Error loading categories:', error);
        this.categories = [];
      }
    });
}

loadPlayers(): void {
  console.log('Loading players with filters:', {
    search: this.searchTerm,
    category: this.selectedCategory,
    gender: this.selectedGender
  });
  
  this.isLoading = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Build query parameters
  let params = new URLSearchParams();
  
  if (this.searchTerm && this.searchTerm.trim() !== '') {
    params.append('search', this.searchTerm.trim());
  }
  
  if (this.selectedCategory && this.selectedCategory !== '') {
    params.append('category', this.selectedCategory);
  }
  
  if (this.selectedGender && this.selectedGender !== '') {
    params.append('gender', this.selectedGender);
  }

  const url = `http://localhost:3000/api/players${params.toString() ? '?' + params.toString() : ''}`;
  console.log('API URL:', url);

  this.http.get<any>(url, { headers })
    .subscribe({
      next: (response) => {
        console.log('Players loaded successfully:', response.players?.length || 0, 'players');
        this.players = response.players || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading players:', error);
        this.error = error.error?.error || 'Failed to load players';
        this.players = [];
        this.isLoading = false;
      }
    });
}

  openAddPlayerModal(): void {
    this.showAddPlayerModal = true;
    this.playerForm.reset();
    this.playerForm.patchValue({ country: 'Morocco' });
    this.error = '';
    this.successMessage = '';
  }



 // Update the savePlayer method to handle both create and edit
savePlayer(): void {
  if (this.playerForm.invalid) {
    this.markFormGroupTouched();
    return;
  }

  if (this.editingPlayer) {
    this.updatePlayer();
  } else {
    this.createPlayer();
  }
}
// Rename the existing method to createPlayer
createPlayer(): void {
  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const formData = this.playerForm.value;
  const playerData: CreatePlayerRequest = {
    first_name: formData.first_name,
    last_name: formData.last_name,
    date_of_birth: formData.date_of_birth,
    gender: formData.gender,
    address: {
      street: formData.street,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      country: formData.country
    },
    phone: formData.phone,
    email: formData.email,
    category_id: parseInt(formData.category_id),
    tshirt_number: formData.tshirt_number ? parseInt(formData.tshirt_number) : undefined,
    medical_info: formData.medical_info,
    emergency_contact: {
      name: formData.emergency_contact_name,
      relationship: formData.emergency_contact_relationship,
      phone: formData.emergency_contact_phone,
      email: formData.emergency_contact_email
    }
  };

  this.http.post('http://localhost:3000/api/players', playerData, { headers })
    .subscribe({
      next: (response: any) => {
        console.log('Player created:', response);
        
        // If photo was selected, upload it
        if (this.selectedFile && response.player?.id) {
          this.uploadPhotoForNewPlayer(response.player.id);
        } else {
          this.successMessage = 'Player registered successfully!';
          this.closeAddPlayerModal();
          this.loadPlayers();
          this.isSubmitting = false;
        }
      },
      error: (error) => {
        console.error('Create player error:', error);
        this.error = error.error?.error || 'Failed to register player';
        this.isSubmitting = false;
      }
    });
}

uploadPhotoForNewPlayer(playerId: number): void {
  if (!this.selectedFile) {
    this.successMessage = 'Player registered successfully!';
    this.closeAddPlayerModal();
    this.loadPlayers();
    this.isSubmitting = false;
    return;
  }

  const formData = new FormData();
  formData.append('photo', this.selectedFile);

  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type for FormData
  });

  this.http.post(`http://localhost:3000/api/players/${playerId}/photo`, formData, { headers })
    .subscribe({
      next: (response: any) => {
        this.successMessage = 'Player registered successfully with photo!';
        this.closeAddPlayerModal();
        this.loadPlayers();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Photo upload error:', error);
        // Player was created but photo failed - still show success
        this.successMessage = 'Player registered successfully, but photo upload failed';
        this.closeAddPlayerModal();
        this.loadPlayers();
        this.isSubmitting = false;
      }
    });
}
closeAddPlayerModal(): void {
  this.showAddPlayerModal = false;
  this.playerForm.reset();
  this.removePhoto(); // Clean up photo preview
}
  viewPlayer(player: Player): void {
    this.viewingPlayer = player;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.viewingPlayer = null;
  }
editPlayer(player: Player): void {
  console.log('Editing player:', player);
  this.editingPlayer = player;
  this.showEditModal = true;
  
  // Clear any previous photo selection
  this.selectedFile = null;
  this.photoPreview = null;
  
  // Populate form with player data
  this.playerForm.patchValue({
    first_name: player.first_name,
    last_name: player.last_name,
    date_of_birth: player.date_of_birth,
    gender: player.gender,
    street: player.address?.street || '',
    city: player.address?.city || '',
    state: player.address?.state || '',
    postal_code: player.address?.postal_code || '',
    country: player.address?.country || 'Morocco',
    phone: player.phone || '',
    email: player.email || '',
    category_id: player.category_id,
    tshirt_number: player.tshirt_number || '',
    medical_info: player.medical_info || '',
    emergency_contact_name: player.emergency_contact?.name || '',
    emergency_contact_relationship: player.emergency_contact?.relationship || '',
    emergency_contact_phone: player.emergency_contact?.phone || '',
    emergency_contact_email: player.emergency_contact?.email || ''
  });

  this.error = '';
  this.successMessage = '';
}

updatePlayer(): void {
  if (!this.editingPlayer) return;

  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const formData = this.playerForm.value;
  const playerData = {
    first_name: formData.first_name,
    last_name: formData.last_name,
    date_of_birth: formData.date_of_birth,
    gender: formData.gender,
    address: {
      street: formData.street,
      city: formData.city,
      state: formData.state,
      postal_code: formData.postal_code,
      country: formData.country
    },
    phone: formData.phone,
    email: formData.email,
    category_id: parseInt(formData.category_id),
    tshirt_number: formData.tshirt_number ? parseInt(formData.tshirt_number) : null,
    medical_info: formData.medical_info,
    emergency_contact: {
      name: formData.emergency_contact_name,
      relationship: formData.emergency_contact_relationship,
      phone: formData.emergency_contact_phone,
      email: formData.emergency_contact_email
    }
  };

  this.http.put(`http://localhost:3000/api/players/${this.editingPlayer.id}`, playerData, { headers })
    .subscribe({
      next: (response) => {
        this.successMessage = 'Player updated successfully!';
        this.closeEditModal();
        this.loadPlayers();
        this.isSubmitting = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to update player';
        this.isSubmitting = false;
      }
    });
}
closeEditModal(): void {
  this.showEditModal = false;
  this.editingPlayer = null;
  this.selectedFile = null;
  this.photoPreview = null;
  this.playerForm.reset();
  this.initializeForm();
}
confirmDelete(player: Player): void {
console.log('Confirming delete for player:', player);
  this.playerToDelete = player;
  this.showDeleteModal = true;
}

closeDeleteModal(): void {
  this.showDeleteModal = false;
  this.playerToDelete = null;
}
onSearchChange(): void {
  clearTimeout(this.searchTimeout);
  this.searchTimeout = setTimeout(() => {
    console.log('Search term changed:', this.searchTerm);
    this.loadPlayers();
  }, 300); // 300ms delay for better performance
}
onCategoryChange(): void {
  console.log('Category filter changed:', this.selectedCategory);
  this.loadPlayers();
}

onGenderChange(): void {
  console.log('Gender filter changed:', this.selectedGender);
  this.loadPlayers();
}
filterPlayers(): void {
  if (!this.searchTerm && !this.selectedCategory && !this.selectedGender) {
    // If no filters, reload all players
    this.loadPlayers();
    return;
  }

  // Apply local filtering for better performance
  this.loadPlayers();
}
clearFilters(): void {
  console.log('Clearing all filters');
  this.searchTerm = '';
  this.selectedCategory = '';
  this.selectedGender = '';
  this.loadPlayers();
}
deletePlayer(): void {
  if (!this.playerToDelete) return;

  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  this.http.delete(`http://localhost:3000/api/players/${this.playerToDelete.id}`, { headers })
    .subscribe({
      next: (response) => {
        this.successMessage = 'Player deleted successfully!';
        this.closeDeleteModal();
        this.loadPlayers();
        this.isSubmitting = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to delete player';
        this.isSubmitting = false;
      }
    });
}
onFileSelected(event: any): void {
  const file = event.target.files[0];
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.error = 'Please select a valid image file';
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.error = 'Image file must be less than 2MB';
      return;
    }
    
    this.selectedFile = file;
  }
}
uploadPhoto(playerId: number): void {
  if (!this.selectedFile) return;

  this.isUploading = true;
  const formData = new FormData();
  formData.append('photo', this.selectedFile);

  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
    // Don't set Content-Type for FormData
  });

  this.http.post(`http://localhost:3000/api/players/${playerId}/photo`, formData, { headers })
    .subscribe({
      next: (response: any) => {
        this.successMessage = 'Photo uploaded successfully!';
        this.loadPlayers(); // Refresh to show new photo
        this.isUploading = false;
        this.selectedFile = null;
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to upload photo';
        this.isUploading = false;
      }
    });
}
// Add photo upload functionality

  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  }

  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.playerForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.playerForm.controls).forEach(key => {
      const control = this.playerForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
onFileSelectedForRegistration(event: any): void {
  const file = event.target.files[0];
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.error = 'Please select a valid image file';
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.error = 'Image file must be less than 2MB';
      return;
    }
    
    this.selectedFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Clear any previous errors
    this.error = '';
  }
}

removePhoto(): void {
  this.selectedFile = null;
  this.photoPreview = null;
}
getPhotoUrl(photoUrl: string): string {

  if (!photoUrl) return '';
  
  // If it's already a full URL, return as is
  if (photoUrl.startsWith('http')) {
    return photoUrl;
  }
  
  // If it starts with /, add the base URL
  if (photoUrl.startsWith('/')) {
        console.log('Image loaded successfully for player:', photoUrl);

    return `http://localhost:3000${photoUrl}`;
  }
  
  // Otherwise, construct the full path
  return `http://localhost:3000/uploads/players/${photoUrl}`;
}
onImageLoad(player: Player): void {
  console.log('Image loaded successfully for player:', player.id);
}
onImageError(event: any, player: Player): void {
  console.log('Image failed to load for player:', player.id, event.target.src);
  // Hide the image and show default avatar
  event.target.style.display = 'none';
}
onFileSelectedForEdit(event: any): void {
  const file = event.target.files[0];
  if (file) {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.error = 'Please select a valid image file';
      return;
    }
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this.error = 'Image file must be less than 2MB';
      return;
    }
    
    this.selectedFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Clear any previous errors
    this.error = '';
  }
}
updatePlayerPhoto(): void {
  if (!this.selectedFile || !this.editingPlayer) return;

  this.isUploading = true;
  const formData = new FormData();
  formData.append('photo', this.selectedFile);

  const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  this.http.post(`http://localhost:3000/api/players/${this.editingPlayer.id}/photo`, formData, { headers })
    .subscribe({
      next: (response: any) => {
        this.successMessage = 'Photo updated successfully!';
        
        // Update the editing player's photo URL
        if (this.editingPlayer) {
          this.editingPlayer.photo_url = response.photo_url;
        }
        
        // Clear file selection and preview
        this.selectedFile = null;
        this.photoPreview = null;
        
        this.isUploading = false;
        
        // Reload players to show updated photo
        this.loadPlayers();
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to upload photo';
        this.isUploading = false;
      }
    });
}
exportPlayerCard(player: Player): void {
  // Create a printable player card
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const photoUrl = player.photo_url ? this.getPhotoUrl(player.photo_url) : '';
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Player Card - ${player.first_name} ${player.last_name}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: #f8f9fa;
          }
          .player-card { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 10px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .card-header { 
            background: linear-gradient(135deg, #2c5530, #5cb85c); 
            color: white; 
            padding: 20px; 
            text-align: center;
          }
          .card-body { 
            padding: 20px; 
          }
          .player-photo { 
            width: 120px; 
            height: 120px; 
            border-radius: 50%; 
            border: 4px solid white;
            object-fit: cover;
            margin-bottom: 10px;
          }
          .player-name { 
            font-size: 24px; 
            font-weight: bold; 
            margin: 10px 0;
          }
          .reg-number { 
            font-size: 14px; 
            opacity: 0.9;
          }
          .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-top: 20px;
          }
          .info-item { 
            border-bottom: 1px solid #eee; 
            padding-bottom: 8px;
          }
          .info-label { 
            font-weight: bold; 
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
          }
          .info-value { 
            margin-top: 2px;
            font-size: 14px;
          }
          .badge { 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px;
            font-weight: bold;
          }
          .badge-success { background: #28a745; color: white; }
          .badge-warning { background: #ffc107; color: #212529; }
          .footer { 
            text-align: center; 
            padding: 15px; 
            background: #f8f9fa; 
            font-size: 12px; 
            color: #666;
          }
          @media print {
            body { margin: 0; background: white; }
            .player-card { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="player-card">
          <div class="card-header">
            ${photoUrl ? `<img src="${photoUrl}" alt="Player Photo" class="player-photo">` : '<div class="player-photo" style="background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; margin: 0 auto;"><span style="font-size: 40px;">👤</span></div>'}
            <div class="player-name">${player.first_name} ${player.last_name}</div>
            <div class="reg-number">${player.registration_number}</div>
          </div>
          <div class="card-body">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Age</div>
                <div class="info-value">${this.calculateAge(player.date_of_birth)} years old</div>
              </div>
              <div class="info-item">
                <div class="info-label">Category</div>
                <div class="info-value"><span class="badge badge-success">${this.getCategoryName(player.category_id)}</span></div>
              </div>
              <div class="info-item">
                <div class="info-label">Gender</div>
                <div class="info-value">${player.gender === 'M' ? 'Male' : 'Female'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">T-Shirt Number</div>
                <div class="info-value">${player.tshirt_number ? `<span class="badge badge-warning">#${player.tshirt_number}</span>` : 'Not assigned'}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Registration Date</div>
                <div class="info-value">${new Date(player.registration_date).toLocaleDateString()}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Emergency Contact</div>
                <div class="info-value">${player.emergency_contact?.name} (${player.emergency_contact?.relationship})</div>
              </div>
            </div>
          </div>
          <div class="footer">
            Soccer Academy Management System - Generated on ${new Date().toLocaleDateString()}
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}
// Export Methods
exportToExcel(): void {
  const data = this.prepareExportData();
  this.downloadFile(data, 'players.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  this.successMessage = 'Players exported to Excel successfully!';
}
exportToCSV(): void {
  const data = this.prepareCSVData();
  this.downloadFile(data, 'players.csv', 'text/csv');
  this.successMessage = 'Players exported to CSV successfully!';
}

exportToPDF(): void {
  this.generatePDF();
  this.successMessage = 'Players exported to PDF successfully!';
}

// printPlayerList(): void {
//   this.printPlayers();
// }
prepareExportData(): any[] {
  return this.players.map(player => ({
    'Registration Number': player.registration_number,
    'First Name': player.first_name,
    'Last Name': player.last_name,
    'Date of Birth': player.date_of_birth,
    'Age': this.calculateAge(player.date_of_birth),
    'Gender': player.gender === 'M' ? 'Male' : 'Female',
    'Category': this.getCategoryName(player.category_id),
    'T-Shirt Number': player.tshirt_number || 'Not assigned',
    'Phone': player.phone || '',
    'Email': player.email || '',
    'Street Address': player.address?.street || '',
    'City': player.address?.city || '',
    'State/Province': player.address?.state || '',
    'Postal Code': player.address?.postal_code || '',
    'Country': player.address?.country || '',
    'Emergency Contact Name': player.emergency_contact?.name || '',
    'Emergency Contact Relationship': player.emergency_contact?.relationship || '',
    'Emergency Contact Phone': player.emergency_contact?.phone || '',
    'Emergency Contact Email': player.emergency_contact?.email || '',
    'Medical Information': player.medical_info || '',
    'Registration Date': player.registration_date,
    'Status': player.is_active ? 'Active' : 'Inactive'
  }));
}

prepareCSVData(): string {
  const data = this.prepareExportData();
  if (data.length === 0) return '';

  // Get headers
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csv = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Escape commas and quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csv += values.join(',') + '\n';
  });
  
  return csv;
}
downloadFile(data: any, filename: string, type: string): void {
  let content: string;
  
  if (type.includes('csv')) {
    content = data;
  } else {
    // For Excel, we'll create a simple HTML table that Excel can read
    const exportData = this.prepareExportData();
    content = this.createExcelContent(exportData);
  }
  
  const blob = new Blob([content], { type: type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
createExcelContent(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  
  let html = `
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
      </style>
    </head>
    <body>
      <h2>Soccer Academy - Players List</h2>
      <p>Generated on: ${new Date().toLocaleDateString()}</p>
      <table>
        <thead>
          <tr>
  `;
  
  headers.forEach(header => {
    html += `<th>${header}</th>`;
  });
  
  html += `
          </tr>
        </thead>
        <tbody>
  `;
  
  data.forEach(row => {
    html += '<tr>';
    headers.forEach(header => {
      html += `<td>${row[header]}</td>`;
    });
    html += '</tr>';
  });
  
  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;
  
  return html;
}

generatePDF(): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    const data = this.prepareExportData();
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Soccer Academy - Players List</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px;
            font-size: 12px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 20px;
            border-bottom: 2px solid #2c5530;
            padding-bottom: 10px;
          }
          .logo { 
            color: #2c5530; 
            font-size: 24px; 
            font-weight: bold;
          }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 6px; 
            text-align: left;
            font-size: 10px;
          }
          th { 
            background-color: #2c5530; 
            color: white; 
            font-weight: bold;
          }
          tr:nth-child(even) { 
            background-color: #f9f9f9; 
          }
          .footer { 
            margin-top: 20px; 
            text-align: center; 
            font-size: 10px; 
            color: #666;
          }
          @media print {
            body { margin: 0; }
            .header { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">⚽ Soccer Academy Management</div>
          <h2>Players List Report</h2>
          <p>Generated on: ${new Date().toLocaleDateString()} | Total Players: ${data.length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Reg. #</th>
              <th>Name</th>
              <th>Age</th>
              <th>Category</th>
              <th>Jersey</th>
              <th>Phone</th>
              <th>Emergency Contact</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `);
    
    data.forEach(player => {
      printWindow.document.write(`
        <tr>
          <td>${player['Registration Number']}</td>
          <td>${player['First Name']} ${player['Last Name']}</td>
          <td>${player['Age']}</td>
          <td>${player['Category']}</td>
          <td>${player['T-Shirt Number']}</td>
          <td>${player['Phone']}</td>
          <td>${player['Emergency Contact Name']} (${player['Emergency Contact Relationship']})</td>
          <td>${player['Status']}</td>
        </tr>
      `);
    });
    
    printWindow.document.write(`
          </tbody>
        </table>
        
        <div class="footer">
          <p>Soccer Academy Management System - Confidential Document</p>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

printPlayerList(): void {
  this.generatePDF();
}
getCurrentTime(): Date {
  return new Date();
}
evaluatePlayer(player: Player): void {
  // Navigate to valuation page with player pre-selected
  this.router.navigate(['/valuations'], { 
    queryParams: { playerId: player.id, playerName: `${player.first_name} ${player.last_name}` }
  });
}
  logout(): void {
    this.authService.logout();
  }
}