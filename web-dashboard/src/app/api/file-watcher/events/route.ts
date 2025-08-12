// Server-Sent Events endpoint for real-time file watcher updates
import { NextRequest } from 'next/server';
import { globalFileWatcher } from '@/lib/fileWatcher';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const projectPath = searchParams.get('projectPath');

  if (!projectPath) {
    return new Response('Project path is required', { status: 400 });
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
        projectPath, 
        timestamp: new Date().toISOString(),
        message: 'Connected to file watcher events'
      });

      // Set up event listeners for file changes
      const handleFileChanged = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('fileChanged', event);
        }
      };

      const handleRequirementsChanged = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('requirementsChanged', event);
        }
      };

      const handleDesignChanged = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('designChanged', event);
        }
      };

      const handleTasksChanged = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('tasksChanged', event);
        }
      };

      const handleConfigChanged = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('configChanged', event);
        }
      };

      const handleProgressChanged = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('progressChanged', event);
        }
      };

      const handleContextChanged = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('contextChanged', event);
        }
      };

      const handleIntegrityWarning = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('integrityWarning', event);
        }
      };

      const handleWatcherError = (event: any) => {
        if (event.projectPath === projectPath) {
          sendEvent('watcherError', event);
        }
      };

      // Register event listeners
      globalFileWatcher.on('fileChanged', handleFileChanged);
      globalFileWatcher.on('requirementsChanged', handleRequirementsChanged);
      globalFileWatcher.on('designChanged', handleDesignChanged);
      globalFileWatcher.on('tasksChanged', handleTasksChanged);
      globalFileWatcher.on('configChanged', handleConfigChanged);
      globalFileWatcher.on('progressChanged', handleProgressChanged);
      globalFileWatcher.on('contextChanged', handleContextChanged);
      globalFileWatcher.on('integrityWarning', handleIntegrityWarning);
      globalFileWatcher.on('watcherError', handleWatcherError);

      // Send periodic heartbeat
      const heartbeatInterval = setInterval(() => {
        sendEvent('heartbeat', { 
          timestamp: new Date().toISOString(),
          isWatching: globalFileWatcher.isWatching(projectPath)
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