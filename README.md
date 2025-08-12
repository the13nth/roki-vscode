# AI Project Manager

A browser-based project management system with VS Code integration that helps developers organize, track, and enhance their coding projects through structured documentation and intelligent AI context injection.

## Project Structure

```
ai-project-manager/
├── web-dashboard/          # Next.js web application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   ├── lib/          # Utility functions and file system operations
│   │   ├── types/        # TypeScript type definitions
│   │   └── hooks/        # Custom React hooks
│   └── package.json
├── vscode-extension/       # VS Code extension
│   ├── src/
│   │   ├── lib/          # Core extension functionality
│   │   ├── types/        # TypeScript type definitions
│   │   └── extension.ts  # Main extension entry point
│   └── package.json
└── shared-types/          # Shared TypeScript interfaces (deprecated - now copied to each project)
```

## Core Interfaces

The system is built around several key TypeScript interfaces:

- **ProjectDocuments**: Manages requirements.md, design.md, and tasks.md files
- **ProgressData**: Tracks task completion and project progress
- **ContextDocument**: Manages context documents for AI injection
- **ProjectConfiguration**: Stores project metadata and preferences
- **VSCodeExtension**: Main interface for extension functionality

## Getting Started

### Web Dashboard
```bash
cd web-dashboard
npm install
npm run dev
```

### VS Code Extension
```bash
cd vscode-extension
npm install
npm run compile
```

## File System Structure

Each AI project uses the following structure:

```
project-root/
├── .ai-project/
│   ├── config.json          # Project metadata
│   ├── requirements.md      # Project requirements
│   ├── design.md           # System design
│   ├── tasks.md            # Task list with checkboxes
│   ├── progress.json       # Progress tracking data
│   └── context/            # User context documents
│       ├── api-spec.md
│       ├── user-research.md
│       └── design-system.md
└── src/                    # Project source code
```

## Next Steps

This completes the basic project structure and core interfaces. The next tasks will implement:

1. File system operations and project detection
2. Web dashboard core functionality
3. Real-time file synchronization
4. Progress tracking system
5. Context document management
6. VS Code extension features