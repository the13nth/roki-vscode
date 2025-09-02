# Blog Feature

## Overview

The blog feature allows users to create, read, edit, and delete blog posts about their projects. Anyone can read posts, but only logged-in users can create, edit, and delete their own posts.

## Features

### For All Users (Public)
- **Read Posts**: Browse and read all blog posts
- **Search & Filter**: Search posts by title, content, or author name
- **Tag Filtering**: Filter posts by tags
- **View Post Details**: Read full blog posts with metadata
- **Share Posts**: Share posts via native sharing or copy link

### For Logged-in Users
- **Create Posts**: Write new blog posts with rich content
- **Edit Posts**: Update their own blog posts
- **Delete Posts**: Remove their own blog posts
- **Project Linking**: Link posts to specific projects
- **Tag Management**: Add and remove tags from posts

## Technical Implementation

### API Endpoints

#### `/api/blog-posts` (GET)
- Fetches all blog posts
- Returns posts sorted by publication date (newest first)
- Includes metadata like author, views, likes, read time

#### `/api/blog-posts` (POST)
- Creates a new blog post
- Requires authentication
- Validates title and content
- Auto-generates excerpt and read time
- Links to projects if specified

#### `/api/blog-posts/[id]` (GET)
- Fetches a specific blog post
- Increments view count
- Returns full post content and metadata

#### `/api/blog-posts/[id]` (PUT)
- Updates an existing blog post
- Requires authentication and ownership
- Validates title and content
- Updates excerpt and read time

#### `/api/blog-posts/[id]` (DELETE)
- Deletes a blog post
- Requires authentication and ownership

#### `/api/user/projects` (GET)
- Fetches user's projects for blog post creation
- Requires authentication
- Used for project selection dropdown

### Database Schema

Blog posts are stored in Pinecone with the following metadata:

```typescript
interface BlogPost {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  authorId: string;
  authorName: string;
  projectId: string;
  projectName: string;
  tags: string[];
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  readTime: number;
  likes: number;
  views: number;
}
```

### Pages

#### `/blog` - Blog Listing Page
- Displays all blog posts in a grid layout
- Search and filter functionality
- Create post dialog for authenticated users
- Edit/delete buttons for post owners

#### `/blog/[id]` - Individual Post Page
- Full post content display
- Author information
- Engagement metrics (views, likes)
- Edit/delete actions for post owners
- Share functionality

#### `/blog/[id]/edit` - Edit Post Page
- Form to edit post content
- Tag management
- Project linking
- Save/cancel actions

## Navigation

The blog is accessible from the main navigation:
- **Desktop**: "Blog" link in the top navigation bar
- **Mobile**: "Blog" link in the mobile menu
- **Icon**: BookOpen icon from Lucide React

## Security

- **Authentication**: All write operations require user authentication
- **Authorization**: Users can only edit/delete their own posts
- **Input Validation**: Title and content are required fields
- **Content Limits**: Content is truncated to fit Pinecone metadata limits

## Future Enhancements

- **Like System**: Implement actual like functionality
- **Comments**: Add commenting system
- **Rich Text Editor**: Enhanced content editing
- **Image Upload**: Support for post images
- **SEO Optimization**: Meta tags and structured data
- **Analytics**: Detailed post analytics
- **Categories**: Post categorization system
- **Draft System**: Save posts as drafts
- **Scheduling**: Schedule posts for future publication

## Usage Examples

### Creating a Post
1. Navigate to `/blog`
2. Click "Write Post" button
3. Fill in title and content
4. Optionally select a related project
5. Add tags
6. Click "Create Post"

### Editing a Post
1. Navigate to your post
2. Click "Edit" button
3. Modify content as needed
4. Click "Save Changes"

### Searching Posts
1. Use the search bar to find posts by title, content, or author
2. Use the tag filter to narrow down results
3. Results update in real-time

## Styling

The blog uses the existing design system:
- **Cards**: Post previews and content containers
- **Buttons**: Actions and navigation
- **Badges**: Tags and status indicators
- **Typography**: Consistent text styling
- **Responsive**: Works on desktop and mobile devices
