# File Watcher Implementation

This document describes the real-time file synchronization system implemented for the AI Project Manager.

## Overview

The file watcher system provides real-time synchronization between the web dashboard and the file system, ensuring that changes made in either the web interface or directly to files are immediately reflected in both places.

## Components

### 1. ProjectFileWatcher (`fileWatcher.ts`)

The core file watcher implementation using chokidar:

- **Watches `.ai-project/` directories** for changes
- **Debounces file changes** to prevent excessive updates (300ms default)
- **Validates file integrity** using checksums and basic validation
- **Emits specific events** for different file types (requirements, design, tasks, etc.)
- **Handles errors gracefully** with proper cleanup

Key features:
- Atomic file operations with temporary files
- Backup creation before modifications
- File integrity validation with checksums
- Debounced change detection
- Proper cleanup on watcher shutdown

### 2. RealtimeSyncService (`realtimeSync.ts`)

Bridges file watcher events to UI updates:

- **Manages document cache** for quick access
- **Handles progress calculation** from tasks.md parsing
- **Emits UI-friendly events** for React components
- **Provides sync statistics** and status information

### 3. Server-Sent Events API (`/api/file-watcher/events/route.ts`)

Real-time communication with the frontend:

- **Streams file change events** to connected clients
- **Provides heartbeat mechanism** for connection health
- **Handles client disconnections** gracefully
- **Filters events by project** for security

### 4. React Hooks (`useRealtimeSync.ts`)

Client-side integration:

- **`useRealtimeSync`**: Manages overall sync status and SSE connection
- **`useDocumentSync`**: Handles document-specific synchronization
- **`useSyncConflicts`**: Manages conflict resolution (placeholder)

## File Change Detection

The system detects and responds to the following file changes:

- `requirements.md` → `requirementsChanged` event
- `design.md` → `designChanged` event  
- `tasks.md` → `tasksChanged` event + progress recalculation
- `config.json` → `configChanged` event
- `progress.json` → `progressChanged` event
- `context/*.md` → `contextChanged` event

## Debouncing

File changes are debounced with a 300ms delay to prevent excessive updates when multiple changes occur rapidly. This is especially important for:

- Auto-save operations in the web editor
- Batch file operations
- External editor saves that may trigger multiple events

## File Integrity Validation

When enabled, the system performs integrity checks on file changes:

- **Checksum calculation** using SHA-256
- **JSON validation** for .json files
- **Basic markdown structure** validation
- **File size warnings** for large files
- **Empty file detection**

## Error Handling

The system handles various error conditions:

- **Permission errors**: Clear error messages with resolution steps
- **File not found**: Graceful degradation with template generation
- **Watcher errors**: Automatic cleanup and restart attempts
- **Network issues**: Reconnection with exponential backoff

## API Endpoints

### GET `/api/file-watcher/status`
Returns current file watcher status and statistics.

### POST `/api/file-watcher/status`
Starts watching a project directory.

### DELETE `/api/file-watcher/status`
Stops watching a project directory.

### GET `/api/file-watcher/events?projectPath=...`
Server-Sent Events stream for real-time updates.

## Usage Example

```typescript
import { useRealtimeSync, useDocumentSync } from '@/hooks/useRealtimeSync';

function ProjectEditor({ projectPath }: { projectPath: string }) {
  const { syncStatus, startSync, stopSync } = useRealtimeSync(projectPath);
  const { documentState, updateLocalContent, markAsSaved } = useDocumentSync(
    projectPath, 
    'requirements'
  );

  useEffect(() => {
    startSync();
    return () => stopSync();
  }, [startSync, stopSync]);

  return (
    <div>
      <div>Status: {syncStatus.connectionStatus}</div>
      <textarea 
        value={documentState.content}
        onChange={(e) => updateLocalContent(e.target.value)}
      />
      {documentState.hasUnsavedChanges && <div>Unsaved changes</div>}
    </div>
  );
}
```

## Testing

The implementation has been tested with:

- ✅ Chokidar file watching functionality
- ✅ File change event detection
- ✅ Debouncing behavior
- ✅ Error handling and cleanup
- ✅ Server-Sent Events streaming

## Requirements Satisfied

This implementation satisfies the following requirements:

- **5.1**: File system changes detected within 2 seconds ✅
- **5.2**: Web dashboard updates automatically ✅  
- **5.5**: File integrity maintained ✅

## Next Steps

The conflict resolution mechanism (task 4.2) will build upon this foundation to handle simultaneous modifications from multiple sources.