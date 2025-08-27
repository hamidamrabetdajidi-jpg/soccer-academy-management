// services/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ROLE_PERMISSIONS, PERMISSIONS } from '../models/roles.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: any = null;

  constructor(private router: Router) {
    this.loadUser();
  }

  loadUser(): void {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      this.currentUser = JSON.parse(userStr);
    }
  }

  getCurrentUser(): any {
    return this.currentUser;
  }

  getUserRole(): string {
    return this.currentUser?.role || '';
  }

  hasPermission(permission: string): boolean {
    const userRole = this.getUserRole();
    if (!userRole) return false;
    
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission);
  }

  hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(permission));
  }

  hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => this.hasPermission(permission));
  }

  isAdmin(): boolean {
    return this.getUserRole() === 'super_admin' || this.getUserRole() === 'admin';
  }

  isCoach(): boolean {
    return this.getUserRole() === 'coach';
  }
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user ? user.role === role : false;
  }
  canAccessRoute(route: string): boolean {
  const routePermissions = new Map<string, string[]>([
    ['/users', [PERMISSIONS.VIEW_USERS]],
    ['/players', [PERMISSIONS.VIEW_PLAYERS]],
    ['/teams', [PERMISSIONS.VIEW_TEAMS]],
    ['/valuations', [PERMISSIONS.VIEW_VALUATIONS]],
    ['/attendance', [PERMISSIONS.VIEW_ATTENDANCE]],
    ['/payments', [PERMISSIONS.VIEW_PAYMENTS]],
    ['/settings', [PERMISSIONS.VIEW_SETTINGS]]
  ]);

  const required = routePermissions.get(route);
  if (!required) return true;
  
  return this.hasAnyPermission(required);
}
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser = null;
    this.router.navigate(['/login']);
  }
}