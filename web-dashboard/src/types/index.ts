// Re-export shared types for web dashboard
export * from './shared';

// Web dashboard specific types
export interface DashboardProps {
  projectId: string;
}

export interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  language: 'markdown' | 'json';
  autoSave?: boolean;
}

export interface ProjectListItem {
  id: string;
  name: string;
  description: string;
  lastModified: Date;
  progress: number;
  isPublic?: boolean;
  isShared?: boolean;
  sharedRole?: string;
  isOwned?: boolean;
}