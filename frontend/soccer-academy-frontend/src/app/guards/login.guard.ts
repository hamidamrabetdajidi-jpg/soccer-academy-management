import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const token = localStorage.getItem('token');
    
    if (token) {
      // User is logged in, redirect to dashboard
      this.router.navigate(['/dashboard']);
      return false;
    } else {
      // User is not logged in, allow access to login
      return true;
    }
  }
}