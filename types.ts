
export enum UrgencyLevel {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low'
}

export interface NearbyResource {
  name: string;
  type: 'Hospital' | 'Fire Station' | 'Police' | 'Shelter' | 'Other';
  lat: number;
  lng: number;
  distance?: string; // Distance from incident in km or miles
}

export interface TriageResult {
  id: string;
  timestamp: number;
  damageType: string;
  urgency: string;
  description: string;
  explanation: string;
  checklist: string[];
  firstActions: string[];
  sosMessage: string;
  authorityGuidance: {
    dos: string[];
    donts: string[];
  };
  nearbyResources: NearbyResource[];
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  groundingSources?: Array<{
    title: string;
    uri: string;
  }>;
}
