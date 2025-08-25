import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="container-fluid vh-100">
      <div class="row h-100">
        <div class="col-md-6 d-flex align-items-center justify-content-center">
          <div class="card shadow-lg border-0" style="max-width: 400px; width: 100%;">
            <div class="card-body p-5">
              <div class="text-center mb-4">
                <h2 class="card-title">Soccer Academy</h2>
                <p class="text-muted">Management System</p>
              </div>

              <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
                <div *ngIf="error" class="alert alert-danger" role="alert">
                  {{ error }}
                </div>

                <div class="mb-3">
                  <label for="username" class="form-label">Username</label>
                  <input
                    type="text"
                    class="form-control"
                    id="username"
                    formControlName="username"
                    placeholder="Enter username"
                  >
                </div>

                <div class="mb-4">
                  <label for="password" class="form-label">Password</label>
                  <input
                    type="password"
                    class="form-control"
                    id="password"
                    formControlName="password"
                    placeholder="Enter password"
                  >
                </div>

                <button
                  type="submit"
                  class="btn btn-primary w-100 py-2"
                  [disabled]="isLoading"
                >
                  <span *ngIf="isLoading" class="spinner-border spinner-border-sm me-2"></span>
                  {{ isLoading ? 'Signing In...' : 'Sign In' }}
                </button>
              </form>

              <div class="mt-4 p-3 bg-light rounded">
                <small class="text-muted">
                  <strong>Demo:</strong> admin / admin123
                </small>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6 d-none d-md-flex align-items-center justify-content-center bg-success">
          <div class="text-center text-white">
            <h1 class="display-4 fw-bold mb-3">Welcome!</h1>
          </div>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.error = '';

    const credentials = this.loginForm.value;

    this.http.post<any>('http://localhost:3000/api/auth/login', credentials)
      .subscribe({
        next: (response) => {
          localStorage.setItem('token', response.token);
          localStorage.setItem('user', JSON.stringify(response.user));
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.error = error.error?.error || 'Login failed';
          this.isLoading = false;
        }
      });
  }
}