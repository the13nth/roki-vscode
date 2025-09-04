# Project Sharing Flow Implementation

This document describes the complete project sharing flow implemented in the Roki web dashboard, including team invitations, project sharing, and data persistence with Pinecone.

## Overview

The project sharing flow allows users to:
1. **Share projects** with other users by email
2. **Send team invitations** to collaborate on projects
3. **Accept/decline invitations** with proper status tracking
4. **View sharing status** and team information
5. **Auto-create teams** from shared projects

## Architecture

### Data Storage
- **Pinecone Vector Database** with multiple namespaces:
  - `projects` - Project metadata and sharedWith arrays
  - `project_sharing` - Project sharing invitations and status
  - `teams` - Team information
  - `team_members` - Team membership and roles
  - `team_invitations` - Team invitation records
  - `team_projects` - Projects associated with teams

### Key Components
- **Project Sharing API** (`/api/projects/share`) - Create sharing invitations
- **Project Invitation Response** (`/api/projects/invitations/[id]/respond`) - Accept/decline project invitations
- **Team Invitation API** (`/api/teams/invite`) - Send team invitations
- **Team Invitation Response** (`/api/teams/invitations/[id]/respond`) - Accept/decline team invitations
- **Auto-team Creation** (`/api/teams/auto-create-from-shared`) - Automatically create teams from shared projects

## Flow Steps

### 1. Project Sharing
```
User A → Shares Project → User B receives invitation → User B accepts → Project access granted
```

**Implementation:**
- User A shares project via `/api/projects/share`
- Creates record in `project_sharing` namespace with status 'pending'
- User B sees invitation in project invitations list
- User B accepts via `/api/projects/invitations/[id]/respond`
- Project's `sharedWith` array updated
- Invitation status changed to 'accepted'

### 2. Team Invitation
```
Team Owner → Invites User → User receives invitation → User accepts → User added to team
```

**Implementation:**
- Team owner invites user via `/api/teams/invite`
- Creates record in `team_invitations` namespace with status 'pending'
- User sees invitation in team invitations list
- User accepts via `/api/teams/invitations/[id]/respond`
- User added to `team_members` namespace
- Invitation status changed to 'accepted'

### 3. Auto-Team Creation
```
Shared Project → Auto-team creation → Team created → Members added → Projects linked
```

**Implementation:**
- Triggered when user visits teams page or project team tab
- Scans `project_sharing` and `projects` namespaces for shared projects
- Creates teams for project owners if they don't exist
- Links shared projects to teams
- Adds users as team members with appropriate roles

## Data Persistence & Reliability

### Timeout Handling
- All Pinecone operations have 30-second timeouts
- Prevents hanging operations and improves user experience

### Retry Logic
- Exponential backoff retry for failed operations
- 3 retry attempts with 1s, 2s, 4s delays
- Jitter added to prevent thundering herd problems

### Error Handling
- Comprehensive error messages with context
- Graceful degradation when operations fail
- User-friendly error notifications

## API Endpoints

### Project Sharing
- `POST /api/projects/share` - Share project with user
- `GET /api/user/project-invitations` - Get user's pending project invitations
- `POST /api/projects/invitations/[id]/respond` - Accept/decline project invitation
- `GET /api/projects/[id]/sharing-status` - Get project sharing status

### Team Management
- `POST /api/teams/invite` - Invite user to team
- `GET /api/user/team-invitations` - Get user's pending team invitations
- `POST /api/teams/invitations/[id]/respond` - Accept/decline team invitation
- `POST /api/teams/auto-create-from-shared` - Auto-create teams from shared projects

## UI Components

### ProjectTeamTab
- Shows project team information
- Displays project sharing status
- Allows team member management
- Shows pending team invitations

### TeamInvitations
- Lists pending team invitations
- Accept/decline functionality
- Expiration status display
- Role and team information

### ProjectSharingStatus
- Shows all sharing records for a project
- Status tracking (pending, accepted, declined, active)
- Role and timestamp information
- Owner-only actions (resend invitations)

### TeamsPage
- Lists all user's teams
- Shows team invitations toggle
- Team creation and management
- Sync shared projects functionality

## Security & Permissions

### Access Control
- Users can only see invitations sent to their email
- Project owners can see all sharing records for their projects
- Team owners/admins can invite new members
- Role-based permissions for team actions

### Data Validation
- Email format validation
- Role validation (owner, admin, editor, viewer)
- Invitation expiration checking
- Duplicate invitation prevention

## Monitoring & Debugging

### Logging
- Comprehensive operation logging
- Retry attempt tracking
- Error context preservation
- Performance metrics

### User Feedback
- Toast notifications for all operations
- Loading states during operations
- Clear error messages
- Success confirmations

## Future Enhancements

### Planned Features
- Email notifications for invitations
- Invitation expiration reminders
- Bulk invitation management
- Advanced role permissions
- Team templates and presets

### Performance Optimizations
- Batch operations for multiple invitations
- Caching for frequently accessed data
- Background job processing
- Real-time updates via WebSockets

## Troubleshooting

### Common Issues
1. **Invitation not appearing**: Check email address matches exactly
2. **Operation timeouts**: Verify Pinecone service status
3. **Permission errors**: Ensure user has appropriate role
4. **Data sync issues**: Use "Sync Shared Projects" button

### Debug Steps
1. Check browser console for error messages
2. Verify API endpoint responses
3. Check Pinecone namespace data
4. Validate user authentication status

## Testing

### Manual Testing
- Share project with test email
- Accept invitation from different account
- Verify team creation and membership
- Test invitation expiration

### Automated Testing
- API endpoint testing
- Component rendering tests
- Error handling validation
- Performance benchmarks

## Deployment

### Environment Variables
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_ENVIRONMENT` - Pinecone environment
- `PINECONE_INDEX_NAME` - Pinecone index name

### Dependencies
- Pinecone client library
- Clerk authentication
- Next.js API routes
- React components with TypeScript

This implementation provides a robust, scalable project sharing system with proper data persistence, error handling, and user experience considerations.
