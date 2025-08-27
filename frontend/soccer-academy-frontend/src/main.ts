import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { AppComponent } from './app/app';
import { LoginComponent } from './app/components/login/login';
import { DashboardComponent } from './app/components/dashboard/dashboard';
import { UserManagementComponent } from './app/components/user-management/user-management';
import { PlayerManagementComponent } from './app/components/player-management/player-management';
import { TeamManagementComponent } from './app/components/team-management/team-management';
import { PlayerValuationComponent } from './app/components/player-valuation/player-valuation';
import { TrainingSessionsComponent } from './app/components/training-sessions/training-sessions';
import { FieldManagementComponent } from './app/components/field-management/field-management';
import { PaymentManagementComponent } from './app/components/payment-management/payment-management';
import { RevenueOverviewComponent } from './app/components/revenue-overview/revenue-overview';
import { AttendanceManagementComponent} from './app/components/attendance-management/attendance-management';
import { PermissionGuard } from './app/guards/permission.guard';
import { AuthGuard } from './app/guards/auth.guard';
import { LoginGuard } from './app/guards/login.guard';
import { Routes } from '@angular/router';

const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent, canActivate: [LoginGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard] },
  { path: 'users', component: UserManagementComponent,canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: ['view_users'] } },
  { path: 'players', component: PlayerManagementComponent,canActivate: [AuthGuard, PermissionGuard],
    data: { permissions: ['view_players'] } },
  { path: 'teams', component: TeamManagementComponent, canActivate: [AuthGuard] },
  { path: 'valuations', component: PlayerValuationComponent, canActivate: [AuthGuard] },
  { path: 'training-sessions', component: TrainingSessionsComponent, canActivate: [AuthGuard] },
  { path: 'attendance', component: AttendanceManagementComponent, canActivate: [AuthGuard] }, // Add this line
  { path: 'fields', component: FieldManagementComponent, canActivate: [AuthGuard] },
  { path: 'payments', component: PaymentManagementComponent, canActivate: [AuthGuard] },
  { path: 'revenue', component: RevenueOverviewComponent, canActivate: [AuthGuard] },
  { path: '**', redirectTo: '/dashboard' }

];

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi()),
    importProvidersFrom(
      ReactiveFormsModule,
      FormsModule
    )
  ]
}).catch(err => console.error(err));