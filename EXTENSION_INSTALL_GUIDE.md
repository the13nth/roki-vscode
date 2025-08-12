# AI Project Manager VS Code Extension - Installation Guide

## 📦 Installation Instructions

### Option 1: Install from Zip (Recommended)

1. **Extract the Extension**:
   ```bash
   cd /home/rwbts/Documents/roki
   unzip ai-project-manager-extension.zip -d ai-project-manager-extension
   ```

2. **Install in VS Code**:
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Extensions: Install from VSIX..."
   - Navigate to `/home/rwbts/Documents/roki/ai-project-manager-extension/`
   - Select the folder (VS Code will load it as an unpacked extension)

### Option 2: Load as Development Extension

1. **Open Extension Development Host**:
   - Open VS Code
   - Press `Ctrl+Shift+P`
   - Type "Developer: Reload Window" and select it
   - Press `F5` or go to `Run > Start Debugging`
   - This opens a new VS Code window with the extension loaded

2. **Or Load Unpacked**:
   - Go to Extensions view (`Ctrl+Shift+X`)
   - Click the "..." menu in the top right
   - Select "Install from VSIX..."
   - Browse to the `/home/rwbts/Documents/roki/vscode-extension/` folder

## 🚀 Usage Instructions

### Commands Available:
- **`Ctrl+Shift+P` → "Inject AI Context"**: Copies intelligent project context to clipboard
- **`Ctrl+Shift+P` → "Detect AI Project"**: Checks if current workspace has an AI project

### Automatic Features:
- **Auto Progress Tracking**: Monitors code changes and suggests task completions
- **Real-time File Watching**: Detects when tasks might be completed based on file patterns
- **Git Commit Analysis**: Analyzes recent commits for completed features

### Project Structure Required:
```
your-project/
├── .ai-project/
│   ├── config.json          # Project metadata
│   ├── requirements.md      # Project requirements
│   ├── design.md           # System design
│   ├── tasks.md            # Task list with checkboxes
│   ├── progress.json       # Progress tracking data
│   └── context/            # Context documents
│       ├── api-spec.md
│       └── design-system.md
└── src/                    # Your source code
```

## 🔧 Testing the Extension

1. **Start the Web Dashboard**:
   ```bash
   cd /home/rwbts/Documents/roki/web-dashboard
   npm run dev
   ```
   Dashboard will be available at `http://localhost:3000`

2. **Create a Test Project**:
   - Use the web dashboard to create a new project
   - Or copy the test project from `/tmp/test-ai-project/`

3. **Open Project in VS Code**:
   - Open the project folder in VS Code
   - The extension should auto-detect the `.ai-project/` structure
   - You'll see notifications about auto progress tracking starting

4. **Test Context Injection**:
   - Press `Ctrl+Shift+P`
   - Type "Inject AI Context"
   - The intelligent context will be copied to your clipboard
   - Paste it into any AI chat to see the formatted project context

5. **Test Auto Progress Tracking**:
   - Create or modify files in your project
   - The extension will analyze changes and suggest task completions
   - High confidence completions (>90%) will auto-complete
   - Medium confidence (70-90%) will prompt for confirmation

## 📊 Expected Behavior

### Automatic Progress Detection:
- **Test Files**: Creating `.spec.ts` or `.test.js` files triggers testing task detection
- **Components**: Creating `.tsx` or `.jsx` files triggers UI component task detection  
- **APIs**: Creating API files triggers backend task detection
- **Git Commits**: Commits with keywords like "implement", "complete", "add" trigger analysis

### Context Injection:
- Analyzes current file and cursor position
- Selects most relevant context documents using AI scoring
- Formats project requirements, tasks, and context for AI consumption
- Falls back to basic context if intelligent selection fails

## 🐛 Troubleshooting

### Extension Not Loading:
- Check that VS Code version is 1.74.0 or higher
- Ensure the `out/` directory contains compiled JavaScript files
- Try reloading the window (`Ctrl+R`)

### Auto Tracking Not Working:
- Check that the project has a valid `.ai-project/` structure
- Ensure the web dashboard is running on `http://localhost:3000`
- Check VS Code Developer Console for error messages

### Context Injection Fails:
- Verify the web dashboard API is accessible
- Check that context documents exist in `.ai-project/context/`
- Try the fallback mode if intelligent selection fails

## 🎯 Next Steps

Once the extension is working:
1. Create your own AI projects using the web dashboard
2. Add context documents relevant to your work
3. Use the intelligent context injection in your AI conversations
4. Let the auto progress tracking help you stay organized

The AI Project Manager system is now fully functional with both web dashboard and VS Code integration!


