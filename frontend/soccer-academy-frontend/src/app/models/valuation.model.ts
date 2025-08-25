export interface PlayerValuation {
  id: number;
  player_id: number;
  evaluator_id: number; // Coach/Staff who made the evaluation
  evaluation_date: string;
  season_id?: number;
  
  // Performance Metrics
  matches_played: number;
  goals_scored: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
  
  // Skill Ratings (1-10 scale)
  technical_skills: number;      // Ball control, passing, shooting
  physical_skills: number;       // Speed, strength, endurance
  mental_skills: number;         // Decision making, composure
  tactical_skills: number;       // Positioning, game understanding
  
  // Position-specific ratings
  attacking_rating?: number;
  defending_rating?: number;
  goalkeeping_rating?: number;
  
  // Overall ratings
  overall_rating: number;        // Calculated average
  potential_rating: number;      // Future potential (1-10)
  market_value?: number;         // Estimated value
  
  // Qualitative data
  strengths: string;
  weaknesses: string;
  development_notes: string;
  recommended_training: string;
  
  // Status
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  
  // Relationships
  player_name?: string;
  evaluator_name?: string;
  season_name?: string;
}

export interface ValuationSummary {
  player_id: number;
  player_name: string;
  latest_overall_rating: number;
  rating_trend: 'improving' | 'declining' | 'stable';
  last_evaluation_date: string;
  total_evaluations: number;
  average_rating: number;
}

export interface SkillCategory {
  name: string;
  current_rating: number;
  previous_rating?: number;
  trend: 'up' | 'down' | 'stable';
  skills: {
    name: string;
    rating: number;
    description: string;
  }[];
}