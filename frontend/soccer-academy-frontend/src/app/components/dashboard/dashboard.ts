import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null;
  stats: any = { users: 0, players: 0, teams: 0 };

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStats();
  }

  loadStats(): void {
    this.http.get<any>('http://localhost:3000/api/stats').subscribe({
      next: (data) => {
        this.stats = data || { users: 0, players: 0, teams: 0 };
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.stats = { users: 0, players: 0, teams: 0 };
      }
    });
  }

  navigateToUsers(event: Event): void {
    event.preventDefault();
    console.log('Navigating to users...');
    this.router.navigate(['/users']);
  }

  logout(): void {
    this.authService.logout();
  }
}