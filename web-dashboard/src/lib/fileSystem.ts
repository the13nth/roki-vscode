// File system operations for web dashboard
import { promises as fs } from 'fs';
import path from 'path';
import { ProjectConfiguration, ProjectStructure, ValidationResult } from '../types';

export class FileSystemError extends Error {
  constructor(message: string, public code: string, public path?: string) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export class FileSystemManager {
  private static readonly AI_PROJECT_DIR = '.ai-project';
  private static readonly REQUIRED_FILES = ['config.json', 'requirements.md', 'design.md', 'tasks.md', 'progress.json'];
  private static readonly MIN_DISK_SPACE = 10 * 1024 * 1024; // 10MB minimum

  /**
   * Safely reads a markdown file with error handling
   */
  static async readMarkdownFile(filePath: string): Promise<string> {
    try {
      await this.validateFileAccess(filePath, 'read');
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      if (error instanceof Error) {
        throw new FileSystemError(
          `Failed to read markdown file: ${error.message}`,
          'READ_ERROR',
          filePath
        );
      }
      throw error;
    }
  }

  /**
   * Safely writes a markdown file with error handling and backup
   */
  static async writeMarkdownFile(filePath: string, content: string, createBackup: boolean = true): Promise<void> {
    try {
      await this.validateFileAccess(path.dirname(filePath), 'write');
      await this.checkDiskSpace(path.dirname(filePath));

      // Create backup if file exists and backup is requested
      if (createBackup && await this.fileExists(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        await fs.copyFile(filePath, backupPath);
      }

      // Write to temporary file first, then rename for atomic operation
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filePath);

    } catch (error) {
      if (error instanceof Error) {
        throw new FileSystemError(
          `Failed to write markdown file: ${error.message}`,
          'WRITE_ERROR',
          filePath
        );
      }
      throw error;
    }
  }

  /**
   * Creates .ai-project directory structure with validation
   */
  static async createAiProjectDirectory(projectPath: string): Promise<string> {
    try {
      const aiProjectDir = path.join(projectPath, this.AI_PROJECT_DIR);
      
      await this.validateFileAccess(projectPath, 'write');
      await this.checkDiskSpace(projectPath);

      // Create directories
      await fs.mkdir(aiProjectDir, { recursive: true });
      await fs.mkdir(path.join(aiProjectDir, 'context'), { recursive: true });

      return aiProjectDir;
    } catch (error) {
      if (error instanceof Error) {
        throw new FileSystemError(
          `Failed to create .ai-project directory: ${error.message}`,
          'DIRECTORY_CREATE_ERROR',
          projectPath
        );
      }
      throw error;
    }
  }

  /**
   * Generates template content for requirements.md
   */
  static generateRequirementsTemplate(projectName: string, template: string): string {
    const templates = {
      'web-app': `# Requirements Document

## Introduction

${projectName} is a modern web application that provides [brief description of the application's purpose and main functionality].

## Requirements

### Requirement 1

**User Story:** As a user, I want to [action], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN the system SHALL [response]
2. WHEN [event] AND [condition] THEN the system SHALL [response]

### Requirement 2

**User Story:** As a user, I want to [action], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN the system SHALL [response]
2. IF [precondition] THEN the system SHALL [response]
`,
      'api': `# Requirements Document

## Introduction

${projectName} is a RESTful API that provides [brief description of the API's purpose and main endpoints].

## Requirements

### Requirement 1

**User Story:** As an API consumer, I want to [action], so that [benefit]

#### Acceptance Criteria

1. WHEN a valid request is made to [endpoint] THEN the API SHALL return [response]
2. WHEN invalid data is provided THEN the API SHALL return appropriate error codes

### Requirement 2

**User Story:** As an API consumer, I want to [action], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN the API SHALL [response]
2. IF authentication fails THEN the API SHALL return 401 Unauthorized
`,
      'mobile': `# Requirements Document

## Introduction

${projectName} is a mobile application that provides [brief description of the mobile app's purpose and main features].

## Requirements

### Requirement 1

**User Story:** As a mobile user, I want to [action], so that [benefit]

#### Acceptance Criteria

1. WHEN the app launches THEN it SHALL [response]
2. WHEN the user [action] THEN the app SHALL [response]

### Requirement 2

**User Story:** As a mobile user, I want to [action], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN the app SHALL [response]
2. IF the device is offline THEN the app SHALL [fallback behavior]
`,
      'default': `# Requirements Document

## Introduction

${projectName} is a software project that [brief description of the project's purpose].

## Requirements

### Requirement 1

**User Story:** As a [role], I want to [action], so that [benefit]

#### Acceptance Criteria

1. WHEN [event] THEN the system SHALL [response]
2. WHEN [event] AND [condition] THEN the system SHALL [response]
`
    };

    return templates[template as keyof typeof templates] || templates.default;
  }

  /**
   * Generates template content for design.md
   */
  static generateDesignTemplate(projectName: string, template: string): string {
    const templates = {
      'web-app': `# Design Document

## Overview

${projectName} is built using modern web technologies with a focus on performance, scalability, and user experience.

## Architecture

### System Components

\`\`\`mermaid
graph TB
    A[Frontend - React/Next.js] --> B[API Layer]
    B --> C[Business Logic]
    C --> D[Database]
\`\`\`

## Components and Interfaces

### Frontend Components
- User Interface components
- State management
- API integration

### Backend Services
- API endpoints
- Authentication
- Data validation

## Data Models

### User Model
\`\`\`typescript
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
}
\`\`\`

## Error Handling

- Client-side error boundaries
- API error responses
- Logging and monitoring

## Testing Strategy

- Unit tests for components
- Integration tests for API
- End-to-end testing
`,
      'api': `# Design Document

## Overview

${projectName} is a RESTful API designed for scalability, security, and maintainability.

## Architecture

### System Components

\`\`\`mermaid
graph TB
    A[API Gateway] --> B[Authentication Service]
    A --> C[Business Logic Layer]
    C --> D[Data Access Layer]
    D --> E[Database]
\`\`\`

## Components and Interfaces

### API Endpoints
- Authentication endpoints
- Resource endpoints
- Health check endpoints

### Data Layer
- Repository pattern
- Database connections
- Caching layer

## Data Models

### API Response Model
\`\`\`typescript
interface ApiResponse<T> {
  data: T;
  status: 'success' | 'error';
  message?: string;
}
\`\`\`

## Error Handling

- HTTP status codes
- Error response format
- Logging and monitoring

## Testing Strategy

- Unit tests for business logic
- Integration tests for endpoints
- Load testing
`,
      'default': `# Design Document

## Overview

${projectName} system design and architecture documentation.

## Architecture

### System Components

High-level system architecture and component relationships.

## Components and Interfaces

### Core Components
- Component descriptions
- Interface definitions
- Integration points

## Data Models

### Data Structures
\`\`\`typescript
interface DataModel {
  // Define your data models here
}
\`\`\`

## Error Handling

- Error handling strategies
- Recovery mechanisms
- Logging approach

## Testing Strategy

- Testing approach
- Test coverage goals
- Testing tools and frameworks
`
    };

    return templates[template as keyof typeof templates] || templates.default;
  }

  /**
   * Generates template content for tasks.md
   */
  static generateTasksTemplate(projectName: string, template: string): string {
    const templates = {
      'web-app': `# Implementation Plan

- [ ] 1. Set up project structure
  - Initialize Next.js/React project with TypeScript
  - Configure development setup and build tools
  - Set up version control and project documentation
  - _Requirements: Project setup and configuration_

- [ ] 2. Implement core components
  - [ ] 2.1 Create UI component library
    - Build reusable React components
    - Implement responsive design system
    - Add component testing
    - _Requirements: User interface requirements_

  - [ ] 2.2 Set up state management
    - Configure state management solution
    - Implement data flow patterns
    - Add state persistence if needed
    - _Requirements: Application state requirements_

- [ ] 3. Develop API integration
  - [ ] 3.1 Create API client
    - Implement HTTP client with error handling
    - Add request/response interceptors
    - Create type-safe API interfaces
    - _Requirements: API integration requirements_

  - [ ] 3.2 Implement data fetching
    - Add data fetching hooks/utilities
    - Implement caching strategy
    - Handle loading and error states
    - _Requirements: Data management requirements_

- [ ] 4. Add authentication and security
  - Implement user authentication flow
  - Add route protection and authorization
  - Implement security best practices
  - _Requirements: Security and authentication requirements_

- [ ] 5. Testing and deployment
  - Write comprehensive test suite
  - Set up CI/CD pipeline
  - Configure production deployment
  - _Requirements: Quality assurance and deployment requirements_
`,
      'api': `# Implementation Plan

- [ ] 1. Set up API project structure
  - Initialize Node.js/Express project with TypeScript
  - Configure development setup and build tools
  - Set up database connection and migrations
  - _Requirements: Project setup and infrastructure_

- [ ] 2. Implement core API infrastructure
  - [ ] 2.1 Create middleware and utilities
    - Implement authentication middleware
    - Add request validation and sanitization
    - Create error handling middleware
    - _Requirements: API security and validation_

  - [ ] 2.2 Set up database layer
    - Implement database models and schemas
    - Create repository pattern for data access
    - Add database connection pooling
    - _Requirements: Data persistence requirements_

- [ ] 3. Develop API endpoints
  - [ ] 3.1 Implement authentication endpoints
    - Create user registration and login
    - Add JWT token management
    - Implement password reset functionality
    - _Requirements: Authentication requirements_

  - [ ] 3.2 Create resource endpoints
    - Implement CRUD operations for main resources
    - Add pagination and filtering
    - Implement proper HTTP status codes
    - _Requirements: Core functionality requirements_

- [ ] 4. Add API documentation and testing
  - Generate OpenAPI/Swagger documentation
  - Write comprehensive test suite
  - Add API integration tests
  - _Requirements: Documentation and testing requirements_

- [ ] 5. Deploy and monitor
  - Set up production environment
  - Configure monitoring and logging
  - Implement health checks
  - _Requirements: Deployment and monitoring requirements_
`,
      'default': `# Implementation Plan

- [ ] 1. Set up project foundation
  - Initialize project structure and dependencies
  - Configure development setup
  - Set up version control and documentation
  - _Requirements: Project setup requirements_

- [ ] 2. Implement core functionality
  - [ ] 2.1 Create main components
    - Implement primary system components
    - Add core business logic
    - Create necessary interfaces and types
    - _Requirements: Core functionality requirements_

  - [ ] 2.2 Add supporting features
    - Implement supporting functionality
    - Add error handling and validation
    - Create utility functions and helpers
    - _Requirements: Supporting feature requirements_

- [ ] 3. Testing and quality assurance
  - Write comprehensive test suite
  - Add code quality checks and linting
  - Implement continuous integration
  - _Requirements: Quality assurance requirements_

- [ ] 4. Documentation and deployment
  - Create user and developer documentation
  - Set up deployment pipeline
  - Configure production environment
  - _Requirements: Documentation and deployment requirements_
`
    };

    return templates[template as keyof typeof templates] || templates.default;
  }

  /**
   * Creates complete project structure with templates
   */
  static async createProjectStructure(projectPath: string, config: ProjectConfiguration): Promise<void> {
    try {
      const aiProjectDir = await this.createAiProjectDirectory(projectPath);
      
      // Create config.json
      await this.writeMarkdownFile(
        path.join(aiProjectDir, 'config.json'),
        JSON.stringify(config, null, 2),
        false
      );
      
      // Create template markdown files
      await this.writeMarkdownFile(
        path.join(aiProjectDir, 'requirements.md'),
        this.generateRequirementsTemplate(config.name, config.template),
        false
      );
      
      await this.writeMarkdownFile(
        path.join(aiProjectDir, 'design.md'),
        this.generateDesignTemplate(config.name, config.template),
        false
      );
      
      await this.writeMarkdownFile(
        path.join(aiProjectDir, 'tasks.md'),
        this.generateTasksTemplate(config.name, config.template),
        false
      );
      
      // Create initial progress.json
      const initialProgress = {
        totalTasks: 0,
        completedTasks: 0,
        percentage: 0,
        lastUpdated: new Date().toISOString(),
        recentActivity: [],
        milestones: []
      };
      
      await this.writeMarkdownFile(
        path.join(aiProjectDir, 'progress.json'),
        JSON.stringify(initialProgress, null, 2),
        false
      );

    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new FileSystemError(
          `Failed to create project structure: ${error.message}`,
          'PROJECT_CREATE_ERROR',
          projectPath
        );
      }
      throw error;
    }
  }
  
  /**
   * Gets project structure with validation
   */
  static async getProjectStructure(projectPath: string): Promise<ProjectStructure> {
    const aiProjectDir = path.join(projectPath, this.AI_PROJECT_DIR);
    
    return {
      configPath: path.join(aiProjectDir, 'config.json'),
      requirementsPath: path.join(aiProjectDir, 'requirements.md'),
      designPath: path.join(aiProjectDir, 'design.md'),
      tasksPath: path.join(aiProjectDir, 'tasks.md'),
      progressPath: path.join(aiProjectDir, 'progress.json'),
      contextDir: path.join(aiProjectDir, 'context'),
      isValid: await this.validateProjectStructure(aiProjectDir)
    };
  }

  /**
   * Validates .ai-project directory structure
   */
  static async validateAiProjectDirectory(aiProjectDir: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Check if directory exists
      if (!await this.directoryExists(aiProjectDir)) {
        errors.push('.ai-project directory does not exist');
        return { isValid: false, errors, warnings };
      }

      // Check required files
      for (const file of this.REQUIRED_FILES) {
        const filePath = path.join(aiProjectDir, file);
        if (!await this.fileExists(filePath)) {
          errors.push(`Required file missing: ${file}`);
        } else {
          // Check if file is readable
          try {
            await this.validateFileAccess(filePath, 'read');
          } catch {
            errors.push(`Cannot read required file: ${file}`);
          }
        }
      }

      // Check context directory
      const contextDir = path.join(aiProjectDir, 'context');
      if (!await this.directoryExists(contextDir)) {
        warnings.push('Context directory does not exist');
      }

      // Validate config.json format
      try {
        const configPath = path.join(aiProjectDir, 'config.json');
        if (await this.fileExists(configPath)) {
          const configContent = await fs.readFile(configPath, 'utf-8');
          const config = JSON.parse(configContent);
          
          const requiredConfigFields = ['projectId', 'name', 'template', 'createdAt'];
          for (const field of requiredConfigFields) {
            if (!config[field]) {
              warnings.push(`Config missing recommended field: ${field}`);
            }
          }
        }
      } catch {
        errors.push('config.json is not valid JSON');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      errors.push(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  private static async validateProjectStructure(aiProjectDir: string): Promise<boolean> {
    const result = await this.validateAiProjectDirectory(aiProjectDir);
    return result.isValid;
  }

  // Utility methods for file system operations

  /**
   * Checks if a file exists
   */
  private static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Checks if a directory exists
   */
  private static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Validates file access permissions
   */
  private static async validateFileAccess(filePath: string, mode: 'read' | 'write'): Promise<void> {
    try {
      const accessMode = mode === 'read' ? fs.constants.R_OK : fs.constants.W_OK;
      await fs.access(filePath, accessMode);
    } catch (error) {
      if (error instanceof Error) {
        const action = mode === 'read' ? 'read from' : 'write to';
        throw new FileSystemError(
          `Permission denied: Cannot ${action} ${filePath}`,
          'PERMISSION_DENIED',
          filePath
        );
      }
      throw error;
    }
  }

  /**
   * Checks available disk space
   */
  private static async checkDiskSpace(dirPath: string): Promise<void> {
    try {
      const stats = await fs.statfs(dirPath);
      const availableSpace = stats.bavail * stats.bsize;
      
      if (availableSpace < this.MIN_DISK_SPACE) {
        throw new FileSystemError(
          `Insufficient disk space. Available: ${Math.round(availableSpace / 1024 / 1024)}MB, Required: ${Math.round(this.MIN_DISK_SPACE / 1024 / 1024)}MB`,
          'INSUFFICIENT_DISK_SPACE',
          dirPath
        );
      }
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      }
      // If we can't check disk space, log warning but don't fail
      console.warn(`Could not check disk space for ${dirPath}:`, error);
    }
  }
}