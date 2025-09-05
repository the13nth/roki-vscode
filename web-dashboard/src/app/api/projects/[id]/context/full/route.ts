import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';
import { getPineconeClient } from '@/lib/pinecone';
import { pineconeOperationsService } from '@/lib/pineconeOperationsService';

interface ProjectContext {
  projectId: string;
  projectName: string;
  requirements?: string;
  design?: string;
  tasks?: string;
  progress: {
    completedTasks: number;
    totalTasks: number;
    percentage: number;
    lastUpdated: string;
    recentActivity: any[];
  };
  contextDocs: any[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: projectId } = await params;
    
    console.log('Loading full project context from Pinecone for project:', projectId);

    // Get project from Pinecone-based database
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, projectId);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const context: ProjectContext = {
      projectId,
      projectName: project.name,
      progress: {
        completedTasks: 0,
        totalTasks: 0,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
        recentActivity: []
      },
      contextDocs: []
    };

    try {
      console.log('🔍 Querying Pinecone for all project documents:', projectId);
      
      const pinecone = getPineconeClient();
      const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
      
      // Query for all documents in this project using optimized service
      const queryResponse = await pineconeOperationsService.query(
        new Array(1024).fill(0), // Match the index dimension
        {
          filter: {
            projectId: { $eq: projectId }
          },
          topK: 200, // Get more documents to include main docs + context docs
          includeMetadata: true,
          includeValues: false
        }
      );
      
      console.log(`📄 Found ${queryResponse.matches.length} total documents for project ${projectId}`);
      
      // Separate documents by type
      for (const match of queryResponse.matches) {
        if (!match.metadata) continue;
        
        const metadata = match.metadata;
        const docType = metadata.type as string;
        
        if (docType === 'context') {
          // Context documents
          context.contextDocs.push({
            id: match.id,
            name: metadata.title || 'Untitled Document',
            description: `Context document: ${metadata.title}`,
            content: metadata.content || '',
            lastModified: metadata.lastModified ? new Date(metadata.lastModified as string) : new Date(),
            category: metadata.category || 'other',
            tags: typeof metadata.tags === 'string' ? 
                  metadata.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
          });
        } else if (docType === 'requirements') {
          context.requirements = metadata.content as string;
        } else if (docType === 'design') {
          context.design = metadata.content as string;
        } else if (docType === 'tasks') {
          context.tasks = metadata.content as string;
        }
      }
      
      // Calculate basic progress from tasks if available
      if (context.tasks) {
        const taskLines = context.tasks.split('\n').filter(line => 
          line.trim().startsWith('- [') || line.trim().startsWith('* [')
        );
        const completedTasks = taskLines.filter(line => 
          line.includes('- [x]') || line.includes('* [x]')
        ).length;
        
        context.progress = {
          completedTasks,
          totalTasks: taskLines.length,
          percentage: taskLines.length > 0 ? Math.round((completedTasks / taskLines.length) * 100) : 0,
          lastUpdated: new Date().toISOString(),
          recentActivity: []
        };
      }
      
      console.log(`✅ Successfully loaded project context from Pinecone:`, {
        projectId,
        projectName: project.name,
        hasRequirements: !!context.requirements,
        hasDesign: !!context.design,
        hasTasks: !!context.tasks,
        contextDocsCount: context.contextDocs.length,
        progress: context.progress
      });
      
    } catch (error) {
      console.error('❌ Failed to query project documents from Pinecone:', error);
      // Continue with empty context but log the error
    }

    return NextResponse.json(context);
  } catch (error) {
    console.error('Failed to load project context:', error);
    return NextResponse.json(
      { error: 'Failed to load project context' },
      { status: 500 }
    );
  }
}