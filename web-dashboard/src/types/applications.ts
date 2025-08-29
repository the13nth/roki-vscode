export interface Application {
  id: string;
  userId: string;
  projectId: string;
  name: string;
  description: string;
  deadline: string;
  prizeType: 'funding' | 'residency' | 'training' | 'other';
  prizeDetails: string;
  status: 'draft' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' | 'waitlisted';
  applicationUrl?: string;
  organizationName?: string;
  requirements?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
}

export interface ApplicationQuestion {
  id: string;
  applicationId: string;
  question: string;
  response?: string;
  generatedResponse?: string;
  keyPoints?: string[];
  suggestedImprovements?: string[];
  wordLimit?: number;
  characterLimit?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationResponse {
  response: string;
  keyPoints: string[];
  suggestedImprovements: string[];
  tokenUsage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
  };
}