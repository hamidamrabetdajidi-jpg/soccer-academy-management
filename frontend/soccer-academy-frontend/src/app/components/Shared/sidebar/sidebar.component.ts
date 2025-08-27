import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="col-md-3 col-lg-2 d-md-block sidebar collapse" style="background-color: #2c5530; min-height: 100vh;">
      <div class="position-sticky pt-3">
        <div class="text-center mb-4">
          <h5 class="text-white">
            <i class="fas fa-futbol me-2"></i>Soccer Academy
          </h5>
        </div>

        <ul class="nav flex-column">
          <li class="nav-item" *ngFor="let item of menuItems">
            <a 
              class="nav-link text-white" 
              [routerLink]="[item.route]"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{exact: item.exact || false}"
              [style.background-color]="isActive(item.route) ? '#5cb85c' : 'transparent'"
              style="border-radius: 0.375rem;"
            >
              <i [class]="item.icon + ' me-2'"></i>{{ item.label }}
            </a>
          </li>
        </ul>

        <hr class="text-white">

        <ul class="nav flex-column">
          <li class="nav-item">
            <a class="nav-link text-white" href="#" (click)="logout($event)">
              <i class="fas fa-sign-out-alt me-2"></i>Logout
            </a>
          </li>
        </ul>
      </div>
    </nav>
  `,
  styles: [`
    .sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 100;
      padding: 0;
      box-shadow: inset -1px 0 0 rgba(0, 0, 0, .1);
    }

    .nav-link {
      padding: 0.75rem 1rem;
      transition: all 0.3s ease;
    }

    .nav-link:hover {
      background-color: rgba(92, 184, 92, 0.2);
      transform: translateX(5px);
    }

    .nav-link.active {
      font-weight: 600;
    }
  `]
})
export class SidebarComponent {
  menuItems = [
    { label: 'Dashboard', route: '/dashboard', icon: 'fas fa-tachometer-alt', exact: true },
    { label: 'User Management', route: '/users', icon: 'fas fa-users' },
    { label: 'Players', route: '/players', icon: 'fas fa-user-graduate' },
    { label: 'Teams', route: '/teams', icon: 'fas fa-users-cog' },
    { label: 'Player Valuation', route: '/valuations', icon: 'fas fa-chart-line' },
    { label: 'Training Sessions', route: '/training-sessions', icon: 'fas fa-dumbbell' },
    { label: 'Attendance', route: '/attendance', icon: 'fas fa-clipboard-check' },
    { label: 'Field Booking', route: '/fields', icon: 'fas fa-calendar-alt' },
    { label: 'Payments', route: '/payments', icon: 'fas fa-dollar-sign' }
  ];

  constructor(private authService: AuthService) {}

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
  }

  isActive(route: string): boolean {
    return window.location.pathname === route;
  }
}