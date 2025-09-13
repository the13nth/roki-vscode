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

### Getting Started

#### 1. Get VSCode Extension
Download the ROKI Project Manager extension from the [GitHub Releases](https://github.com/the13nth/roki-vscode/releases) page.

#### 2. Install the Extension
1. Open VS Code (or any VSCode-based editor like Cursor)
2. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Click the "..." menu and select "Install from VSIX..."
4. Select the downloaded `.vsix` file
5. The extension will be installed and activated automatically

#### 3. Create Your Project on ROKI
1. Visit [roki.pro](https://roki.pro) in your browser
2. Create your account and log in
3. Create your first project using the web dashboard
4. Your project will be saved to the cloud

#### 4. Login to VSCode Extension
1. In VS Code, open the extension and click on open Browser to login
2. A web window will be open on roki.pro with a token, copy it and go back to the extension.
3. Click on Enter token and paste your token in the provided space.

#### 5. Access Your Projects in IDE
Once logged in, all your project details, requirements, tasks, and progress will be accessible directly in your IDE through the ROKI Project Manager sidebar and commands.

## 🌐 Web Dashboard Features (roki.pro)

**Note**: The web dashboard at [roki.pro](https://roki.pro) is a **proprietary, non-open source** hosted service that provides the core project management platform. The VSCode extension connects to this service to sync your projects.

### 🚀 Core Platform Capabilities

#### **Project Management & Templates**
- **Technical Project Templates**: Web apps, APIs, mobile applications, data science projects
- **Business Project Templates**: Startups, enterprise initiatives with regulatory compliance frameworks
- **Enhanced Project Creation Wizard**: AI-powered project setup with industry-specific configurations
- **Project Sharing & Collaboration**: Team-based project management with role-based access

#### **AI-Powered Analysis Suite**
- **Technical Analysis**: Code structure analysis, architecture recommendations, technology stack optimization
- **Market Intelligence**: Real-time market insights, competitive landscape analysis, emerging technology trends
- **Financial Modeling**: ROI calculations, funding requirements, revenue projections, cost analysis
- **Business Model Canvas**: Strategic planning tools, competitive differentiation analysis
- **Risk Assessment**: Technical and business risk identification with mitigation strategies

#### **Smart Task Management**
- **AI Task Breakdown**: Automatic task generation based on project requirements and complexity
- **Progress Tracking**: Visual milestone tracking with automatic progress detection
- **Intelligent Recommendations**: Context-aware task suggestions and workflow optimization
- **Evidence Collection**: Automatic proof-of-progress gathering from code changes and documentation

#### **Document Management System**
- **Requirements Management**: User story creation, acceptance criteria, requirement tracking
- **Design Documentation**: System architecture, UI/UX wireframes, technical specifications
- **Context Documents**: Project overview, technical details, development notes
- **Version Control**: Document history, change tracking, collaborative editing

#### **Social Media Content Generation**
- **Platform-Specific Content**: Twitter, LinkedIn, Instagram, GitHub-optimized posts
- **AI Content Creation**: Context-aware social media posts using project analysis data
- **Content Enhancement**: Improve posts with additional instructions and refinements
- **Performance Tracking**: Social media metrics and engagement analysis

#### **Advanced Visualization & Analytics**
- **3D Document Visualization**: Interactive project structure and relationship mapping
- **Progress Dashboards**: Real-time project health monitoring and milestone tracking
- **Embeddings Visualization**: Vector-based document similarity and context analysis
- **Team Analytics**: Collaboration metrics, contribution tracking, productivity insights

#### **Integration & Sync Features**
- **VSCode Extension Sync**: Real-time synchronization with your IDE
- **Cloud Storage**: Secure project backup and multi-device access
- **API Integration**: Connect with external tools and services
- **Export Capabilities**: Generate pitch decks, reports, and documentation

### 🔐 Platform Access & Pricing

The web dashboard operates on a **subscription-based model** with different tiers:
- **Free Tier**: Basic project management and limited AI analysis
- **Pro Tier**: Advanced AI features, unlimited projects, team collaboration
- **Enterprise**: Custom solutions, advanced analytics, dedicated support

**Important**: The web dashboard source code is **not open source** and is hosted as a proprietary service. Only the VSCode extension is open source and available on GitHub.



## 🔌 VSCode Extension Features

The open-source VSCode extension provides seamless integration between your IDE and the ROKI platform:

### **Authentication & Connection**
- **Browser-based Login**: Click "Open Browser to Login" to authenticate via roki.pro
- **Token Management**: Secure token storage and automatic verification
- **Multi-Editor Support**: Works with VS Code, Cursor, Code-Server, Theia, and other VSCode-based editors

### **Project Management**
- **Cloud Project Loading**: Load projects directly from your ROKI dashboard into your workspace
- **Project Detection**: Auto-detect existing AI projects in your workspace
- **Project Creation**: Create new projects with templates directly from your IDE
- **Project Validation**: Check project structure and repair missing files

### **Real-time Synchronization**
- **Bidirectional Sync**: Changes in IDE automatically sync to cloud dashboard
- **File Monitoring**: Track file changes and maintain project state
- **Conflict Resolution**: Handle merge conflicts between local and cloud changes
- **Sync Status**: Visual indicators for sync status and last update time

### **AI Context Integration**
- **Context Injection**: Automatically inject project context into AI chat sessions
- **Smart Document Selection**: Intelligent prioritization of relevant files and documents
- **Progress Integration**: Include current project status and task progress in AI context
- **Configurable Context**: Customize context size, preferences, and content selection

### **Task Management**
- **Interactive Task Editor**: Rich task editor with status tracking and progress indicators
- **Task Synchronization**: Tasks sync between IDE and cloud dashboard
- **Progress Tracking**: Automatic progress detection and milestone tracking
- **Evidence Collection**: Link implementation files to task completion

### **Document Management**
- **Cloud Document Access**: Open and edit documents from your cloud projects
- **Local Document Sync**: Save cloud documents locally for offline editing
- **Version Control**: Track document changes and maintain history
- **Collaborative Editing**: Real-time collaboration with team members

### **Advanced Features**
- **Command Palette Integration**: Access all features through VS Code command palette
- **Sidebar Integration**: Dedicated sidebar for project management and navigation
- **Keyboard Shortcuts**: Quick access to common functions
- **Error Handling**: Comprehensive error handling with user-friendly messages

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