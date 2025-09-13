# ROKI Project Manager - Universal VSCode Extension

An intelligent, universal VSCode extension that provides AI-powered project management capabilities with context injection, progress tracking, and seamless integration with the ROKI dashboard. **Compatible with all VSCode-based editors** including Visual Studio Code, Cursor, Code-Server, Theia, and any other editor built on the VSCode platform.

## Features

### 🤖 AI Context Injection (coming soon)
- Automatically injects project context into AI chat sessions
- Intelligent document selection and prioritization
- Configurable context size and preferences
- Support for multiple AI models and providers

### 📊 Project Management
- Real-time progress tracking and analytics
- Task management with interactive task editor
- Requirements and design document management
- Automatic project state updates

### 🔄 Cloud Synchronization
- Seamless sync with ROKI web dashboard
- Real-time collaboration features
- Project backup and restore capabilities
- Multi-device project access

### 🎯 Smart Project Detection
- Automatic AI project structure detection
- Project template generation
- Intelligent file organization
- Progress evidence collection

### 🌐 Universal Compatibility
- **Cross-Editor Support**: Works with all VSCode-based editors
- **Platform Agnostic**: Compatible with Windows, macOS, and Linux
- **Cloud Ready**: Functions in browser-based and cloud development environments
- **Remote Development**: Supports remote development and SSH connections
- **Consistent Experience**: Identical functionality across all supported editors

## Installation

### Universal Compatibility
This extension works seamlessly across all VSCode-based editors:
- **Visual Studio Code** (Windows, macOS, Linux)
- **Cursor** (AI-powered code editor)
- **Code-Server** (Browser-based VSCode)
- **Theia** (Cloud and desktop IDE)
- **GitHub Codespaces** (Cloud development environment)
- **Any VSCode-compatible editor**

### From VSIX Package
1. Download the latest `.vsix` file from the [Releases](https://github.com/the13nth/roki-vscode/releases) page
2. Open your VSCode-based editor
3. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Click the "..." menu and select "Install from VSIX..."
5. Select the downloaded `.vsix` file

### From Source
1. Clone this repository
2. Install dependencies: `npm install`
3. Compile the extension: `npm run compile`
4. Package the extension: `npm run package`
5. Install the generated `.vsix` file

## Quick Start

1. **Open a project** in your VSCode-based editor
2. **Create an AI project** using the command palette:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "AI Project Manager: Create New Project"
   - Follow the setup wizard

3. **Connect to dashboard** (optional):
   - Use "AI Project Manager: Connect to Dashboard" command
   - Configure your dashboard URL in settings

4. **Start using AI context injection**:
   - Press `Ctrl+Alt+I` to inject context into AI chat
   - Or enable auto-injection in settings

### Cross-Platform Support
The extension maintains full functionality across different operating systems and VSCode-based environments, ensuring a consistent experience whether you're using:
- Desktop applications (VS Code, Cursor)
- Web-based editors (Code-Server, GitHub Codespaces)
- Cloud development environments
- Remote development setups

## Configuration

### Dashboard Connection
Configure your ROKI dashboard URL in your VSCode-based editor settings:

```json
{
  "aiProjectManager.dashboardUrl": "https://your-dashboard-url.com"
}
```

### Context Preferences
Customize AI context injection:

```json
{
  "aiProjectManager.autoInject": true,
  "aiProjectManager.maxContextSize": 8000,
  "aiProjectManager.prioritizeRecent": true,
  "aiProjectManager.includeProgress": true,
  "aiProjectManager.includeCurrentTask": true
}
```

### Authentication
For cloud features, you'll need to authenticate:

1. Use "AI Project Manager: Open Browser to Login" command
2. Copy the authentication token from the browser
3. Use "AI Project Manager: Enter Token" to save it

## Commands

### Core Commands
- `AI Project Manager: Inject Context` - Manually inject project context
- `AI Project Manager: Create New Project` - Set up a new AI project
- `AI Project Manager: Update Project State` - Analyze and update project progress
- `AI Project Manager: Connect to Dashboard` - Connect to ROKI dashboard

### Project Management
- `AI Project Manager: Load Project from Cloud` - Load project from dashboard
- `AI Project Manager: List My Projects` - View your cloud projects
- `AI Project Manager: Open Task Editor` - Open interactive task editor
- `AI Project Manager: Validate Project` - Check project structure

### Authentication
- `AI Project Manager: Login` - Authenticate with dashboard
- `AI Project Manager: Logout` - Clear authentication
- `AI Project Manager: Check Token` - Verify authentication token

## Keyboard Shortcuts

- `Ctrl+Alt+I` / `Cmd+Alt+I` - Inject context
- `Ctrl+Alt+Shift+I` / `Cmd+Alt+Shift+I` - Auto-inject context
- `Ctrl+Alt+U` / `Cmd+Alt+U` - Update project state

## Project Structure

The extension creates the following structure in your projects:

```
your-project/
├── .kiro/
│   └── specs/
│       └── ai-project-manager/
│           ├── config.json          # Project configuration
│           ├── requirements.md      # Project requirements
│           ├── design.md           # System design
│           ├── tasks.md            # Task management
│           └── progress.json       # Progress tracking
└── .ai-project/
    └── context/
        └── project-overview.md     # Context documents
```

## Features in Detail

### AI Context Injection
The extension intelligently selects and formats project context for AI interactions:

- **Document Prioritization**: Recent and relevant files are prioritized
- **Size Management**: Context is truncated to fit within token limits
- **Progress Integration**: Current project status is included
- **Task Context**: Active tasks and requirements are highlighted

### Progress Tracking
Automatic progress detection and tracking:

- **File Analysis**: Monitors code changes and documentation updates
- **Task Completion**: Detects completed tasks and requirements
- **Evidence Collection**: Gathers proof of progress and implementation
- **Dashboard Sync**: Real-time synchronization with web dashboard

### Task Management
Interactive task editor with rich features:

- **Status Tracking**: TODO, In Progress, Review, Done
- **Progress Indicators**: Visual progress bars and completion percentages
- **Evidence Markers**: Links to implementation and proof
- **Cloud Sync**: Tasks sync across devices via dashboard

## Development

### Prerequisites
- Node.js 16+
- TypeScript 5.3+
- VSCode-based editor 1.74+ (VS Code, Cursor, Code-Server, Theia, etc.)

### Building
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Package extension
npm run package
```

### Testing
```bash
# Run tests
npm test

# Test in VS Code
npm run test:extension
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style
- Use TypeScript strict mode
- Follow VS Code extension best practices
- Add JSDoc comments for public APIs
- Use meaningful variable and function names

## Troubleshooting

### Common Issues

**Extension not activating:**
- Check VSCode-based editor version compatibility (requires 1.74+)
- Verify the extension is properly installed
- Check the Output panel for error messages
- Ensure you're using a compatible VSCode-based editor

**Dashboard connection failed:**
- Verify dashboard URL in settings
- Check network connectivity
- Ensure authentication token is valid

**Context injection not working:**
- Verify project structure is correct
- Check context preferences in settings
- Ensure files are properly formatted

**Progress tracking issues:**
- Verify project has proper structure
- Check file permissions
- Review generated progress.json file

### Debug Information
Enable debug logging by setting:
```json
{
  "aiProjectManager.debug": true
}
```

Check the Output panel for detailed logs and error messages.

## Support

- **Issues**: [GitHub Issues](https://github.com/your-username/roki-vscode-extension/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/roki-vscode-extension/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/roki-vscode-extension/wiki)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for the ROKI project management platform
- Integrates with VSCode's universal extension API
- Uses TypeScript for type safety and better development experience
- Designed for maximum compatibility across all VSCode-based editors

---

**Note**: This extension is designed to work with the ROKI web dashboard. While it can function independently for local project management, full features require dashboard connectivity. The extension's universal design ensures it works seamlessly across all VSCode-based editors, providing a consistent experience regardless of your development environment.
