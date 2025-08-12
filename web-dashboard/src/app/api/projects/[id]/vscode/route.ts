import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

interface VSCodeConnection {
  connected: boolean;
  lastSeen: string;
  version?: string;
  workspacePath?: string;
}

const CONNECTIONS_FILE = '.vscode-connections.json';

function getConnectionsPath(projectId: string): string {
  return path.join(process.cwd(), '.ai-project', CONNECTIONS_FILE);
}

function loadConnections(): Record<string, VSCodeConnection> {
  try {
    const connectionsPath = getConnectionsPath('');
    if (fs.existsSync(connectionsPath)) {
      const content = fs.readFileSync(connectionsPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading VS Code connections:', error);
  }
  return {};
}

function saveConnections(connections: Record<string, VSCodeConnection>): void {
  try {
    const connectionsPath = getConnectionsPath('');
    const dir = path.dirname(connectionsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(connectionsPath, JSON.stringify(connections, null, 2));
  } catch (error) {
    console.error('Error saving VS Code connections:', error);
  }
}

// GET /api/projects/[id]/vscode - Get VS Code connection status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const connections = loadConnections();
    const connection = connections[projectId];

    // Check if connection is recent (within last 30 seconds)
    const isRecentlyConnected = connection &&
      (Date.now() - new Date(connection.lastSeen).getTime()) < 30000;

    return NextResponse.json({
      connected: isRecentlyConnected || false,
      lastSeen: connection?.lastSeen || null,
      version: connection?.version || null,
      workspacePath: connection?.workspacePath || null
    });
  } catch (error) {
    console.error('Error getting VS Code connection status:', error);
    return NextResponse.json(
      { error: 'Failed to get connection status' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/vscode - Update VS Code connection status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const body = await request.json();

    const connections = loadConnections();
    connections[projectId] = {
      connected: true,
      lastSeen: new Date().toISOString(),
      version: body.version || 'unknown',
      workspacePath: body.workspacePath || ''
    };

    saveConnections(connections);

    return NextResponse.json({
      success: true,
      message: 'VS Code connection updated'
    });
  } catch (error) {
    console.error('Error updating VS Code connection:', error);
    return NextResponse.json(
      { error: 'Failed to update connection' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/vscode - Disconnect VS Code
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: projectId } = await params;
    const connections = loadConnections();

    if (connections[projectId]) {
      connections[projectId].connected = false;
      connections[projectId].lastSeen = new Date().toISOString();
      saveConnections(connections);
    }

    return NextResponse.json({
      success: true,
      message: 'VS Code disconnected'
    });
  } catch (error) {
    console.error('Error disconnecting VS Code:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

