// Database Types - Generated from Supabase

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id' | 'created_at'>>;
      };
      invitations: {
        Row: Invitation;
        Insert: Omit<Invitation, 'id' | 'created_at'>;
        Update: Partial<Omit<Invitation, 'id' | 'created_at'>>;
      };
      device_pairing_codes: {
        Row: DevicePairingCode;
        Insert: Omit<DevicePairingCode, 'id' | 'created_at'>;
        Update: Partial<Omit<DevicePairingCode, 'id' | 'created_at'>>;
      };
      device_tokens: {
        Row: DeviceToken;
        Insert: Omit<DeviceToken, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DeviceToken, 'id' | 'created_at'>>;
      };
      families: {
        Row: Family;
        Insert: Omit<Family, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Family, 'id' | 'created_at'>>;
      };
      family_members: {
        Row: FamilyMember;
        Insert: Omit<FamilyMember, 'id' | 'created_at'>;
        Update: Partial<Omit<FamilyMember, 'id' | 'created_at'>>;
      };
      events: {
        Row: Event;
        Insert: Omit<Event, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Event, 'id' | 'created_at'>>;
      };
      chores: {
        Row: Chore;
        Insert: Omit<Chore, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Chore, 'id' | 'created_at'>>;
      };
      lists: {
        Row: List;
        Insert: Omit<List, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<List, 'id' | 'created_at'>>;
      };
      list_items: {
        Row: ListItem;
        Insert: Omit<ListItem, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ListItem, 'id' | 'created_at'>>;
      };
    };
  };
}

// Table Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  color: string;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface Invitation {
  id: string;
  email: string;
  invited_by: string;
  expires_at: string;
  used: boolean;
  used_at?: string;
  created_at: string;
}

export interface DevicePairingCode {
  id: string;
  code: string;
  user_id?: string;
  expires_at: string;
  used: boolean;
  device_id?: string;
  created_at: string;
}

export interface DeviceToken {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string;
  device_type: 'electron' | 'ios' | 'android';
  token_hash: string;
  last_used_at?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface Family {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'admin' | 'member' | 'child';
  color?: string;
  created_at: string;
}

export interface Event {
  id: string;
  family_id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  location?: string;
  color?: string;
  category?: string;
  recurrence_rule?: string;
  external_id?: string;
  external_source?: 'google' | 'outlook' | 'apple' | 'ical';
  created_at: string;
  updated_at: string;
}

export interface Chore {
  id: string;
  family_id: string;
  title: string;
  description?: string;
  assigned_to: string;
  due_date?: string;
  completed: boolean;
  completed_at?: string;
  points: number;
  color?: string;
  recurrence_rule?: string;
  created_at: string;
  updated_at: string;
}

export interface List {
  id: string;
  family_id: string;
  name: string;
  type: 'grocery' | 'todo' | 'custom';
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ListItem {
  id: string;
  list_id: string;
  content: string;
  checked: boolean;
  order: number;
  created_at: string;
  updated_at: string;
}
