import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from './pinecone';
import { ProjectConfiguration, ProjectListItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { embeddingService } from './embeddingService';
import { pineconeOperationsService } from './pineconeOperationsService';
import { PineconeUtils } from './pineconeUtils';
import { validateProjectContext, truncateProjectFields } from './contextValidation';
import { SupabaseService, Project as SupabaseProject } from './supabase';

export function createVectorId(type: string, id: string): string {
  return `${type}:${id}`;
}

export interface UserProject extends ProjectConfiguration {
  userId: string;
}

export class ProjectService {
  private static instance: ProjectService;
  private supabaseService: SupabaseService;

  constructor() {
    this.supabaseService = SupabaseService.getInstance();
  }

  static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  async createProject(userId: string, projectData: Omit<ProjectConfiguration, 'projectId' | 'createdAt' | 'lastModified'>): Promise<ProjectListItem> {
    const projectId = uuidv4();
    const now = new Date().toISOString();

    const { contextPreferences, ...restProjectData } = projectData;

    // Validate and truncate project data to prevent context length issues
    const contextValidation = validateProjectContext({
      name: restProjectData.name,
      description: restProjectData.description,
      template: restProjectData.template,
      requirements: restProjectData.requirements,
      design: restProjectData.design,
      tasks: restProjectData.tasks
    }, restProjectData.aiModel?.includes('gemini') ? 'google' : 'openai');

    if (!contextValidation.isValid) {
      console.warn('Project creation context validation:', contextValidation.warning);
      // Apply field truncation to prevent future issues
      const truncatedFields = truncateProjectFields({
        name: restProjectData.name,
        description: restProjectData.description,
        requirements: restProjectData.requirements,
        design: restProjectData.design,
        tasks: restProjectData.tasks
      });
      
      // Update project data with truncated fields
      Object.assign(restProjectData, truncatedFields);
    }

    // Create project in Supabase first
    const supabaseProjectData = {
      id: projectId,
      user_id: userId,
      name: restProjectData.name,
      description: restProjectData.description,
      template: restProjectData.template,
      custom_template: (restProjectData as any).customTemplate,
      industry: restProjectData.industry || 'other',
      custom_industry: (restProjectData as any).customIndustry,
      business_model: (restProjectData as any).businessModel || [],
      ai_model: restProjectData.aiModel || 'gpt-4',
      technology_stack: (restProjectData as any).technologyStack,
      regulatory_compliance: (restProjectData as any).regulatoryCompliance,
      is_public: projectData.isPublic || false,
      requirements: restProjectData.requirements,
      design: restProjectData.design,
      tasks: restProjectData.tasks,
      progress: (restProjectData as any).progress,
      context_preferences: {
        ...{
          maxContextSize: 8000,
          prioritizeRecent: true,
          includeProgress: true
        },
        ...(contextPreferences || {})
      },
      token_tracking: {
        totalTokens: 0,
        totalCost: 0,
        lastUpdated: now
      },
      analysis_data: (restProjectData as any).analysisData
    };

    // Store in Supabase
    const supabaseProject = await this.supabaseService.createProject(supabaseProjectData);

    // Note: Embeddings will be generated after enhanced specs are created
    // This avoids generating embeddings for incomplete project data

    return {
      id: projectId,
      name: supabaseProject.name,
      description: supabaseProject.description,
      lastModified: new Date(supabaseProject.updated_at),
      progress: 0
    };
  }

  private async syncToPinecone(project: SupabaseProject, embedding: number[]): Promise<void> {
    try {
      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      const vectorId = createVectorId('user-project', project.id);

      await index.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([
        {
          id: vectorId,
          values: embedding,
          metadata: {
            userId: project.user_id,
            projectId: project.id,
            name: project.name,
            description: project.description,
            template: project.template,
            createdAt: project.created_at,
            lastModified: project.updated_at,
            isPublic: project.is_public,
            type: 'user-project',
            projectData: JSON.stringify(project)
          }
        }
      ]);
    } catch (error) {
      console.error('Failed to sync project to Pinecone:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for a project after it's been fully created with specs
   */
  async generateProjectEmbeddings(projectId: string): Promise<void> {
    try {
      // Get the complete project data from Supabase
      const project = await this.supabaseService.getProject(projectId);
      if (!project) {
        console.warn(`Project ${projectId} not found for embedding generation`);
        return;
      }

      // Generate embedding for the complete project description
      const embedding = await embeddingService.generateEmbedding(project.description);

      // Store in Pinecone for vector search (async, don't wait)
      this.syncToPinecone(project, embedding).catch(error => {
        console.warn('Failed to sync project to Pinecone:', error);
      });

      console.log(`✅ Generated embeddings for project ${projectId}`);
    } catch (error) {
      console.error(`❌ Failed to generate embeddings for project ${projectId}:`, error);
    }
  }

  async getUserProjects(userId: string): Promise<ProjectListItem[]> {
    try {
      const projects = await this.supabaseService.getUserProjects(userId);
      
      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        lastModified: new Date(project.updated_at),
        progress: project.progress?.percentage || 0,
        isPublic: project.is_public
      }));
    } catch (error) {
      console.error('Failed to get user projects from Supabase:', error);
      // Fallback to Pinecone if Supabase fails
      return this.getUserProjectsFromPinecone(userId);
    }
  }

  private async getUserProjectsFromPinecone(userId: string): Promise<ProjectListItem[]> {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const queryResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
      vector: new Array(1024).fill(0), // Placeholder query vector (match Pinecone index dimension)
      filter: {
        userId: { $eq: userId },
        type: { $eq: 'user-project' }
      },
      topK: 100,
      includeMetadata: true
    });

    return queryResponse.matches?.map((match: any) => {
      const metadata = match.metadata;
      if (!metadata) return null;

      return {
        id: metadata.projectId as string,
        name: metadata.name as string,
        description: metadata.description as string,
        lastModified: new Date(metadata.lastModified as string),
        progress: 0, // TODO: Calculate from project data
        isPublic: metadata.isPublic as boolean || false
      };
    }).filter(Boolean) as ProjectListItem[] || [];
  }

  async getPublicProjects(excludeUserId?: string): Promise<ProjectListItem[]> {
    try {
      const projects = await this.supabaseService.getPublicProjects(excludeUserId);
      
      return projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        lastModified: new Date(project.updated_at),
        progress: project.progress?.percentage || 0,
        isPublic: project.is_public
      }));
    } catch (error) {
      console.error('Failed to get public projects from Supabase:', error);
      // Fallback to Pinecone if Supabase fails
      return this.getPublicProjectsFromPinecone(excludeUserId);
    }
  }

  private async getPublicProjectsFromPinecone(excludeUserId?: string): Promise<ProjectListItem[]> {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const filter: any = {
      isPublic: { $eq: true },
      type: { $eq: 'user-project' }
    };

    if (excludeUserId) {
      filter.userId = { $ne: excludeUserId };
    }

    const queryResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).query({
      vector: new Array(1024).fill(0), // Placeholder query vector
      filter,
      topK: 100,
      includeMetadata: true
    });

    return queryResponse.matches?.map((match: any) => {
      const metadata = match.metadata;
      if (!metadata) return null;

      return {
        id: metadata.projectId as string,
        name: metadata.name as string,
        description: metadata.description as string,
        lastModified: new Date(metadata.lastModified as string),
        progress: 0, // TODO: Calculate from project data
        isPublic: metadata.isPublic as boolean || false
      };
    }).filter(Boolean) as ProjectListItem[] || [];
  }

  async getProject(userId: string, projectId: string): Promise<UserProject | null> {
    try {
      // Try to get from Supabase first
      const supabaseProject = await this.supabaseService.getProject(projectId, userId);
      
      if (supabaseProject) {
        // Convert Supabase project to UserProject format
        const userProject: UserProject = {
          projectId: supabaseProject.id,
          userId: supabaseProject.user_id,
          name: supabaseProject.name,
          description: supabaseProject.description,
          template: supabaseProject.template,
          customTemplate: supabaseProject.custom_template,
          industry: supabaseProject.industry,
          customIndustry: supabaseProject.custom_industry,
          businessModel: supabaseProject.business_model,
          aiModel: supabaseProject.ai_model,
          technologyStack: supabaseProject.technology_stack,
          regulatoryCompliance: supabaseProject.regulatory_compliance,
          isPublic: supabaseProject.is_public,
          requirements: supabaseProject.requirements,
          design: supabaseProject.design,
          tasks: supabaseProject.tasks,
          progress: supabaseProject.progress,
          contextPreferences: supabaseProject.context_preferences,
          tokenTracking: supabaseProject.token_tracking,
          analysisData: supabaseProject.analysis_data,
          createdAt: supabaseProject.created_at,
          lastModified: supabaseProject.updated_at
        };
        
        return userProject;
      }
    } catch (error) {
      console.error('Failed to get project from Supabase:', error);
    }

    // Fallback to Pinecone if Supabase fails
    return this.getProjectFromPinecone(userId, projectId);
  }

  private async getProjectFromPinecone(userId: string, projectId: string): Promise<UserProject | null> {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    const fetchResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([vectorId]);
    const record = fetchResponse.records?.[vectorId];

    if (!record?.metadata) {
      return null;
    }

    // Check if project is public or user owns it
    const isPublic = record.metadata.isPublic as boolean || false;
    if (!isPublic && record.metadata.userId !== userId) {
      return null;
    }

    try {
      const projectData = JSON.parse(record.metadata.projectData as string) as UserProject;
      return projectData;
    } catch (error) {
      console.error('Failed to parse project data:', error);
      return null;
    }
  }

  async updateProject(userId: string, projectId: string, updates: Partial<UserProject>): Promise<boolean> {
    try {
      // Get existing project to verify ownership
      const existingProject = await this.supabaseService.getProject(projectId, userId);
      
      if (!existingProject) {
        return false; // Project not found or user doesn't own it
      }

      // Convert UserProject updates to Supabase format
      const supabaseUpdates: any = {};
      
      if (updates.name !== undefined) supabaseUpdates.name = updates.name;
      if (updates.description !== undefined) supabaseUpdates.description = updates.description;
      if (updates.template !== undefined) supabaseUpdates.template = updates.template;
      if (updates.customTemplate !== undefined) supabaseUpdates.custom_template = updates.customTemplate;
      if (updates.industry !== undefined) supabaseUpdates.industry = updates.industry;
      if (updates.customIndustry !== undefined) supabaseUpdates.custom_industry = updates.customIndustry;
      if (updates.businessModel !== undefined) supabaseUpdates.business_model = updates.businessModel;
      if (updates.aiModel !== undefined) supabaseUpdates.ai_model = updates.aiModel;
      if (updates.technologyStack !== undefined) supabaseUpdates.technology_stack = updates.technologyStack;
      if (updates.regulatoryCompliance !== undefined) supabaseUpdates.regulatory_compliance = updates.regulatoryCompliance;
      if (updates.isPublic !== undefined) supabaseUpdates.is_public = updates.isPublic;
      if (updates.requirements !== undefined) supabaseUpdates.requirements = updates.requirements;
      if (updates.design !== undefined) supabaseUpdates.design = updates.design;
      if (updates.tasks !== undefined) supabaseUpdates.tasks = updates.tasks;
      if (updates.progress !== undefined) supabaseUpdates.progress = updates.progress;
      if (updates.contextPreferences !== undefined) supabaseUpdates.context_preferences = updates.contextPreferences;
      if (updates.tokenTracking !== undefined) supabaseUpdates.token_tracking = updates.tokenTracking;
      if (updates.analysisData !== undefined) supabaseUpdates.analysis_data = updates.analysisData;

      // Update in Supabase
      const updatedProject = await this.supabaseService.updateProject(projectId, supabaseUpdates);

      // Sync to Pinecone for vector search (async, don't wait)
      this.syncUpdatedProjectToPinecone(updatedProject).catch(error => {
        console.warn('Failed to sync updated project to Pinecone:', error);
      });

      return true;
    } catch (error) {
      console.error('Failed to update project:', error);
      return false;
    }
  }

  private async syncUpdatedProjectToPinecone(project: SupabaseProject): Promise<void> {
    try {
      // Generate embedding for the updated project
      const embedding = await embeddingService.generateEmbedding(project.description);

      const pinecone = getPineconeClient();
      const index = pinecone.index(PINECONE_INDEX_NAME);
      const vectorId = createVectorId('user-project', project.id);

      await index.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([
        {
          id: vectorId,
          values: embedding,
          metadata: {
            userId: project.user_id,
            projectId: project.id,
            name: project.name,
            description: project.description,
            template: project.template,
            createdAt: project.created_at,
            lastModified: project.updated_at,
            isPublic: project.is_public,
            type: 'user-project',
            projectData: JSON.stringify(project)
          }
        }
      ]);
    } catch (error) {
      console.error('Failed to sync updated project to Pinecone:', error);
      throw error;
    }
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    try {
      // Delete from Supabase first
      await this.supabaseService.deleteProject(projectId, userId);
      
      // Also delete from Pinecone
      const deletePinecone = getPineconeClient();
      const deleteIndex = deletePinecone.index(PINECONE_INDEX_NAME);
      const deleteVectorId = createVectorId('user-project', projectId);
      
      await deleteIndex.namespace(PINECONE_NAMESPACE_PROJECTS).deleteOne(deleteVectorId);
      
      return true;
    } catch (error) {
      console.error('Failed to delete project:', error);
      return false;
    }
  }
}