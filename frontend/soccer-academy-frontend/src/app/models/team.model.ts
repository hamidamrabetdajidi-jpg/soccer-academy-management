export interface Team {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  coach_id?: number;
  coach_name?: string;
  season_id?: number;
  season_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  formation?: string;
  description?: string;
  founded_date: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  
  // Team statistics
  players_count?: number;
  matches_played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  goals_for?: number;
  goals_against?: number;
  points?: number;
}

export interface TeamPlayer {
  id: number;
  team_id: number;
  player_id: number;
  position?: string;
  jersey_number?: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  joined_date: string;
  is_active: boolean;
  
  // Player details (from join) - Add photo_url here
  player_name?: string;
  player_photo?: string;
  photo_url?: string; // Add this line
  player_age?: number;
  player_registration_number?: string;
  
  // Additional player details
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  gender?: string;
}

export interface CreateTeamRequest {
  name: string;
  category_id: number;
  coach_id?: number;
  season_id?: number;
  primary_color?: string;
  secondary_color?: string;
  formation?: string;
  description?: string;
}

// Add the missing Season export
export interface Season {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  description?: string;
  created_at?: string;
}