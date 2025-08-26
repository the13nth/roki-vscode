import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ContextDocument } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';
import { ProjectService } from '@/lib/projectService';
import { getPineconeClient } from '@/lib/pinecone';
import { PINECONE_NAMESPACE_PROJECTS } from '@/lib/pinecone';
import { createVectorId } from '@/lib/projectService';

// GET /api/projects/[id]/context - Get all context documents
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const tags = searchParams.get('tags')?.split(',').filter(Boolean);
    const search = searchParams.get('search');

    console.log('Loading context documents for project:', id, 'for user:', userId);

    // Use ProjectService to get project from database
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Query Pinecone for context documents
    let contextDocs: ContextDocument[] = [];
    
    try {
      console.log('🔍 Querying Pinecone for context documents in project:', id);
      
      const pinecone = getPineconeClient();
      const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
      
      // Query for context documents specifically
      const queryResponse = await index.query({
        vector: new Array(1024).fill(0), // Match the index dimension
        filter: {
          projectId: { $eq: id },
          type: { $eq: 'context' } // Filter for context documents only
        },
        topK: 100,
        includeMetadata: true,
        includeValues: false // We don't need the vectors for display
      });
      
      console.log(`📄 Found ${queryResponse.matches.length} context documents for project ${id}`);
      
      // Convert Pinecone matches to ContextDocument format
      contextDocs = queryResponse.matches
        .filter(match => match.metadata)
        .map(match => {
          const metadata = match.metadata!;
          
          return {
            id: match.id,
            filename: (typeof metadata.filename === 'string' ? metadata.filename : 
                      `${metadata.title || 'untitled'}.md`),
            title: (typeof metadata.title === 'string' ? metadata.title : 'Untitled Document'),
            content: (typeof metadata.content === 'string' ? metadata.content : ''),
            tags: (typeof metadata.tags === 'string' ? 
                   metadata.tags.split(',').map(t => t.trim()).filter(Boolean) : []),
            category: (typeof metadata.category === 'string' ? metadata.category : 'other'),
            lastModified: (typeof metadata.lastModified === 'string' ? 
                          new Date(metadata.lastModified) : new Date()),
            url: (typeof metadata.url === 'string' ? metadata.url : undefined),
            relevanceScore: (typeof match.score === 'number' ? match.score : undefined)
          } as ContextDocument;
        });
        
      console.log(`✅ Successfully converted ${contextDocs.length} context documents`);
      
    } catch (error) {
      console.error('❌ Failed to query context documents from Pinecone:', error);
      // Continue with empty array but log the error
    }

    // Apply filters (when we have actual data)
    let filteredDocs = contextDocs;
    
    if (category) {
      filteredDocs = filteredDocs.filter(doc => doc.category === category);
    }
    
    if (tags && tags.length > 0) {
      filteredDocs = filteredDocs.filter(doc => 
        tags.some(tag => doc.tags.includes(tag))
      );
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredDocs = filteredDocs.filter(doc => 
        doc.title.toLowerCase().includes(searchLower) || 
        doc.content.toLowerCase().includes(searchLower)
      );
    }

    // Sort by last modified (newest first)
    filteredDocs.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

    console.log(`Found ${filteredDocs.length} context documents for project ${id}`);

    return NextResponse.json({ contextDocs: filteredDocs });
  } catch (error) {
    console.error('Failed to get context documents:', error);
    return NextResponse.json(
      { error: 'Failed to load context documents' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/context - Create new context document
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
    const { title, content, tags, category, filename, url } = await request.json();

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    console.log('Creating context document for project:', id, 'by user:', userId);

    // Verify project exists and user owns it
    const projectService = ProjectService.getInstance();
    
    // For context document creation, we need to explicitly check ownership regardless of public status
    const pinecone = getPineconeClient();
    const index = pinecone.index(process.env.NEXT_PUBLIC_PINECONE_INDEX_NAME || 'roki');
    const vectorId = createVectorId('user-project', id);

    const fetchResponse = await index.namespace(PINECONE_NAMESPACE_PROJECTS).fetch([vectorId]);
    const record = fetchResponse.records?.[vectorId];

    if (!record?.metadata) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Only the owner can add context documents, regardless of public status
    if (record.metadata.userId !== userId) {
      return NextResponse.json(
        { error: 'Access denied. Only the project owner can add context documents.' },
        { status: 403 }
      );
    }

    // Get the project data
    let project: any;
    try {
      project = JSON.parse(record.metadata.projectData as string);
    } catch (error) {
      console.error('Failed to parse project data:', error);
      return NextResponse.json(
        { error: 'Project data corrupted' },
        { status: 500 }
      );
    }

    // Generate document ID and metadata
    const docId = uuidv4();
    const safeFilename = filename || `${title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.md`;

    const newDoc: ContextDocument = {
      id: docId,
      filename: safeFilename,
      title,
      content,
      tags: tags || [],
      category: category || 'other',
      lastModified: new Date(),
      url: url || undefined
    };

    // Store the context document directly in Pinecone as an embedding
    try {
      const embedResult = await PineconeSyncServiceInstance.embedSingleContextDocument(id, newDoc);
      if (embedResult.success) {
        console.log(`Successfully embedded new context document: ${newDoc.title}`);
        
        return NextResponse.json({ contextDoc: newDoc }, { status: 201 });
      } else {
        console.error(`Failed to embed context document: ${embedResult.message}`);
        return NextResponse.json(
          { error: 'Failed to save context document' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Failed to save context document:', error);
      return NextResponse.json(
        { error: 'Failed to save context document' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Failed to create context document:', error);
    return NextResponse.json(
      { error: 'Failed to create context document' },
      { status: 500 }
    );
  }
}