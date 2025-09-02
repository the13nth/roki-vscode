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
  category: 'api' | 'design' | 'research' | 'requirements' | 'other';
  lastModified: Date;
  relevanceScore?: number;
}

export interface ProjectConfiguration {
  projectId: string;
  name: string;
  description: string;
  template: string;
  createdAt: string;
  lastModified: string;
  aiModel: string;
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
  designSummary?: string;
  tasksSummary?: string;
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
    formatContextForAI(): Promise<string>;
    selectRelevantDocs(currentFile: string): Promise<ContextDocument[]>;
}

export interface ProgressTracker {
  updateProgress(): void;
  detectTaskCompletion(filePath: string): boolean;
  syncWithDashboard(): Promise<void>;
  startAutoTracking?(): Promise<void>;
  stopAutoTracking?(): void;
  getProgressData(progressPath: string): ProgressData;
}

export interface ProjectStateUpdater {
  updateProjectState(): Promise<ProjectStateUpdate>;
}

export interface ProjectStateUpdate {
  tasks: TaskUpdate[];
  requirements: RequirementUpdate[];
  design: DesignUpdate[];
  progress: ProgressData;
  lastUpdated: Date;
}

export interface TaskUpdate {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'review' | 'done';
  progress: number;
  lastModified: Date;
  evidence: string[];
}

export interface RequirementUpdate {
  id: string;
  title: string;
  status: 'pending' | 'in-progress' | 'completed' | 'blocked';
  progress: number;
  lastModified: Date;
  evidence: string[];
}

export interface DesignUpdate {
  id: string;
  title: string;
  status: 'draft' | 'review' | 'approved' | 'implemented';
  progress: number;
  lastModified: Date;
  evidence: string[];
}

export interface ApiKeySelection {
  usePersonalApiKey: boolean;
  personalApiKey?: string;
  globalApiKey?: string;
  lastUpdated: Date;
}

export interface TaskItem {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'done';
  lineNumber: number;
  indentLevel: number;
  parentTask?: string;
  children: TaskItem[];
}

export interface TaskUpdate {
  taskId: string;
  newStatus: 'todo' | 'in-progress' | 'done';
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export interface FileWatcher {
  startWatching(projectPath: string): void;
  stopWatching(): void;
  onFileChange(callback: (filePath: string) => void): void;
}

// Web Dashboard specific interfaces
export interface ProjectDashboard {
  projectId: string;
  projectPath: string;
  documents: ProjectDocuments;
  progress: ProgressData;
  contextDocs: ContextDocument[];
}

export interface VSCodeExtension {
  projectDetector: ProjectDetector;
  contextInjector: ContextInjector;
  progressTracker: ProgressTracker;
  fileWatcher: FileWatcher;
}