// Shared TypeScript interfaces for AI Project Manager

export interface ProjectDocuments {
  requirements: string;
  design: string;
  tasks: string;
}

export interface ActivityItem {
  taskId: string;
  title: string;
  completedAt: Date;
  completedBy: 'manual' | 'auto-detection';
}

export interface Milestone {
  name: string;
  targetDate: string;
  progress: number;
}

export interface ProgressData {
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  lastUpdated: Date;
  recentActivity: ActivityItem[];
  milestones?: Milestone[];
}

export interface ContextDocument {
  id: string;
  filename: string;
  title: string;
  content: string;
  tags: string[];
  category: 'api' | 'design' | 'research' | 'requirements' | 'meeting-minutes' | 'news-article' | 'social-media-post' | 'contract' | 'invoice' | 'other';
  lastModified: Date;
  relevanceScore?: number;
  url?: string;
}

export interface TechnologyStack {
  backend?: string;
  frontend?: string;
  uiFramework?: string;
  authentication?: string;
  hosting?: string;
}

export interface ProjectConfiguration {
  projectId: string;
  name: string;
  description: string;
  template: string;
  createdAt: string;
  lastModified: string;
  aiModel: string;
  originalPath?: string; // For imported projects
  technologyStack?: TechnologyStack;
  requirements?: string; // Generated requirements document
  design?: string; // Generated design document
  tasks?: string; // Generated tasks document
  isPublic?: boolean; // Whether the project is visible to everyone
  ownerId: string; // Project owner's user ID
  teamId?: string; // Associated team ID if part of a team
  sharedWith?: string[]; // Array of user emails the project is shared with
  tokenTracking?: {
    totalTokens: number;
    totalCost: number;
    lastUpdated: string;
  };
  contextPreferences: {
    maxContextSize: number;
    prioritizeRecent: boolean;
    includeProgress: boolean;
  };
}

export interface ProjectStructure {
  configPath: string;
  requirementsPath: string;
  designPath: string;
  tasksPath: string;
  progressPath: string;
  contextDir: string;
  isValid: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ProjectContext {
  currentTask?: string;
  requirementsSummary: string;
  relevantContextDocs: ContextDocument[];
  progressSummary: string;
}

// VS Code Extension specific interfaces
export interface ProjectDetector {
  detectAiProject(): boolean;
  getProjectStructure(): ProjectStructure;
  validateProjectFiles(): ValidationResult;
}

export interface ContextInjector {
  getCurrentContext(): ProjectContext;
  formatContextForAI(): string;
  selectRelevantDocs(currentFile: string): ContextDocument[];
}

export interface ProgressTracker {
  updateProgress(): void;
  detectTaskCompletion(filePath: string): boolean;
  syncWithDashboard(): void;
}

export interface FileWatcher {
  startWatching(projectPath: string): void;
  stopWatching(): void;
  onFileChange(callback: (filePath: string) => void): void;
}

// Web Dashboard specific interfaces
export interface ProjectDashboard {
  projectId: string;
  name: string;
  projectPath: string;
  documents: ProjectDocuments;
  progress: ProgressData;
  contextDocs: ContextDocument[];
  isOwned?: boolean;
  isPublic?: boolean;
}

export interface VSCodeExtension {
  projectDetector: ProjectDetector;
  contextInjector: ContextInjector;
  progressTracker: ProgressTracker;
  fileWatcher: FileWatcher;
}

// Team Collaboration Types
export interface Team {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
  isActive: boolean;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  email: string;
  role: TeamRole;
  joinedAt: Date;
  invitedAt: Date;
  status: 'pending' | 'active' | 'inactive';
  invitedBy: string;
}

export type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface ProjectSharing {
  id: string;
  projectId: string;
  teamId?: string;
  sharedWithUserId?: string;
  sharedWithEmail: string;
  role: TeamRole;
  sharedAt: Date;
  sharedBy: string;
  status: 'active' | 'revoked';
}

export interface TeamProject {
  id: string;
  teamId: string;
  projectId: string;
  addedAt: Date;
  addedBy: string;
  projectRole: TeamRole; // Role the project has within the team
}

export interface TeamProjectWithDetails extends ProjectConfiguration {
  teamRole: TeamRole;
  addedAt: Date;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  email: string;
  role: TeamRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'declined';
  token: string;
}