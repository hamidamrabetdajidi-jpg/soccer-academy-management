// models/roles.model.ts
export interface Role {
  id: number;
  name: string;
  permissions: string[];
}

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  COACH: 'coach',
  STAFF: 'staff',
  PARENT: 'parent',
  PLAYER: 'player'
};

export const PERMISSIONS = {
  // User management
  VIEW_USERS: 'view_users',
  CREATE_USERS: 'create_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  
  // Player management
  VIEW_PLAYERS: 'view_players',
  CREATE_PLAYERS: 'create_players',
  EDIT_PLAYERS: 'edit_players',
  DELETE_PLAYERS: 'delete_players',
  
  // Team management
  VIEW_TEAMS: 'view_teams',
  MANAGE_TEAMS: 'manage_teams',
  
  // Valuations
  VIEW_VALUATIONS: 'view_valuations',
  CREATE_VALUATIONS: 'create_valuations',
  EDIT_VALUATIONS: 'edit_valuations',
  
  // Attendance
  VIEW_ATTENDANCE: 'view_attendance',
  MANAGE_ATTENDANCE: 'manage_attendance',
  
  // Payments
  VIEW_PAYMENTS: 'view_payments',
  MANAGE_PAYMENTS: 'manage_payments',
  
  // Settings
  VIEW_SETTINGS: 'view_settings',
  MANAGE_SETTINGS: 'manage_settings'
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS), // All permissions
  
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USERS,
    PERMISSIONS.EDIT_USERS,
    PERMISSIONS.VIEW_PLAYERS,
    PERMISSIONS.CREATE_PLAYERS,
    PERMISSIONS.EDIT_PLAYERS,
    PERMISSIONS.DELETE_PLAYERS,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.MANAGE_TEAMS,
    PERMISSIONS.VIEW_VALUATIONS,
    PERMISSIONS.CREATE_VALUATIONS,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MANAGE_ATTENDANCE,
    PERMISSIONS.VIEW_PAYMENTS,
    PERMISSIONS.MANAGE_PAYMENTS,
    PERMISSIONS.VIEW_SETTINGS
  ],
  
  [ROLES.COACH]: [
    PERMISSIONS.VIEW_PLAYERS,
    PERMISSIONS.EDIT_PLAYERS,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.VIEW_VALUATIONS,
    PERMISSIONS.CREATE_VALUATIONS,
    PERMISSIONS.EDIT_VALUATIONS,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.MANAGE_ATTENDANCE
  ],
  
  [ROLES.STAFF]: [
    PERMISSIONS.VIEW_PLAYERS,
    PERMISSIONS.VIEW_TEAMS,
    PERMISSIONS.VIEW_ATTENDANCE,
    PERMISSIONS.VIEW_PAYMENTS
  ],
  
  [ROLES.PARENT]: [
    PERMISSIONS.VIEW_PLAYERS, // Only their children
    PERMISSIONS.VIEW_ATTENDANCE, // Only their children
    PERMISSIONS.VIEW_PAYMENTS // Only their payments
  ],
  
  [ROLES.PLAYER]: [
    PERMISSIONS.VIEW_ATTENDANCE, // Only their own
    PERMISSIONS.VIEW_VALUATIONS // Only their own
  ]
};