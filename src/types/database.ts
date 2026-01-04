export type AppRole = 'crane_operator' | 'supervisor' | 'higher_authority';

export type DelayReason = 
  | 'crane_malfunction'
  | 'vehicle_unavailability'
  | 'weather_conditions'
  | 'operator_break'
  | 'vessel_repositioning'
  | 'safety_incident';

export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'unavailable';

export interface Profile {
  id: string;
  full_name: string;
  employee_id: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

export interface WorkShift {
  id: string;
  operator_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
}

export interface LiftLog {
  id: string;
  operator_id: string;
  shift_id: string | null;
  log_date: string;
  hour_slot: string;
  lifts_count: number;
  target_met: boolean;
  created_at: string;
  updated_at: string;
}

export interface DelayRecord {
  id: string;
  operator_id: string;
  shift_id: string | null;
  lift_log_id: string | null;
  delay_date: string;
  delay_start: string;
  delay_end: string;
  reason: DelayReason;
  notes: string | null;
  duration_minutes: number;
  created_at: string;
}

export interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  status: VehicleStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceRating {
  id: string;
  operator_id: string;
  rated_by: string | null;
  rating: number;
  rating_date: string;
  comments: string | null;
  created_at: string;
}

export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  crane_malfunction: 'Crane Malfunction',
  vehicle_unavailability: 'Vehicle Unavailability',
  weather_conditions: 'Weather Conditions',
  operator_break: 'Operator Break',
  vessel_repositioning: 'Vessel Repositioning',
  safety_incident: 'Safety Incident',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Under Maintenance',
  unavailable: 'Unavailable',
};

export const TARGET_LIFTS_PER_HOUR = 24;
