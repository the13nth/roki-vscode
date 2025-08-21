# AI Project Manager (Roki)

A comprehensive AI-powered project management platform that combines intelligent analysis, social media content generation, and seamless VS Code integration. Transform your development projects with structured documentation, real-time synchronization, and AI-driven insights.

![AI Project Manager](https://img.shields.io/badge/Version-0.0.5-blue.svg)
![License](https://img.shields.io/badge/License-MIT-green.svg)
![Tech Stack](https://img.shields.io/badge/Tech-Next.js%20%7C%20React%20%7C%20TypeScript%20%7C%20Pinecone-orange.svg)

## 🚀 Key Features

### 🧠 AI-Powered Project Analysis
- **Comprehensive Analysis**: Multi-faceted AI analysis covering technical, market, business, and financial aspects
- **Smart Insights**: Generate actionable recommendations and strategic direction
- **Risk Assessment**: Identify potential challenges with mitigation strategies
- **Business Model Canvas**: Auto-generate strategic business frameworks
- **"Roast My Idea"**: Brutally honest critiques for project validation

### 📱 Social Media Content Generation
- **Multi-Platform Support**: Generate content for Twitter/X, LinkedIn, Instagram, Facebook, TikTok, YouTube
- **AI-Enhanced Posts**: Improve existing posts with detailed instructions
- **Performance Tracking**: Save posts with status tracking and performance metrics
- **Smart Optimization**: Platform-specific character limits and best practices
- **Draft Management**: Save drafts and track posted content

### 🔗 VS Code Integration
- **Seamless Sync**: Real-time bidirectional synchronization between VS Code and web dashboard
- **Context Injection**: Intelligent AI context injection with project awareness
- **Auto-Detection**: Automatic project detection and setup
- **File Watching**: Real-time file change monitoring and sync
- **Token Management**: Secure authentication and user management

### 📊 Project Management
- **Structured Documentation**: Requirements, design, tasks, and progress tracking
- **Progress Visualization**: Charts, timelines, and completion metrics
- **Task Management**: Add, edit, and track project tasks
- **Context Documents**: Manage custom context for AI interactions
- **Export/Import**: Backup and restore project data

### 🎯 Advanced Features
- **Embeddings & Search**: Pinecone-powered semantic search and document embedding
- **Conflict Resolution**: Smart handling of sync conflicts
- **API Configuration**: Flexible AI model and API key management
- **Security**: Secure configuration and token management
- **Real-time Updates**: Live sync status and progress tracking

## 🏗️ Architecture

### Project Structure
```
roki/
├── web-dashboard/          # Next.js 15 web application
│   ├── src/
│   │   ├── app/           # App router with 40+ API endpoints
│   │   ├── components/    # 30+ React components
│   │   ├── lib/          # Utilities, Pinecone, and services
│   │   ├── types/        # TypeScript definitions
│   │   └── hooks/        # Custom React hooks
│   └── package.json
├── vscode-extension/       # VS Code extension (v0.0.5)
│   ├── src/
│   │   ├── lib/          # 10 core services
│   │   ├── types/        # Shared type definitions
│   │   └── extension.ts  # Main extension entry point
│   └── package.json
└── shared-types/          # Common TypeScript interfaces
```

### Tech Stack
- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Clerk Authentication
- **AI**: Google Gemini API, OpenAI-compatible endpoints
- **Database**: Pinecone Vector Database for embeddings and search
- **UI**: Radix UI, Lucide Icons, Monaco Editor
- **Development**: VS Code Extension API, File System Integration

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- VS Code (for extension)
- API keys for AI services (Google Gemini, etc.)
- Pinecone account for vector storage

### Installation

#### 1. Web Dashboard
```bash
cd web-dashboard
yarn install
yarn dev
```

#### 2. VS Code Extension
```bash
cd vscode-extension
yarn install
yarn compile
# Then install the .vsix file in VS Code
```

### Configuration

#### Environment Variables (.env.local)
```env
# Authentication
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# AI Services
NEXT_PUBLIC_GOOGLE_AI_API_KEY=your_gemini_api_key

# Vector Database
NEXT_PUBLIC_PINECONE_API_KEY=your_pinecone_api_key
NEXT_PUBLIC_PINECONE_INDEX_NAME=your_pinecone_index_name

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🎯 Core Workflows

### Project Analysis Workflow
1. **Project Setup**: Create or import project structure
2. **Document Analysis**: AI analyzes requirements, design, and context
3. **Multi-Faceted Insights**: Generate technical, market, financial analysis
4. **Save Results**: Store analysis in Pinecone for social content generation
5. **Export/Share**: Export results or generate social media content

### Social Media Content Generation
1. **Input Configuration**: Select platforms, tone, and content preferences
2. **AI Generation**: Create platform-specific content using project insights
3. **Content Enhancement**: Improve posts with additional instructions
4. **Save & Track**: Save drafts or mark as posted with performance tracking
5. **Performance Analysis**: Update metrics and analyze content performance

### VS Code Integration
1. **Authentication**: Login through web dashboard or direct token
2. **Project Detection**: Auto-detect AI projects in workspace
3. **Real-time Sync**: Bidirectional sync between VS Code and dashboard
4. **Context Injection**: Inject project context into AI conversations
5. **File Monitoring**: Track changes and maintain sync

## 📋 API Endpoints

### Core Project APIs
- `GET/POST /api/projects` - List and create projects
- `GET/PUT /api/projects/[id]` - Project details and updates
- `POST /api/projects/[id]/analyze` - Comprehensive project analysis
- `GET/POST /api/projects/[id]/analyses` - Save and retrieve analysis results

### Social Media APIs
- `POST /api/projects/[id]/generate-social-posts` - Generate social content
- `POST /api/projects/[id]/enhance-social-post` - Improve existing posts
- `POST /api/projects/[id]/social-posts/save` - Save posts with status
- `GET /api/projects/[id]/social-posts/saved` - Retrieve saved posts
- `PUT /api/projects/[id]/social-posts/[postId]/performance` - Update metrics

### VS Code Integration APIs
- `POST /api/auth/generate-vscode-token` - Generate authentication tokens
- `POST /api/auth/verify-token` - Verify and validate tokens
- `GET/POST /api/vscode/projects` - VS Code project management
- `POST /api/file-watcher/events` - File change notifications

### Additional APIs
- Document management, context handling, embeddings, backups, and more

## 🎨 UI Components

### Core Components
- **ProjectDashboardLayout**: Main project interface with tabbed navigation
- **ProjectAnalysis**: Comprehensive analysis display with save functionality
- **SocialPostsGenerator**: Multi-platform content generation and management
- **PromptsViewer**: Transparent AI prompt library and documentation
- **VSCodeConnectionStatus**: Real-time sync status and controls

### Specialized Components
- **EmbeddingsVisualization**: 3D visualization of document embeddings
- **ProgressDashboard**: Charts and metrics for project progress
- **ConflictResolutionDialog**: Smart conflict handling interface
- **ApiConfiguration**: Flexible AI service configuration
- **TokenUsageVisualization**: AI token usage tracking and analytics

## 🔧 Configuration

### VS Code Extension Settings
```json
{
  "aiProjectManager.autoInject": true,
  "aiProjectManager.maxContextSize": 8000,
  "aiProjectManager.dashboardUrl": "http://localhost:3000",
  "aiProjectManager.includeProgress": true
}
```

### Project File Structure
```
your-project/
├── .ai-project/
│   ├── config.json          # Project metadata and settings
│   ├── requirements.md      # Project requirements documentation
│   ├── design.md           # System design and architecture
│   ├── tasks.md            # Task list with progress tracking
│   ├── progress.json       # Detailed progress data
│   └── context/            # Custom context documents
│       ├── api-specs.md
│       ├── user-research.md
│       └── technical-notes.md
└── your-source-code/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Visit our comprehensive docs (coming soon)
- **Issues**: Report bugs and request features on GitHub
- **Community**: Join our Discord server (coming soon)
- **Email**: support@roki.ai (coming soon)

## 🎯 Roadmap

### Current Status (v0.0.5)
- ✅ Full project analysis suite
- ✅ Social media content generation
- ✅ VS Code extension with sync
- ✅ Pinecone integration
- ✅ Performance tracking

### Coming Soon
- 🔄 Enhanced AI models support
- 🔄 Team collaboration features
- 🔄 Advanced analytics dashboard
- 🔄 Mobile app companion
- 🔄 Integration marketplace

---

**Built with ❤️ by the Roki team. Transform your projects with AI-powered insights and seamless development workflows.**