# Contributing to ROKI Project Manager VSCode Extension

Thank you for your interest in contributing to the ROKI Project Manager VSCode Extension! This document provides guidelines and information for contributors.

## Getting Started

### Prerequisites

- Node.js 16 or higher
- TypeScript 5.3 or higher
- VS Code 1.74 or higher
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/roki-vscode-extension.git
   cd roki-vscode-extension
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Compile the extension**
   ```bash
   npm run compile
   ```

4. **Watch for changes during development**
   ```bash
   npm run watch
   ```

5. **Test the extension**
   - Open VS Code
   - Press `F5` to launch a new Extension Development Host window
   - Test your changes in the new window

## Development Guidelines

### Code Style

- Use TypeScript strict mode
- Follow VS Code extension best practices
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose

### File Structure

```
src/
├── extension.ts              # Main extension entry point
├── lib/                      # Core functionality
│   ├── authService.ts        # Authentication handling
│   ├── contextInjector.ts    # AI context injection
│   ├── projectDetector.ts    # Project structure detection
│   ├── progressTracker.ts    # Progress tracking
│   ├── sidebarProvider.ts    # Sidebar UI
│   └── ...                   # Other services
└── types/                    # Type definitions
    ├── index.ts
    └── shared.ts
```

### Adding New Features

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement your changes**
   - Add new functionality in appropriate files
   - Update type definitions if needed
   - Add configuration options to `package.json` if required

3. **Test your changes**
   - Test in the Extension Development Host
   - Verify error handling
   - Check for memory leaks or performance issues

4. **Update documentation**
   - Update README.md if adding new commands or features
   - Add JSDoc comments for new public APIs
   - Update this CONTRIBUTING.md if adding new development guidelines

### Adding New Commands

1. **Define the command in `package.json`**
   ```json
   {
     "command": "aiProjectManager.yourCommand",
     "title": "AI Project Manager: Your Command",
     "icon": "$(icon-name)"
   }
   ```

2. **Register the command in `extension.ts`**
   ```typescript
   const yourCommand = vscode.commands.registerCommand('aiProjectManager.yourCommand', async () => {
     // Implementation
   });
   
   context.subscriptions.push(yourCommand);
   ```

3. **Add to command palette if needed**
   ```json
   {
     "command": "aiProjectManager.yourCommand",
     "when": "true"
   }
   ```

### Error Handling

- Use try-catch blocks for async operations
- Provide user-friendly error messages
- Log errors appropriately (avoid excessive console logging)
- Handle network failures gracefully

### Configuration

- Add new configuration options to `package.json` under `contributes.configuration`
- Use descriptive property names and descriptions
- Provide sensible defaults
- Document configuration options in README.md

## Testing

### Manual Testing

1. **Test core functionality**
   - Project creation and detection
   - Context injection
   - Progress tracking
   - Dashboard synchronization

2. **Test error scenarios**
   - Network failures
   - Invalid configurations
   - Missing files or directories
   - Authentication failures

3. **Test different environments**
   - Different VS Code versions
   - Different operating systems
   - Different project structures

### Automated Testing

While we don't currently have automated tests, we encourage adding them for new features:

```typescript
// Example test structure
describe('ContextInjector', () => {
  it('should format context correctly', () => {
    // Test implementation
  });
});
```

## Pull Request Process

1. **Create a pull request**
   - Use a descriptive title
   - Provide a detailed description of changes
   - Reference any related issues

2. **Ensure your PR meets requirements**
   - Code compiles without errors
   - No TypeScript errors
   - Follows the code style guidelines
   - Includes appropriate documentation updates

3. **Respond to feedback**
   - Address review comments promptly
   - Make requested changes
   - Ask questions if anything is unclear

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

- VS Code version
- Extension version
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages (if any)
- Relevant console output

### Feature Requests

For feature requests, please include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation approach (if you have ideas)
- Any relevant examples or mockups

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:

- Age, body size, disability, ethnicity
- Gender identity and expression
- Level of experience, education
- Nationality, personal appearance
- Race, religion, sexual orientation

### Expected Behavior

- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, trolling, or inflammatory comments
- Personal attacks or political discussions
- Public or private harassment
- Publishing private information without permission
- Any conduct inappropriate in a professional setting

## Release Process

### Version Bumping

- **Patch** (0.0.X): Bug fixes and minor improvements
- **Minor** (0.X.0): New features and enhancements
- **Major** (X.0.0): Breaking changes

### Release Steps

1. Update version in `package.json`
2. Update CHANGELOG.md
3. Create a release tag
4. Build and test the extension
5. Publish to VS Code Marketplace

## Development Tips

### Debugging

- Use VS Code's built-in debugger
- Check the Output panel for extension logs
- Use `console.log` sparingly (remove before committing)
- Test with different VS Code settings

### Performance

- Avoid blocking the main thread
- Use async/await for I/O operations
- Dispose of resources properly
- Monitor memory usage during development

### VS Code API

- Familiarize yourself with the VS Code Extension API
- Use the official documentation: https://code.visualstudio.com/api
- Check existing extensions for patterns and best practices

## Getting Help

- **Documentation**: Check the README.md and code comments
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions and ideas
- **VS Code API**: Refer to the official VS Code Extension API documentation

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to the ROKI Project Manager VSCode Extension! Your contributions help make this tool better for everyone.
