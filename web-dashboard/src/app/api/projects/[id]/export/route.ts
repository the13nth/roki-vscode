import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ProjectService } from '@/lib/projectService';

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
    const projectService = ProjectService.getInstance();
    
    // Get the project and verify ownership
    const project = await projectService.getProject(userId, projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Generate default project files based on template
    const files = generateProjectFiles(project);

    return NextResponse.json({
      project: {
        id: project.projectId,
        name: project.name,
        description: project.description,
        template: project.template,
        createdAt: project.createdAt,
        lastModified: project.lastModified
      },
      files
    });

  } catch (error) {
    console.error('Failed to export project:', error);
    return NextResponse.json(
      { error: 'Failed to export project' },
      { status: 500 }
    );
  }
}

function generateProjectFiles(project: any) {
  const requirements = generateRequirementsTemplate(project);
  const design = generateDesignTemplate(project);
  const tasks = generateTasksTemplate(project);
  const config = {
    projectId: project.projectId,
    name: project.name,
    description: project.description,
    template: project.template,
    createdAt: project.createdAt,
    lastModified: project.lastModified,
    aiModel: project.aiModel,
    technologyStack: project.technologyStack,
    contextPreferences: project.contextPreferences
  };

  const contextDocs = [
    {
      filename: 'project-overview.md',
      content: generateProjectOverview(project),
      category: 'requirements'
    }
  ];

  return {
    requirements,
    design,
    tasks,
    config,
    contextDocs
  };
}

function generateRequirementsTemplate(project: any): string {
  return `# ${project.name} - Requirements Document

## Introduction

${project.description}

## Requirements

### Requirement 1

**User Story:** As a user, I want to...

#### Acceptance Criteria

1. WHEN... THEN...
2. WHEN... THEN...

### Requirement 2

**User Story:** As a user, I want to...

#### Acceptance Criteria

1. WHEN... THEN...
2. WHEN... THEN...
`;
}

function generateDesignTemplate(project: any): string {
  return `# ${project.name} - Design Document

## Overview

This document outlines the design and architecture for ${project.name}.

## Architecture

### System Architecture

Describe the overall system architecture...

### Technology Stack

${project.technologyStack ? Object.entries(project.technologyStack)
  .map(([key, value]) => `- **${key}:** ${value}`)
  .join('\n') : '- To be determined'}

## User Interface Design

### Wireframes

Describe the UI/UX design...

### User Flow

1. User lands on...
2. User navigates to...
3. User completes...
`;
}

function generateTasksTemplate(project: any): string {
  const templateTasks = getTemplateSpecificTasks(project.template);
  
  return `# ${project.name} - Implementation Plan

## Setup and Configuration

- [ ] 1. Set up project structure
  - Create project directories and files
  - Initialize version control
  - Set up development setup
  - Configure build tools and dependencies

${templateTasks}

## Testing and Deployment

- [ ] 10. Implement testing
  - Write unit tests
  - Add integration tests
  - Set up continuous integration

- [ ] 11. Prepare for deployment
  - Configure production environment
  - Set up deployment pipeline
  - Create documentation
`;
}

function getTemplateSpecificTasks(template: string): string {
  switch (template) {
    case 'web-app':
      return `
## Frontend Development

- [ ] 2. Set up frontend framework
  - Initialize React/Vue/Angular project
  - Configure routing
  - Set up state management
  - Configure styling system

- [ ] 3. Implement core components
  - Create layout components
  - Build reusable UI components
  - Implement navigation
  - Add responsive design

## Backend Development

- [ ] 4. Set up backend API
  - Initialize server framework
  - Configure database connection
  - Set up authentication
  - Create API endpoints

- [ ] 5. Implement business logic
  - Create data models
  - Implement CRUD operations
  - Add validation and error handling
  - Set up middleware
`;

    case 'api':
      return `
## API Development

- [ ] 2. Design API structure
  - Define API endpoints
  - Create data models
  - Set up database schema
  - Configure authentication

- [ ] 3. Implement core functionality
  - Create CRUD operations
  - Add business logic
  - Implement validation
  - Set up error handling

- [ ] 4. Add advanced features
  - Implement caching
  - Add rate limiting
  - Set up logging
  - Create API documentation
`;

    case 'mobile':
      return `
## Mobile Development

- [ ] 2. Set up mobile framework
  - Initialize React Native/Flutter project
  - Configure navigation
  - Set up state management
  - Configure build tools

- [ ] 3. Implement core screens
  - Create main navigation
  - Build key user interfaces
  - Add form handling
  - Implement data persistence

- [ ] 4. Add platform features
  - Integrate device APIs
  - Add push notifications
  - Implement offline support
  - Configure app store deployment
`;

    default:
      return `
## Core Development

- [ ] 2. Implement core functionality
  - Define main features
  - Create core modules
  - Add configuration
  - Set up data handling

- [ ] 3. Add advanced features
  - Implement additional functionality
  - Add integrations
  - Create utilities
  - Optimize performance
`;
  }
}

function generateProjectOverview(project: any): string {
  return `# ${project.name} - Project Overview

## Project Description

${project.description}

## Key Features

- Feature 1: Description
- Feature 2: Description
- Feature 3: Description

## Technical Details

### Architecture
Brief description of the system architecture...

### Dependencies
List of main dependencies and their purposes...

### Configuration
Important configuration details...

## Development Notes

### Getting Started
Steps to set up the development setup...

### Common Tasks
Frequently used commands and procedures...

### Troubleshooting
Common issues and their solutions...
`;
}