export interface UserInfo {
  name: string;
  age: number;
  maritalStatus: 'unmarried' | 'married' | 'divorced' | 'widowed';
  hasMinorChildren: boolean;
}

export interface Asset {
  type: 'property' | 'savings' | 'stocks' | 'insurance' | 'vehicle' | 'other';
  description: string;
  estimatedValue: number;
  location: string;
}

export interface Heir {
  name: string;
  relationship: string;
  proportion: number;
  isLegal: boolean;
}

export interface SpecialArrangement {
  type: 'guardian' | 'pet' | 'digital' | 'funeral' | 'conditional' | 'bequest';
  description: string;
}

export interface WillQuestionnaire {
  userInfo: UserInfo;
  assets: Asset[];
  liabilities: number;
  heirs: Heir[];
  specialArrangements: SpecialArrangement[];
  existingWill: boolean;
  existingTrust: boolean;
  riskScore: number;
}

export interface Order {
  id: string;
  userId: string;
  status: 'draft' | 'paying' | 'paid' | 'lawyer_assigned' | 'reviewing' | 'completed' | 'cancelled';
  complexity: 'low' | 'middle' | 'high';
  questionnaire: WillQuestionnaire;
  willDraftUrl?: string;
  reviewDraftUrl?: string;
  totalAmount: number;
  lawyerId?: string;
  createdAt: string;
  paidAt?: string;
}

export interface Lawyer {
  id: string;
  name: string;
  phone: string;
  firm: string;
  specialties: string[];
  level: 'bronze' | 'silver' | 'gold';
  rating: number;
  totalOrders: number;
  status: 'active' | 'pending' | 'suspended';
}

export interface WillDraft {
  id: string;
  orderId: string;
  content: string;
  riskTags: string[];
  complexity: 'low' | 'middle' | 'high';
  complexityReason: string;
  createdAt: string;
}
