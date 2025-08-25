import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule,FormsModule],
  templateUrl: './user-management.html',
  styleUrls: ['./user-management.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
  
  // Modal states
  showAddUserModal = false;
  showEditModal = false;
  showDeleteModal = false;
  editingUser: User | null = null;
  userToDelete: User | null = null;
  
  // Form
  userForm!: FormGroup;
  showPasswordModal = false;
  userForPasswordChange: User | null = null;
  passwordForm!: FormGroup;

  searchTerm = '';
  selectedRole = '';
  selectedStatus = '';
  sortField = 'created_at';
  sortDirection = 'desc';

  searchTimeout: any; // Add this to fix the error
  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializePasswordForm(); // Add this
    this.loadUsers();

  }

  initializeForm(): void {
    this.userForm = this.formBuilder.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      username: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      role: ['', [Validators.required]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      is_active: [true]
    });
  }
  initializePasswordForm(): void {
    this.passwordForm = this.formBuilder.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }
  
  passwordMatchValidator(form: FormGroup) {
  const newPassword = form.get('newPassword');
  const confirmPassword = form.get('confirmPassword');
  
  if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
    confirmPassword.setErrors({ mismatch: true });
  } else {
    confirmPassword?.setErrors(null);
  }
  return null;
}

closePasswordModal(): void {
  this.showPasswordModal = false;
  this.userForPasswordChange = null;
  this.passwordForm.reset();
}
changePassword(): void {
  if (this.passwordForm.invalid || !this.userForPasswordChange) return;

  this.isSubmitting = true;
  const token = localStorage.getItem('token');
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const passwordData = {
    currentPassword: this.passwordForm.value.currentPassword,
    newPassword: this.passwordForm.value.newPassword
  };

  this.http.post(`http://localhost:3000/api/users/${this.userForPasswordChange.id}/change-password`, passwordData, { headers })
    .subscribe({
      next: (response) => {
        this.successMessage = 'Password changed successfully!';
        this.closePasswordModal();
        this.isSubmitting = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to change password';
        this.isSubmitting = false;
      }
    });
  }
openPasswordModal(user: User): void {
  this.userForPasswordChange = user;
  this.showPasswordModal = true;
  this.passwordForm.reset();
}
loadUsers(): void {
  this.isLoading = true;
  const token = localStorage.getItem('token');
  
  if (!token) {
    this.error = 'No authentication token found';
    this.isLoading = false;
    return;
  }

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  // Build query parameters
  let params = new URLSearchParams();
  if (this.searchTerm) params.append('search', this.searchTerm);
  if (this.selectedRole) params.append('role', this.selectedRole);
  if (this.selectedStatus) params.append('status', this.selectedStatus);
  params.append('sort', this.sortField);
  params.append('order', this.sortDirection);

  const url = `http://localhost:3000/api/users?${params.toString()}`;

  this.http.get<any>(url, { headers })
    .subscribe({
      next: (response) => {
        this.users = response.users;
        this.isLoading = false;
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to load users';
        this.isLoading = false;
      }
    });
}
 onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadUsers();
    }, 300);
  }

clearFilters(): void {
  this.searchTerm = '';
  this.selectedRole = '';
  this.selectedStatus = '';
  this.loadUsers();
}

sortBy(field: string): void {
  if (this.sortField === field) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    this.sortField = field;
    this.sortDirection = 'asc';
  }
  this.loadUsers();
}

  openAddUserModal(): void {
    this.showAddUserModal = true;
    this.userForm.reset();
    this.userForm.patchValue({ is_active: true });
    this.error = '';
    this.successMessage = '';
    
    // Add password validation for new users
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  closeAddUserModal(): void {
    this.showAddUserModal = false;
    this.userForm.reset();
  }

  editUser(user: User): void {
    this.editingUser = user;
    this.showEditModal = true;
    
    // Populate form with user data
    this.userForm.patchValue({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      role: user.role,
      phone: user.phone,
      is_active: user.is_active,
      password: ''
    });

    // Remove password requirement for editing
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingUser = null;
    this.userForm.reset();
    this.initializeForm();
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.editingUser) {
      this.updateUser();
    } else {
      this.createUser();
    }
  }

  createUser(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const userData = this.userForm.value;

    this.http.post('http://localhost:3000/api/auth/register', userData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'User created successfully!';
          this.closeAddUserModal();
          this.loadUsers();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create user';
          this.isSubmitting = false;
        }
      });
  }

  updateUser(): void {
    if (!this.editingUser) return;

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const userData = this.userForm.value;
    // Remove password if it's empty
    if (!userData.password) {
      delete userData.password;
    }

    this.http.put(`http://localhost:3000/api/users/${this.editingUser.id}`, userData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'User updated successfully!';
          this.closeEditModal();
          this.loadUsers();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to update user';
          this.isSubmitting = false;
        }
      });
  }

  confirmDelete(user: User): void {
    this.userToDelete = user;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.userToDelete = null;
  }

  deleteUser(): void {
    if (!this.userToDelete) return;

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.delete(`http://localhost:3000/api/users/${this.userToDelete.id}`, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'User deleted successfully!';
          this.closeDeleteModal();
          this.loadUsers();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to delete user';
          this.isSubmitting = false;
        }
      });
  }

  toggleUserStatus(user: User): void {
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

   this.http.patch(`http://localhost:3000/api/users/${user.id}/toggle-status`, {}, { headers })
    .subscribe({
      next: (response: any) => {
        this.successMessage = response.message;
        this.loadUsers(); // Reload users to reflect the change
      },
      error: (error) => {
        this.error = error.error?.error || 'Failed to toggle user status';
        console.error('Toggle status error:', error);
      }
    });
  }



  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.userForm.controls).forEach(key => {
      const control = this.userForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }
getRoleIcon(role: string): string {
  const icons: { [key: string]: string } = {
    'admin': 'fas fa-crown',
    'manager': 'fas fa-users-cog',
    'coach': 'fas fa-whistle',
    'receptionist': 'fas fa-desk'
  };
  return icons[role] || 'fas fa-user';
}

getRoleBadgeClass(role: string): string {
  const classes: { [key: string]: string } = {
    'admin': 'bg-danger text-white',
    'manager': 'bg-primary text-white', 
    'coach': 'bg-success text-white',
    'receptionist': 'bg-info text-white'
  };
  return classes[role] || 'bg-secondary text-white';
}

trackByUserId(index: number, user: any): number {
  return user.id;
}

// Add this method if it doesn't exist
getCurrentTime(): Date {
  return new Date();
}

// Add this method if it doesn't exist  
getCurrentUserId(): number {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    return user.id;
  }
  return 0;
}
  logout(): void {
    this.authService.logout();
  }
}