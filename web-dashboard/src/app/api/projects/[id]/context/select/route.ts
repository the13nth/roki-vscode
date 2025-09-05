import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ContextDocument } from '@/types';
import { ContextSelectionEngine, ContextSelectionOptions } from '@/lib/contextSelection';
import { ProjectService } from '@/lib/projectService';
import { getPineconeClient } from '@/lib/pinecone';
import { pineconeOperationsService } from '@/lib/pineconeOperationsService';

// POST /api/projects/[id]/context/select - Select relevant context documents from Pinecone
export async function POST(
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

    const { id } = await params;
    const body = await request.json();
    const {
      currentFile,
      workContext,
      maxTokens = 8000,
      maxDocuments = 5,
      categoryPreferences
    }: ContextSelectionOptions = body;

    console.log('Selecting context documents from Pinecone for project:', id);

    // Verify project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Load all context documents from Pinecone
    let documents: ContextDocument[] = [];
    
    try {
      console.log('🔍 Loading context documents from Pinecone for project:', id);
      
      const pinecone = getPineconeClient();
      const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
      
      // Query for context documents specifically using optimized service
      const queryResponse = await pineconeOperationsService.query(
        new Array(1024).fill(0), // Match the index dimension
        {
          filter: {
            projectId: { $eq: id },
            type: { $eq: 'context' }
          },
          topK: 100,
          includeMetadata: true,
          includeValues: false
        }
      );
      
      console.log(`📄 Found ${queryResponse.matches.length} context documents`);
      
      // Convert Pinecone matches to ContextDocument format
      documents = queryResponse.matches
        .filter((match: any) => match.metadata)
        .map((match: any) => {
          const metadata = match.metadata!;
          
          return {
            id: match.id,
            filename: (typeof metadata.filename === 'string' ? metadata.filename : 
                      `${metadata.title || 'untitled'}.md`),
            title: (typeof metadata.title === 'string' ? metadata.title : 'Untitled Document'),
            content: (typeof metadata.content === 'string' ? metadata.content : ''),
            tags: (typeof metadata.tags === 'string' ? 
                   metadata.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []),
            category: (typeof metadata.category === 'string' ? metadata.category : 'other'),
            lastModified: (typeof metadata.lastModified === 'string' ? 
                          new Date(metadata.lastModified) : new Date()),
            url: (typeof metadata.url === 'string' ? metadata.url : undefined),
            relevanceScore: (typeof match.score === 'number' ? match.score : undefined)
          } as ContextDocument;
        });
        
    } catch (error) {
      console.error('❌ Failed to load context documents from Pinecone:', error);
      documents = [];
    }

    if (documents.length === 0) {
      return NextResponse.json({
        selectedDocuments: [],
        formattedContext: '',
        totalDocuments: 0,
        message: 'No context documents found'
      });
    }

    try {
      // Select relevant documents using the context selection engine
      const selectedDocs = ContextSelectionEngine.selectRelevantContext(documents, {
        currentFile,
        workContext,
        maxTokens,
        maxDocuments,
        categoryPreferences
      });

      // Format the selected context for use
      const formattedContext = selectedDocs.map(doc => {
        const header = `## ${doc.title}${doc.category ? ` (${doc.category})` : ''}`;
        const tags = doc.tags && doc.tags.length > 0 ? `\n**Tags:** ${doc.tags.join(', ')}` : '';
        const url = doc.url ? `\n**Source:** ${doc.url}` : '';
        
        return `${header}${tags}${url}\n\n${doc.content}`;
      }).join('\n\n---\n\n');

      console.log(`✅ Selected ${selectedDocs.length} relevant context documents`);

      return NextResponse.json({
        selectedDocuments: selectedDocs,
        formattedContext,
        totalDocuments: documents.length,
        message: `Selected ${selectedDocs.length} of ${documents.length} available documents`
      });
    } catch (error) {
      console.error('Failed to select context documents:', error);
      return NextResponse.json({
        selectedDocuments: [],
        formattedContext: '',
        totalDocuments: documents.length,
        message: 'Failed to select relevant context'
      });
    }
  } catch (error) {
    console.error('Failed to process context selection:', error);
    return NextResponse.json(
      { error: 'Failed to select context documents' },
      { status: 500 }
    );
  }
}