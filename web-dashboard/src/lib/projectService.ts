import { getPineconeClient, PINECONE_INDEX_NAME, PINECONE_NAMESPACE_PROJECTS } from './pinecone';
import { ProjectConfiguration, ProjectListItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Helper functions
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Use Gemini for embeddings
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${process.env.GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }]
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini embedding API error: ${response.status}`);
    }

    const data = await response.json();
    const geminiEmbedding = data.embedding.values;
    
    // Pad Gemini's 768-dimensional embedding to 1024 dimensions to match Pinecone index
    if (geminiEmbedding.length < 1024) {
      const paddedEmbedding = [...geminiEmbedding];
      while (paddedEmbedding.length < 1024) {
        paddedEmbedding.push(0);
      }
      return paddedEmbedding;
    } else if (geminiEmbedding.length > 1024) {
      // Truncate if somehow longer than expected
      return geminiEmbedding.slice(0, 1024);
    }
    
    return geminiEmbedding;
  } catch (error) {
    console.error('Failed to generate embedding with Gemini:', error);
    // Fallback to a simple hash-based embedding
    const hash = text.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    // Create a 1024-dimensional vector to match Pinecone index
    const vector = new Array(1024).fill(0);
    for (let i = 0; i < 1024; i++) {
      vector[i] = Math.sin(hash + i) * 0.1;
    }
    return vector;
  }
}

function createVectorId(type: string, id: string): string {
  return `${type}:${id}`;
}

export interface UserProject extends ProjectConfiguration {
  userId: string;
}

export class ProjectService {
  private static instance: ProjectService;

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

    const project: UserProject = {
      ...restProjectData,
      projectId,
      userId,
      createdAt: now,
      lastModified: now,
      tokenTracking: {
        totalTokens: 0,
        totalCost: 0,
        lastUpdated: now
      },
      contextPreferences: {
        ...{
          maxContextSize: 8000,
          prioritizeRecent: true,
          includeProgress: true
        },
        ...(contextPreferences || {})
      }
    };

    // Generate embedding for the project description
    const embedding = await generateEmbedding(project.description);

    // Store in Pinecone
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    await index.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          userId,
          projectId,
          name: project.name,
          description: project.description,
          template: project.template,
          createdAt: now,
          lastModified: now,
          type: 'user-project',
          projectData: JSON.stringify(project)
        }
      }
    ]);

    return {
      id: projectId,
      name: project.name,
      description: project.description,
      lastModified: new Date(now),
      progress: 0
    };
  }

  async getUserProjects(userId: string): Promise<ProjectListItem[]> {
    // Query projects for this user
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
        progress: 0 // TODO: Calculate from project data
      };
    }).filter(Boolean) as ProjectListItem[] || [];
  }

  async getProject(userId: string, projectId: string): Promise<UserProject | null> {
    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    const fetchResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([vectorId]);
    const record = fetchResponse.records?.[vectorId];

    if (!record?.metadata) {
      return null;
    }

    // Verify user ownership
    if (record.metadata.userId !== userId) {
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
    const existingProject = await this.getProject(userId, projectId);
    if (!existingProject) {
      return false;
    }

    const updatedProject: UserProject = {
      ...existingProject,
      ...updates,
      projectId, // Ensure ID doesn't change
      userId, // Ensure user doesn't change
      lastModified: new Date().toISOString()
    };

    // Generate new embedding if description changed
    const embedding = updates.description ?
      await generateEmbedding(updatedProject.description) :
      new Array(1024).fill(0); // Keep existing embedding (match Pinecone index dimension)

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    await index.namespace(PINECONE_NAMESPACE_PROJECTS).upsert([
      {
        id: vectorId,
        values: embedding,
        metadata: {
          userId,
          projectId,
          name: updatedProject.name,
          description: updatedProject.description,
          template: updatedProject.template,
          createdAt: updatedProject.createdAt,
          lastModified: updatedProject.lastModified,
          type: 'user-project',
          projectData: JSON.stringify(updatedProject)
        }
      }
    ]);

    return true;
  }

  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const existingProject = await this.getProject(userId, projectId);
    if (!existingProject) {
      return false;
    }

    const pinecone = getPineconeClient();
    const index = pinecone.index(PINECONE_INDEX_NAME);
    const vectorId = createVectorId('user-project', projectId);

    await index.namespace(PINECONE_NAMESPACE_PROJECTS).deleteOne(vectorId);
    return true;
  }
}