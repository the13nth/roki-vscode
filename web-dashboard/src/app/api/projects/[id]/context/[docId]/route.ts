import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ContextDocument } from '@/types';
import { PineconeSyncServiceInstance } from '@/lib/pineconeSyncService';
import { ProjectService } from '@/lib/projectService';

// GET /api/projects/[id]/context/[docId] - Get specific context document from Pinecone
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, docId } = await params;

    console.log(`📄 Getting context document from Pinecone - Project: ${id}, Document: ${docId}`);

    // Verify project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get document from Pinecone
    const result = await PineconeSyncServiceInstance.getContextDocument(id, docId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ contextDoc: result.document });
  } catch (error) {
    console.error('Failed to get context document:', error);
    return NextResponse.json(
      { error: 'Failed to load context document' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/context/[docId] - Update context document in Pinecone
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, docId } = await params;
    const { title, content, tags, category, url } = await request.json();

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    console.log(`🔄 Updating context document in Pinecone - Project: ${id}, Document: ${docId}`);

    // Verify project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // First check if document exists
    const existingResult = await PineconeSyncServiceInstance.getContextDocument(id, docId);
    if (!existingResult.success) {
      return NextResponse.json(
        { error: 'Context document not found' },
        { status: 404 }
      );
    }

    // Prepare updated document
    const updatedDoc: ContextDocument = {
      id: docId,
      filename: existingResult.document.filename || `${title.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase()}.md`,
      title,
      content,
      tags: tags || [],
      category: category || 'other',
      lastModified: new Date(),
      url: url || undefined
    };

    // Update document in Pinecone
    const updateResult = await PineconeSyncServiceInstance.updateContextDocument(id, docId, updatedDoc);
    
    if (!updateResult.success) {
      console.error(`Failed to update context document: ${updateResult.message}`);
      return NextResponse.json(
        { error: 'Failed to update context document' },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully updated context document: ${updatedDoc.title}`);
    return NextResponse.json({ contextDoc: updatedDoc });
  } catch (error) {
    console.error('Failed to update context document:', error);
    return NextResponse.json(
      { error: 'Failed to update context document' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/context/[docId] - Delete context document from Pinecone
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id, docId } = await params;

    console.log(`🗑️ Deleting context document from Pinecone - Project: ${id}, Document: ${docId}`);

    // Verify project exists
    const projectService = ProjectService.getInstance();
    const project = await projectService.getProject(userId, id);

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete from Pinecone vector database directly
    const pineconeDeleteResult = await PineconeSyncServiceInstance.deleteContextDocument(id, docId);
    
    if (!pineconeDeleteResult.success) {
      console.warn(`⚠️ Failed to delete context document from Pinecone: ${pineconeDeleteResult.message}`);
      return NextResponse.json(
        { error: `Failed to delete from Pinecone: ${pineconeDeleteResult.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted context document from Pinecone: ${docId}`);

    return NextResponse.json({ 
      success: true,
      message: 'Context document deleted successfully from Pinecone',
      documentId: docId,
      projectId: id,
      pineconeSync: pineconeDeleteResult 
    });
  } catch (error) {
    console.error('Failed to delete context document:', error);
    return NextResponse.json(
      { error: 'Failed to delete context document' },
      { status: 500 }
    );
  }
}