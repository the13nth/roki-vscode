# Public Projects Feature

This document describes the new public projects feature that allows users to make their projects visible to everyone on the platform.

## Overview

The public projects feature enables users to:
- Toggle project visibility between public and private
- View public projects from other users
- Share their work with the community

## Features

### 1. Project Visibility Toggle

Users can toggle the visibility of their projects using:
- **Project Creation Wizard**: Choose public/private when creating a new project
- **Project Dashboard**: Toggle visibility in the Project Metadata section

### 2. Public Project Discovery

- **Projects Page**: Public projects are automatically loaded and displayed alongside user's own projects
- **Filter Option**: Users can filter to show only public projects using the "Public" filter
- **Visual Indicators**: Public projects are marked with a purple "Public" badge

### 3. Access Control

- **Public Projects**: Can be viewed by anyone, even without authentication
- **Private Projects**: Only visible to the project owner
- **API Access**: Public project endpoints are accessible without authentication

## Technical Implementation

### Database Changes

- Added `isPublic` field to `ProjectConfiguration` interface
- Updated Pinecone metadata to include `isPublic` flag
- Projects default to `isPublic: false` (private)

### API Endpoints

#### New Endpoints
- `GET /api/projects/public` - List all public projects
- `PATCH /api/projects/[id]/visibility` - Toggle project visibility

#### Modified Endpoints
- `GET /api/projects/[id]` - Now allows access to public projects without authentication
- `POST /api/projects` - Accepts `isPublic` field during project creation

### Frontend Components

#### Updated Components
- `ProjectCreationWizard` - Added public/private toggle during creation
- `ProjectMetadata` - Added visibility toggle in project dashboard
- `ProjectOverview` - Shows public projects alongside user projects
- `ProjectCard` - Displays public project indicators
- `SearchAndFilter` - Added "Public" filter option

#### New Features
- Public project badges with globe icon
- Visibility toggle buttons with lock/globe icons
- Filter to show only public projects

## Usage

### Making a Project Public

1. **During Creation**:
   - In the project creation wizard, select "Public" under Project Visibility
   - The project will be created as public

2. **After Creation**:
   - Go to the project dashboard
   - In the Project Info section, click the visibility toggle
   - Switch between "Private" and "Public"

### Viewing Public Projects

1. **On Projects Page**:
   - Public projects are automatically loaded and displayed
   - Use the "Public" filter to show only public projects
   - Public projects are marked with a purple "Public" badge

2. **Direct Access**:
   - Public project URLs can be shared and accessed by anyone
   - No authentication required to view public projects

## Security Considerations

- Public projects are read-only for non-owners
- Only project owners can modify their projects
- Private projects remain completely private
- Authentication is still required for project modifications

## Future Enhancements

Potential improvements for the public projects feature:
- Public project analytics and views tracking
- Social features like comments and likes
- Public project templates and sharing
- Community discovery and recommendations
- Public project search and discovery

