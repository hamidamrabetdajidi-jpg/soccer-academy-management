import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container-fluid py-4">
      <div class="row">
        <div class="col-lg-4">
          <!-- Profile Card -->
          <div class="card shadow-sm">
            <div class="card-body text-center">
              <div class="mb-3">
                <img 
                  [src]="userProfile?.avatar_url || 'assets/images/default-avatar.png'" 
                  class="rounded-circle" 
                  width="150" 
                  height="150"
                  alt="Profile"
                >
              </div>
              <h4>{{ userProfile?.first_name }} {{ userProfile?.last_name }}</h4>
              <p class="text-muted">{{ userProfile?.email }}</p>
              <span [class]="'badge bg-' + getRoleBadgeClass(userProfile?.role)">
                {{ getRoleDisplay(userProfile?.role) }}
              </span>
              
              <hr>
              
              <div class="text-start">
                <p><strong>Username:</strong> {{ userProfile?.username }}</p>
                <p><strong>Phone:</strong> {{ userProfile?.phone || 'Not provided' }}</p>
                <p><strong>Joined:</strong> {{ userProfile?.created_at | date:'mediumDate' }}</p>
                <p><strong>Last Login:</strong> {{ userProfile?.last_login | date:'medium' }}</p>
              </div>
            </div>
          </div>

          <!-- Quick Stats -->
          <div class="card shadow-sm mt-3" *ngIf="isCoachOrAdmin()">
            <div class="card-header bg-primary text-white">
              <h6 class="mb-0">Quick Stats</h6>
            </div>
            <div class="card-body">
              <div class="row text-center">
                <div class="col-6 mb-3">
                  <div class="fw-bold text-primary">{{ stats?.players_managed || 0 }}</div>
                  <small>Players Managed</small>
                </div>
                <div class="col-6 mb-3">
                  <div class="fw-bold text-success">{{ stats?.sessions_conducted || 0 }}</div>
                  <small>Sessions Conducted</small>
                </div>
                <div class="col-6">
                  <div class="fw-bold text-info">{{ stats?.evaluations_done || 0 }}</div>
                  <small>Evaluations Done</small>
                </div>
                <div class="col-6">
                  <div class="fw-bold text-warning">{{ stats?.teams_assigned || 0 }}</div>
                  <small>Teams Assigned</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="col-lg-8">
          <!-- Update Profile Form -->
          <div class="card shadow-sm">
            <div class="card-header bg-white">
              <ul class="nav nav-tabs card-header-tabs">
                <li class="nav-item">
                  <a 
                    class="nav-link" 
                    [class.active]="activeTab === 'profile'"
                    (click)="activeTab = 'profile'"
                  >
                    Profile Information
                  </a>
                </li>
                <li class="nav-item">
                  <a 
                    class="nav-link" 
                    [class.active]="activeTab === 'password'"
                    (click)="activeTab = 'password'"
                  >
                    Change Password
                  </a>
                </li>
                <li class="nav-item" *ngIf="authService.hasPermission('view_settings')">
                  <a 
                    class="nav-link" 
                    [class.active]="activeTab === 'preferences'"
                    (click)="activeTab = 'preferences'"
                  >
                    Preferences
                  </a>
                </li>
              </ul>
            </div>
            
            <div class="card-body">
              <!-- Success/Error Messages -->
              <div *ngIf="successMessage" class="alert alert-success alert-dismissible fade show" role="alert">
                {{ successMessage }}
                <button type="button" class="btn-close" (click)="successMessage = ''"></button>
              </div>
              
              <div *ngIf="error" class="alert alert-danger alert-dismissible fade show" role="alert">
                {{ error }}
                <button type="button" class="btn-close" (click)="error = ''"></button>
              </div>

              <!-- Profile Tab -->
              <div *ngIf="activeTab === 'profile'">
                <form [formGroup]="profileForm" (ngSubmit)="updateProfile()">
                  <div class="row g-3">
                    <div class="col-md-6">
                      <label class="form-label">First Name</label>
                      <input type="text" class="form-control" formControlName="first_name">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Last Name</label>
                      <input type="text" class="form-control" formControlName="last_name">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Email</label>
                      <input type="email" class="form-control" formControlName="email">
                    </div>
                    <div class="col-md-6">
                      <label class="form-label">Phone</label>
                      <input type="tel" class="form-control" formControlName="phone">
                    </div>
                    <div class="col-12">
                      <label class="form-label">Bio</label>
                      <textarea class="form-control" formControlName="bio" rows="3"></textarea>
                    </div>
                    <div class="col-12">
                      <button type="submit" class="btn btn-primary" [disabled]="isSubmitting">
                        <span *ngIf="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                        Update Profile
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <!-- Password Tab -->
              <div *ngIf="activeTab === 'password'">
                <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                  <div class="row g-3">
                    <div class="col-12">
                      <label class="form-label">Current Password</label>
                      <input type="password" class="form-control" formControlName="current_password">
                    </div>
                    <div class="col-12">
                      <label class="form-label">New Password</label>
                      <input type="password" class="form-control" formControlName="new_password">
                      <small class="text-muted">Minimum 8 characters</small>
                    </div>
                    <div class="col-12">
                      <label class="form-label">Confirm New Password</label>
                      <input type="password" class="form-control" formControlName="confirm_password">
                    </div>
                    <div class="col-12">
                      <button type="submit" class="btn btn-primary" [disabled]="isSubmitting || passwordForm.invalid">
                        <span *ngIf="isSubmitting" class="spinner-border spinner-border-sm me-2"></span>
                        Change Password
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <!-- Preferences Tab -->
              <div *ngIf="activeTab === 'preferences'">
                <form [formGroup]="preferencesForm" (ngSubmit)="updatePreferences()">
                  <div class="row g-3">
                    <div class="col-12">
                      <label class="form-label">Email Notifications</label>
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" formControlName="email_notifications">
                        <label class="form-check-label">
                          Receive email notifications for important updates
                        </label>
                      </div>
                    </div>
                    <div class="col-12">
                      <label class="form-label">Default View</label>
                      <select class="form-select" formControlName="default_view">
                        <option value="cards">Cards View</option>
                        <option value="list">List View</option>
                        <option value="grid">Grid View</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <label class="form-label">Language</label>
                      <select class="form-select" formControlName="language">
                        <option value="en">English</option>
                        <option value="fr">French</option>
                        <option value="es">Spanish</option>
                      </select>
                    </div>
                    <div class="col-12">
                      <button type="submit" class="btn btn-primary" [disabled]="isSubmitting">
                        Save Preferences
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .nav-tabs .nav-link {
      cursor: pointer;
    }
    .nav-tabs .nav-link.active {
      font-weight: 600;
    }
  `]
})
export class ProfileComponent implements OnInit {
  userProfile: any = {};
  stats: any = {};
  activeTab = 'profile';
  isSubmitting = false;
  error = '';
  successMessage = '';

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  preferencesForm!: FormGroup;

  constructor(
    private formBuilder: FormBuilder,
    private http: HttpClient,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadUserProfile();
    if (this.isCoachOrAdmin()) {
      this.loadUserStats();
    }
  }

  initializeForms(): void {
    this.profileForm = this.formBuilder.group({
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      bio: ['']
    });

    this.passwordForm = this.formBuilder.group({
      current_password: ['', Validators.required],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.preferencesForm = this.formBuilder.group({
      email_notifications: [true],
      default_view: ['cards'],
      language: ['en']
    });
  }

  passwordMatchValidator(form: FormGroup) {
    const newPassword = form.get('new_password');
    const confirmPassword = form.get('confirm_password');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  loadUserProfile(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get('http://localhost:3000/api/profile', { headers })
      .subscribe({
        next: (response: any) => {
          this.userProfile = response.user;
          this.profileForm.patchValue({
            first_name: response.user.first_name,
            last_name: response.user.last_name,
            email: response.user.email,
            phone: response.user.phone,
            bio: response.user.bio
          });
          
          if (response.preferences) {
            this.preferencesForm.patchValue(response.preferences);
          }
        },
        error: (error) => {
          this.error = 'Failed to load profile';
        }
      });
  }

  loadUserStats(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get('http://localhost:3000/api/profile/stats', { headers })
      .subscribe({
        next: (response: any) => {
          this.stats = response.stats;
        },
        error: (error) => {
          console.error('Failed to load stats:', error);
        }
      });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) return;

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.put('http://localhost:3000/api/profile', this.profileForm.value, { headers })
      .subscribe({
        next: (response: any) => {
          this.successMessage = 'Profile updated successfully!';
          this.userProfile = { ...this.userProfile, ...this.profileForm.value };
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to update profile';
          this.isSubmitting = false;
        }
      });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const passwordData = {
      current_password: this.passwordForm.value.current_password,
      new_password: this.passwordForm.value.new_password
    };

    this.http.post('http://localhost:3000/api/profile/change-password', passwordData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Password changed successfully!';
          this.passwordForm.reset();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to change password';
          this.isSubmitting = false;
        }
      });
  }

  updatePreferences(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.put('http://localhost:3000/api/profile/preferences', this.preferencesForm.value, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Preferences updated successfully!';
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to update preferences';
          this.isSubmitting = false;
        }
      });
  }

  getRoleDisplay(role: string): string {
    const roleMap: any = {
      'super_admin': 'Super Admin',
      'admin': 'Administrator',
      'coach': 'Coach',
      'staff': 'Staff Member',
      'parent': 'Parent',
      'player': 'Player'
    };
    return roleMap[role] || role;
  }

  getRoleBadgeClass(role: string): string {
    const classMap: any = {
      'super_admin': 'danger',
      'admin': 'primary',
      'coach': 'success',
      'staff': 'info',
      'parent': 'warning',
      'player': 'secondary'
    };
    return classMap[role] || 'secondary';
  }

  isCoachOrAdmin(): boolean {
    return this.authService.isAdmin() || this.authService.isCoach();
  }
}