// guards/permission.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const requiredPermissions = route.data['permissions'] as string[];
    
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    if (this.authService.hasAnyPermission(requiredPermissions)) {
      return true;
    }

    this.router.navigate(['/unauthorized']);
    return false;
  }
}