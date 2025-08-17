// Server-Sent Events endpoint for real-time file watcher updates
import { NextRequest } from 'next/server';
import { globalFileWatcher } from '@/lib/fileWatcher';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return new Response('Project ID is required', { status: 400 });
  }

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const encoder = new TextEncoder();
      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      sendEvent('connected', { 
        projectId, 
        timestamp: new Date().toISOString(),
        message: 'Connected to cloud project events'
      });

      // Set up event listeners for cloud project changes
      const handleProjectChanged = (event: any) => {
        if (event.projectId === projectId) {
          sendEvent('projectChanged', event);
        }
      };

      const handleRequirementsChanged = (event: any) => {
        if (event.projectId === projectId) {
          sendEvent('requirementsChanged', event);
        }
      };

      const handleDesignChanged = (event: any) => {
        if (event.projectId === projectId) {
          sendEvent('designChanged', event);
        }
      };

      const handleTasksChanged = (event: any) => {
        if (event.projectId === projectId) {
          sendEvent('tasksChanged', event);
        }
      };

      const handleProgressChanged = (event: any) => {
        if (event.projectId === projectId) {
          sendEvent('progressChanged', event);
        }
      };

      const handleContextChanged = (event: any) => {
        if (event.projectId === projectId) {
          sendEvent('contextChanged', event);
        }
      };

      // Register event listeners (for cloud projects, these would be triggered by API calls)
      // For now, we'll just send periodic updates since we don't have real-time file watching

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        sendEvent('heartbeat', { 
          timestamp: new Date().toISOString(),
          isWatching: true // Cloud projects are always "watched"
        });
      }, 30000); // Every 30 seconds

      // Clean up when connection closes
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        globalFileWatcher.off('fileChanged', handleFileChanged);
        globalFileWatcher.off('requirementsChanged', handleRequirementsChanged);
        globalFileWatcher.off('designChanged', handleDesignChanged);
        globalFileWatcher.off('tasksChanged', handleTasksChanged);
        globalFileWatcher.off('configChanged', handleConfigChanged);
        globalFileWatcher.off('progressChanged', handleProgressChanged);
        globalFileWatcher.off('contextChanged', handleContextChanged);
        globalFileWatcher.off('integrityWarning', handleIntegrityWarning);
        globalFileWatcher.off('watcherError', handleWatcherError);
      };

      // Handle client disconnect
      request.signal?.addEventListener('abort', () => {
        cleanup();
        controller.close();
      });

      // Store cleanup function for potential future use
      (controller as any).cleanup = cleanup;
    },

    cancel() {
      // Additional cleanup if needed
      console.log(`SSE connection closed for project: ${projectPath}`);
    }
  });

  // Return Server-Sent Events response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}