import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { Team, TeamPlayer, CreateTeamRequest, Season } from '../../models/team.model';
import { Player, Category } from '../../models/player.model';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-team-management',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './team-management.html',
  styleUrls: ['./team-management.scss']
})
export class TeamManagementComponent implements OnInit {
  teams: Team[] = [];
  players: Player[] = [];
  categories: Category[] = [];
  coaches: User[] = [];
  seasons: Season[] = [];
  teamPlayers: TeamPlayer[] = [];
  
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
  
  // Modal states
  showAddTeamModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showPlayersModal = false;
  showAddPlayerModal = false;
  
  editingTeam: Team | null = null;
  teamToDelete: Team | null = null;
  selectedTeam: Team | null = null;
  
  // Forms
  teamForm!: FormGroup;
  
  // Search and filter
  searchTerm = '';
  selectedCategory = '';
  selectedSeason = '';
  searchTimeout: any;
  showPlayerDetailsModal = false;
  selectedPlayerForAssignment: Player | null = null;
  playerAssignmentForm!: FormGroup;
  playerSearchTerm = '';
  filteredPlayers: Player[] = [];
  // Available formations
  formations = [
    '4-4-2', '4-3-3', '3-5-2', '5-3-2', '4-5-1', 
    '3-4-3', '4-2-3-1', '5-4-1', '4-1-4-1', '3-6-1'
  ];

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  this.initializePlayerAssignmentForm();
  this.loadCategories();
  this.loadCoaches();
  this.loadSeasons();
  this.loadTeams();
  }
initializePlayerAssignmentForm(): void {
  this.playerAssignmentForm = this.formBuilder.group({
    position: [''],
    jersey_number: [''],
    is_captain: [false],
    is_vice_captain: [false]
  });
}
closeAddPlayerModal(): void {
  this.showAddPlayerModal = false;
  this.players = [];
  this.filteredPlayers = [];
  this.playerSearchTerm = '';
}


filterAvailablePlayers(): void {
  if (!this.playerSearchTerm.trim()) {
    this.filteredPlayers = this.players;
  } else {
    this.filteredPlayers = this.players.filter(player => 
      player.first_name.toLowerCase().includes(this.playerSearchTerm.toLowerCase()) ||
      player.last_name.toLowerCase().includes(this.playerSearchTerm.toLowerCase()) ||
      player.registration_number.toLowerCase().includes(this.playerSearchTerm.toLowerCase())
    );
  }
}

selectPlayerForTeam(player: Player): void {
  this.selectedPlayerForAssignment = player;
  this.showPlayerDetailsModal = true;
  this.playerAssignmentForm.reset();
}

closePlayerDetailsModal(): void {
  this.showPlayerDetailsModal = false;
  this.selectedPlayerForAssignment = null;
  this.playerAssignmentForm.reset();
}

addPlayerToTeam(): void {
  if (!this.selectedPlayerForAssignment || !this.selectedTeam) return;

  // Check if we have a token
  const token = localStorage.getItem('token');
  if (!token) {
    this.error = 'You are not logged in. Please login again.';
    this.authService.logout();
    return;
  }

  this.isSubmitting = true;
  
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const assignmentData = {
    player_id: this.selectedPlayerForAssignment.id,
    position: this.playerAssignmentForm.value.position || null,
    jersey_number: this.playerAssignmentForm.value.jersey_number || null,
    is_captain: this.playerAssignmentForm.value.is_captain || false,
    is_vice_captain: this.playerAssignmentForm.value.is_vice_captain || false
  };

  console.log('Token being sent:', token ? 'Present' : 'Missing');
  console.log('Sending assignment data:', assignmentData);

  this.http.post(`http://localhost:3000/api/teams/${this.selectedTeam.id}/players`, assignmentData, { headers })
    .subscribe({
      next: (response) => {
        this.successMessage = `${this.selectedPlayerForAssignment?.first_name} ${this.selectedPlayerForAssignment?.last_name} added to team successfully!`;
        this.closePlayerDetailsModal();
        this.closeAddPlayerModal();
        this.loadTeamPlayers(this.selectedTeam?.id || 0);
        this.loadTeams();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Add player error:', error);
        if (error.status === 401) {
          this.error = 'Session expired. Please login again.';
          this.authService.logout();
        } else {
          this.error = error.error?.error || 'Failed to add player to team';
        }
        this.isSubmitting = false;
      }
    });
}
  initializeForm(): void {
    this.teamForm = this.formBuilder.group({
      name: ['', [Validators.required]],
      category_id: ['', [Validators.required]],
      coach_id: [''],
      season_id: [''],
      primary_color: ['#2c5530'],
      secondary_color: ['#5cb85c'],
      formation: ['4-4-2'],
      description: ['']
    });
  }

  loadCategories(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>('http://localhost:3000/api/categories', { headers })
      .subscribe({
        next: (response) => {
          this.categories = response.categories || [];
        },
        error: (error) => {
          console.error('Error loading categories:', error);
        }
      });
  }

  loadCoaches(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>('http://localhost:3000/api/users?role=coach', { headers })
      .subscribe({
        next: (response) => {
          this.coaches = response.users || [];
        },
        error: (error) => {
          console.error('Error loading coaches:', error);
          this.coaches = [];
        }
      });
  }

  loadSeasons(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>('http://localhost:3000/api/seasons', { headers })
      .subscribe({
        next: (response) => {
          this.seasons = response.seasons || [];
        },
        error: (error) => {
          console.error('Error loading seasons:', error);
          this.seasons = [];
        }
      });
  }

  loadTeams(): void {
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
    
    if (this.selectedSeason && this.selectedSeason !== '') {
      params.append('season', this.selectedSeason);
    }

    const url = `http://localhost:3000/api/teams${params.toString() ? '?' + params.toString() : ''}`;

    this.http.get<any>(url, { headers })
      .subscribe({
        next: (response) => {
          this.teams = response.teams || [];
          this.isLoading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to load teams';
          this.teams = [];
          this.isLoading = false;
        }
      });
  }

  openAddTeamModal(): void {
    this.showAddTeamModal = true;
    this.teamForm.reset();
    this.teamForm.patchValue({ 
      primary_color: '#2c5530',
      secondary_color: '#5cb85c',
      formation: '4-4-2'
    });
    this.error = '';
    this.successMessage = '';
  }

  closeAddTeamModal(): void {
    this.showAddTeamModal = false;
    this.teamForm.reset();
  }

  editTeam(team: Team): void {
    this.editingTeam = team;
    this.showEditModal = true;
    
    this.teamForm.patchValue({
      name: team.name,
      category_id: team.category_id,
      coach_id: team.coach_id || '',
      season_id: team.season_id || '',
      primary_color: team.primary_color || '#2c5530',
      secondary_color: team.secondary_color || '#5cb85c',
      formation: team.formation || '4-4-2',
      description: team.description || ''
    });

    this.error = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editingTeam = null;
    this.teamForm.reset();
  }

  saveTeam(): void {
    if (this.teamForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.editingTeam) {
      this.updateTeam();
    } else {
      this.createTeam();
    }
  }

  createTeam(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const formData = this.teamForm.value;
    const teamData: CreateTeamRequest = {
      name: formData.name,
      category_id: parseInt(formData.category_id),
      coach_id: formData.coach_id ? parseInt(formData.coach_id) : undefined,
      season_id: formData.season_id ? parseInt(formData.season_id) : undefined,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      formation: formData.formation,
      description: formData.description
    };

    this.http.post('http://localhost:3000/api/teams', teamData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Team created successfully!';
          this.closeAddTeamModal();
          this.loadTeams();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create team';
          this.isSubmitting = false;
        }
      });
  }

  updateTeam(): void {
    if (!this.editingTeam) return;

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const formData = this.teamForm.value;
    const teamData = {
      name: formData.name,
      category_id: parseInt(formData.category_id),
      coach_id: formData.coach_id ? parseInt(formData.coach_id) : null,
      season_id: formData.season_id ? parseInt(formData.season_id) : null,
      primary_color: formData.primary_color,
      secondary_color: formData.secondary_color,
      formation: formData.formation,
      description: formData.description
    };

    this.http.put(`http://localhost:3000/api/teams/${this.editingTeam.id}`, teamData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Team updated successfully!';
          this.closeEditModal();
          this.loadTeams();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to update team';
          this.isSubmitting = false;
        }
      });
  }

  confirmDelete(team: Team): void {
    this.teamToDelete = team;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.teamToDelete = null;
  }

  deleteTeam(): void {
    if (!this.teamToDelete) return;

    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.delete(`http://localhost:3000/api/teams/${this.teamToDelete.id}`, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Team deleted successfully!';
          this.closeDeleteModal();
          this.loadTeams();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to delete team';
          this.isSubmitting = false;
        }
      });
  }

  viewTeamPlayers(team: Team): void {
    this.selectedTeam = team;
    this.showPlayersModal = true;
    this.loadTeamPlayers(team.id);
  }

  loadTeamPlayers(teamId: number): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>(`http://localhost:3000/api/teams/${teamId}/players`, { headers })
      .subscribe({
        next: (response) => {
          this.teamPlayers = response.players || [];
        },
        error: (error) => {
          console.error('Error loading team players:', error);
          this.teamPlayers = [];
        }
      });
  }

  closePlayersModal(): void {
    this.showPlayersModal = false;
    this.selectedTeam = null;
    this.teamPlayers = [];
  }

  // Search and filter methods
  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadTeams();
    }, 300);
  }

  onCategoryChange(): void {
    this.loadTeams();
  }

  onSeasonChange(): void {
    this.loadTeams();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.selectedSeason = '';
    this.loadTeams();
  }

  // Helper methods
  getCategoryName(categoryId: number): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  }

  getCoachName(coachId: number): string {
    const coach = this.coaches.find(c => c.id === coachId);
    return coach ? `${coach.first_name} ${coach.last_name}` : 'No Coach';
  }

  getSeasonName(seasonId: number): string {
    const season = this.seasons.find(s => s.id === seasonId);
    return season ? season.name : 'No Season';
  }

  getCurrentTime(): Date {
    return new Date();
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.teamForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.teamForm.controls).forEach(key => {
      const control = this.teamForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
  // Add these export methods

exportTeams(): void {
  const data = this.teams.map(team => ({
    'Team Name': team.name,
    'Category': this.getCategoryName(team.category_id),
    'Coach': team.coach_id ? this.getCoachName(team.coach_id) : 'No Coach',
    'Season': team.season_id ? this.getSeasonName(team.season_id) : 'No Season',
    'Formation': team.formation || '4-4-2',
    'Players Count': team.players_count || 0,
    'Primary Color': team.primary_color || '#2c5530',
    'Secondary Color': team.secondary_color || '#5cb85c',
    'Founded Date': team.founded_date,
    'Status': team.is_active ? 'Active' : 'Inactive',
    'Description': team.description || ''
  }));

  this.downloadTeamsFile(data, 'teams.xlsx');
  this.successMessage = 'Teams exported successfully!';
}

printTeams(): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Soccer Academy - Teams List</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #2c5530; padding-bottom: 10px; }
          .logo { color: #2c5530; font-size: 24px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #2c5530; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">⚽ Soccer Academy Management</div>
          <h2>Teams List Report</h2>
          <p>Generated on: ${new Date().toLocaleDateString()} | Total Teams: ${this.teams.length}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Team Name</th>
              <th>Category</th>
              <th>Coach</th>
              <th>Formation</th>
              <th>Players</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
    `);
    
    this.teams.forEach(team => {
      printWindow.document.write(`
        <tr>
          <td>${team.name}</td>
          <td>${this.getCategoryName(team.category_id)}</td>
          <td>${team.coach_id ? this.getCoachName(team.coach_id) : 'No Coach'}</td>
          <td>${team.formation || '4-4-2'}</td>
          <td>${team.players_count || 0}</td>
          <td>${team.is_active ? 'Active' : 'Inactive'}</td>
        </tr>
      `);
    });
    
    printWindow.document.write(`
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); }
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

private downloadTeamsFile(data: any[], filename: string): void {
 const headers = Object.keys(data[0]);
 let csv = headers.join(',') + '\n';
 
 data.forEach(row => {
   const values = headers.map(header => {
     const value = row[header];
     if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
       return `"${value.replace(/"/g, '""')}"`;
     }
     return value;
   });
   csv += values.join(',') + '\n';
 });
 
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = window.URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url;
 link.download = filename;
 link.click();
 window.URL.revokeObjectURL(url);
}

// Add helper methods for team players modal
openAddPlayerToTeam(): void {
 // This will open a modal to add players to the team
 // We'll implement this next
 this.showAddPlayerModal = true;
 this.loadAvailablePlayers();
}

loadAvailablePlayers(): void {
 // Load players that can be added to the team (same category, not already in team)
 const token = localStorage.getItem('token');
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const categoryId = this.selectedTeam?.category_id;

  this.http.get<any>(`http://localhost:3000/api/players?category=${categoryId}&not_in_team=true`, { headers })
    .subscribe({
      next: (response) => {
        this.players = response.players || [];
        this.filteredPlayers = this.players;
      },
      error: (error) => {
        console.error('Error loading available players:', error);
        this.players = [];
        this.filteredPlayers = [];
      }
    });
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
getPhotoUrl(photoUrl: string): string {
 if (!photoUrl) return '';
 
 if (photoUrl.startsWith('http')) {
   return photoUrl;
 }
 
 if (photoUrl.startsWith('/')) {
   return `http://localhost:3000${photoUrl}`;
 }
 
 return `http://localhost:3000/uploads/players/${photoUrl}`;
}

editTeamPlayer(teamPlayer: TeamPlayer): void {
 // Open modal to edit player role, position, jersey number
 console.log('Edit team player:', teamPlayer);
 // Implementation will come next
}
removePlayerFromTeam(teamPlayer: TeamPlayer): void {
 if (confirm(`Remove ${teamPlayer.player_name} from the team?`)) {
   const token = localStorage.getItem('token');
   const headers = new HttpHeaders({
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   });

   this.http.delete(`http://localhost:3000/api/teams/${this.selectedTeam?.id}/players/${teamPlayer.player_id}`, { headers })
     .subscribe({
       next: (response) => {
         this.successMessage = 'Player removed from team successfully!';
         this.loadTeamPlayers(this.selectedTeam?.id || 0);
       },
       error: (error) => {
         this.error = error.error?.error || 'Failed to remove player from team';
       }
     });
 }
}
}
