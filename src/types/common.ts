/**
 * Common Types
 * Shared types used across the application
 */

export interface UserLocation {
  id?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  landmark?: string;
  city?: string;
  district?: string;
  state?: string;
  stateId?: string;
  districtId?: string;
  blockId?: string;
  block?: string;
  pincode?: string;
  country?: string;
}

export type ServiceRequestStatus =
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';
