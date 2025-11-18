export type Role = "customer" | "worker";

export type CityKey = "kathmandu" | "lalitpur" | "bhaktapur";

export type ServiceKey =
  | "painting"
  | "plumbing"
  | "electrician"
  | "cleaning"
  | "gardening"
  | "pest-control"
  | "dial-a-driver"
  | "carpenter";

export interface UserProfile {
  uid: string;
  name: string;
  phone?: string;
  area?: string;
  ward?: string;
  bio?: string;
  email?: string | null;
  photoURL?: string | null;
  role?: Role;
  primaryService?: ServiceKey;
  city?: CityKey;
  ratingAvg?: number;
  ratingCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface ProviderDoc {
  uid: string;
  name: string;
  city: CityKey;
  primaryService: ServiceKey;
  lat?: number;
  lng?: number;
  ratingAvg?: number;
  ratingCount?: number;
  responseTimeMs?: number;
  verified?: boolean;
}

export type UserSignalType = "search" | "click" | "book";
export interface UserSignal {
  type: UserSignalType;
  service: ServiceKey;
  city: CityKey;
  ts?: any;
}
