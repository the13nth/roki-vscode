# Requirements Document

## Introduction

The roki AI Project Manager is a web application designed to streamline software development workflows, particularly those involving AI. It provides a centralized platform for managing project documentation, tracking progress, and integrating with VS Code for context injection.  The application targets individual and team developers seeking improved project organization, consistent documentation, and AI-accelerated coding.

## Requirements

### Requirement 1

**User Story:** As a developer, I want to create new projects and define their requirements, so that I can organize my work effectively.

#### Acceptance Criteria

1. **WHEN** a user clicks the "New Project" button, **THEN** a form should appear allowing the user to input project name, description, and initial requirements.
2. **WHEN** a user submits the form, **THEN** a new project is created in the database and displayed on the dashboard.
3. **WHEN** a project is created, **THEN** a corresponding folder is created in the user's VS Code workspace (if the extension is installed).

### Requirement 2

**User Story:** As a developer, I want to manage tasks within a project, including assigning priorities and due dates, so that I can track my progress effectively.

#### Acceptance Criteria

1. **WHEN** a user is viewing a project, **THEN** they can add, edit, and delete tasks.
2. **WHEN** a task is added, **THEN** the user can specify a priority level (e.g., high, medium, low) and a due date.
3. **WHEN** a task is completed, **THEN** its status is updated in the dashboard and the VS Code extension.

### Requirement 3

**User Story:** As a developer, I want to upload and manage project documents (e.g., API specifications, design documents), so that I have easy access to relevant information.

#### Acceptance Criteria

1. **WHEN** a user is viewing a project, **THEN** they can upload files of various types.
2. **WHEN** a file is uploaded, **THEN** it is stored securely and accessible through the dashboard.
3. **WHEN** a file is uploaded, **THEN** it is accessible within the VS Code extension.

### Requirement 4

**User Story:** As a developer, I want real-time synchronization between the web dashboard and the VS Code extension, so that I always have the latest project information.

#### Acceptance Criteria

1. **WHEN** a change is made in the dashboard (e.g., task status update), **THEN** the change is reflected in the VS Code extension within a few seconds.
2. **WHEN** a change is made in the VS Code extension (e.g., a file is added), **THEN** the change is reflected in the dashboard within a few seconds.
3. **WHEN** the internet connection is lost, **THEN** the VS Code extension continues to function with locally cached data.

### Requirement 5

**User Story:** As a developer, I want to securely access my project data, so that my information remains confidential.

#### Acceptance Criteria

1. **WHEN** a user logs in, **THEN** they are authenticated using Firebase Authentication.
2. **WHEN** a user accesses a project, **THEN** they have appropriate permissions based on their role.
3. **WHEN** a user logs out, **THEN** their session is terminated, and access to project data is revoked.

### Requirement 6

**User Story:** As a developer, I want to inject relevant context from project documents directly into my VS Code editor, so that I can work more efficiently.

#### Acceptance Criteria

1. **WHEN** a user selects a context document in the dashboard, **THEN** the relevant content is displayed in a panel within VS Code.
2. **WHEN** a user is editing a file in VS Code, **THEN** the extension provides suggestions based on the selected context document.
3. **WHEN** the context document is updated, **THEN** the changes are reflected in VS Code in real-time.