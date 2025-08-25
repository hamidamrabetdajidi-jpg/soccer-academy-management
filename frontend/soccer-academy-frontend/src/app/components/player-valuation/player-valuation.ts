import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { PlayerValuation, ValuationSummary } from '../../models/valuation.model';
import { Player } from '../../models/player.model';
import { User } from '../../models/user.model';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-player-valuation',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './player-valuation.html',
  styleUrls: ['./player-valuation.scss']
})
export class PlayerValuationComponent implements OnInit {
  valuations: PlayerValuation[] = [];
  players: Player[] = [];
  coaches: User[] = [];
  valuationSummaries: ValuationSummary[] = [];
  
  isLoading = false;
  isSubmitting = false;
  error = '';
  successMessage = '';
  
  // Modal states
  showAddValuationModal = false;
  showViewModal = false;
  showEditModal = false;
  
  selectedPlayer: Player | null = null;
  selectedValuation: PlayerValuation | null = null;
  editingValuation: PlayerValuation | null = null;
  
  // Forms
  valuationForm!: FormGroup;
  
  // Search and filter
  searchTerm = '';
  selectedPosition = '';
  selectedRatingRange = '';
  sortBy = 'overall_rating';
  sortOrder = 'desc';
  searchTimeout: any; // Fix: Add the missing property
  
  // View mode
  viewMode: 'list' | 'cards' | 'chart' = 'cards';

  constructor(
    private http: HttpClient,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
   this.initializeForm();
  this.loadPlayers();
  this.loadCoaches();
  this.loadValuations();
  
  // Check for pre-selected player from query params
  this.route.queryParams.subscribe(params => {
    if (params['playerId']) {
      this.openAddValuationModal();
      this.valuationForm.patchValue({ 
        player_id: parseInt(params['playerId']) 
      });
    }
  });
  }

  initializeForm(): void {
    this.valuationForm = this.formBuilder.group({
      player_id: ['', [Validators.required]],
      evaluation_date: [new Date().toISOString().split('T')[0], [Validators.required]],
      
      // Performance metrics
      matches_played: [0, [Validators.min(0)]],
      goals_scored: [0, [Validators.min(0)]],
      assists: [0, [Validators.min(0)]],
      yellow_cards: [0, [Validators.min(0)]],
      red_cards: [0, [Validators.min(0)]],
      minutes_played: [0, [Validators.min(0)]],
      
      // Skill ratings (1-10)
      technical_skills: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      physical_skills: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      mental_skills: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      tactical_skills: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      
      // Position ratings
      attacking_rating: [5, [Validators.min(1), Validators.max(10)]],
      defending_rating: [5, [Validators.min(1), Validators.max(10)]],
      goalkeeping_rating: [5, [Validators.min(1), Validators.max(10)]],
      
      // Overall ratings
      potential_rating: [5, [Validators.required, Validators.min(1), Validators.max(10)]],
      market_value: [0, [Validators.min(0)]],
      
      // Notes
      strengths: [''],
      weaknesses: [''],
      development_notes: [''],
      recommended_training: ['']
    });
  }

  loadPlayers(): void {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<any>('http://localhost:3000/api/players', { headers })
      .subscribe({
        next: (response) => {
          this.players = response.players || [];
        },
        error: (error) => {
          console.error('Error loading players:', error);
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
        }
      });
  }

  loadValuations(): void {
    this.isLoading = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    let params = new URLSearchParams();
    
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      params.append('search', this.searchTerm.trim());
    }
    
    if (this.selectedPosition && this.selectedPosition !== '') {
      params.append('position', this.selectedPosition);
    }
    
    if (this.selectedRatingRange && this.selectedRatingRange !== '') {
      params.append('rating_range', this.selectedRatingRange);
    }
    
    params.append('sort_by', this.sortBy);
    params.append('sort_order', this.sortOrder);

    const url = `http://localhost:3000/api/valuations${params.toString() ? '?' + params.toString() : ''}`;

    this.http.get<any>(url, { headers })
      .subscribe({
        next: (response) => {
          this.valuations = response.valuations || [];
          this.valuationSummaries = response.summaries || [];
          this.isLoading = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to load valuations';
          this.isLoading = false;
        }
      });
  }

  // Modal methods
  openAddValuationModal(player?: Player): void {
    this.showAddValuationModal = true;
    this.selectedPlayer = player || null;
    this.valuationForm.reset();
    
    if (player) {
      this.valuationForm.patchValue({ player_id: player.id });
    }
    
    this.valuationForm.patchValue({
      evaluation_date: new Date().toISOString().split('T')[0],
      technical_skills: 5,
      physical_skills: 5,
      mental_skills: 5,
      tactical_skills: 5,
      attacking_rating: 5,
      defending_rating: 5,
      goalkeeping_rating: 5,
      potential_rating: 5
    });
    
    this.error = '';
    this.successMessage = '';
  }

  closeAddValuationModal(): void {
    this.showAddValuationModal = false;
    this.selectedPlayer = null;
    this.valuationForm.reset();
  }

  saveValuation(): void {
    if (this.valuationForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (this.editingValuation) {
      this.updateValuation();
    } else {
      this.createValuation();
    }
  }

  createValuation(): void {
    this.isSubmitting = true;
    const token = localStorage.getItem('token');
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const formData = this.valuationForm.value;
    
    // Calculate overall rating
    const overall_rating = Math.round(
      (formData.technical_skills + formData.physical_skills + 
       formData.mental_skills + formData.tactical_skills) / 4
    );

    const valuationData = {
      ...formData,
      overall_rating,
      is_active: true
    };

    this.http.post('http://localhost:3000/api/valuations', valuationData, { headers })
      .subscribe({
        next: (response) => {
          this.successMessage = 'Player valuation created successfully!';
          this.closeAddValuationModal();
          this.loadValuations();
          this.isSubmitting = false;
        },
        error: (error) => {
          this.error = error.error?.error || 'Failed to create valuation';
          this.isSubmitting = false;
        }
      });
  }

  updateValuation(): void {
    // Implementation for updating valuation
    console.log('Update valuation method');
  }

  viewValuation(valuation: PlayerValuation): void {
    this.selectedValuation = valuation;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedValuation = null;
  }

  // Helper methods
  getPlayerName(playerId: number): string {
    const player = this.players.find(p => p.id === playerId);
    return player ? `${player.first_name} ${player.last_name}` : 'Unknown Player';
  }

  getRatingColor(rating: number): string {
    if (rating >= 8) return 'success';
    if (rating >= 6) return 'warning';
    if (rating >= 4) return 'info';
    return 'danger';
  }

  getRatingStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5 ? 1 : 0;
    const emptyStars = 10 - fullStars - halfStar;
    
    return '★'.repeat(fullStars) + (halfStar ? '☆' : '') + '☆'.repeat(emptyStars);
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

  // Search and filter methods
  onSearchChange(): void {
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadValuations();
    }, 300);
  }

  onFilterChange(): void {
    this.loadValuations();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedPosition = '';
    this.selectedRatingRange = '';
    this.loadValuations();
  }

  // Form validation
  isFieldInvalid(fieldName: string): boolean {
    const field = this.valuationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private markFormGroupTouched(): void {
    Object.keys(this.valuationForm.controls).forEach(key => {
      const control = this.valuationForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  logout(): void {
    this.authService.logout();
  }
}