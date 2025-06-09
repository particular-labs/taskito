# 🎯 Taskito

**A tiny task assistant** - Lightweight MCP (Model Context Protocol) server for task management with dependency tracking and beautiful markdown output.

## ✨ Features

- **📋 Simple Task Management**: Create, update, delete, and list tasks
- **🔗 Smart Dependencies**: Define task dependencies with automatic blocking
- **📏 Task Sizing**: Estimate work with XS/S/M/L/XL sizing (< 1h to 2+ days)
- **🎨 Beautiful Markdown**: Pretty-printed output for Windsurf and other UIs
- **📁 Project-Based**: Each project gets its own `taskito/tasks.json` folder
- **🌍 Global Installation**: Install once, use everywhere
- **🧹 Auto-Cleanup**: Archive old tasks and optimize file size

## 🚀 Installation

### Quick Install (Recommended)

```bash
# Install globally from npm
npm install -g @particular-labs/taskito
```

### Alternative Installation Methods

**From GitHub:**
```bash
npm install -g git+https://github.com/particular-labs/taskito.git
```

**From local clone:**
```bash
git clone https://github.com/particular-labs/taskito.git
cd taskito
npm install -g .
```

### Verify Installation

```bash
# Check if taskito is available
taskito --version

# Verify global installation
npm list -g @particular-labs/taskito
```

## ⚙️ Configuration

### MCP Client Setup

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "taskito": {
      "command": "taskito"
    }
  }
}
```

For Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "taskito": {
      "command": "taskito"
    }
  }
}
```

### Start Using

Navigate to any project directory and start using Taskito:

```bash
cd my-project
# Taskito will create ./taskito/tasks.json automatically
```

## 📖 Usage Examples

### Initialize Your Project
```
Initialize project "My Web App" with description "A modern web application with user authentication"
```

### Create Tasks with Sizing
```
Create a task "Setup Database" with description "Configure PostgreSQL database" with size "m" and priority "high"

Create a task "User Authentication" that depends on task-1 with size "l"
```

### Track Progress
```
List all tasks
Update task-1 status to "in-progress" 
Show me available tasks I can start now
Get project overview
```

## 🎯 Task Status Workflow

- **📋 todo** → **🔄 in-progress** → **👀 in-review** → **✅ done**

## 📏 Task Sizing Guide

| Size | Icon | Time Estimate | Use For |
|------|------|---------------|---------|
| **XS** | 🟢 | < 1 hour | Quick fixes, small updates |
| **S** | 🔵 | 1-4 hours | Small features, bug fixes |
| **M** | 🟡 | 4-8 hours | Medium features, refactoring |
| **L** | 🟠 | 1-2 days | Large features, integrations |
| **XL** | 🔴 | 2+ days | Major features, architecture changes |

## 🛠️ Available Commands

### Project Management
- `initialize_project` - Initialize a new project from PRD or description
- `get_project_overview` - Get project statistics in beautiful markdown

### Task Management
- `create_task` - Create a new task with size, priority, and dependencies
- `update_task` - Update task details (title, description, size, etc.)
- `update_task_status` - Change task status with dependency validation
- `get_task` - Get detailed task information in markdown
- `list_tasks` - List tasks with filtering (status, priority, size, tags)
- `delete_task` - Delete a task (validates no dependents exist)

### Smart Workflows
- `check_dependencies` - Check if a task's dependencies are satisfied
- `get_available_tasks` - Get tasks ready to start (no blocking dependencies)

### File Management
- `archive_completed_tasks` - Archive old completed tasks to reduce file size
- `clean_project` - Clean up invalid references and optimize file structure

## 📁 Project Structure

When you initialize Taskito in a project, it creates:

```
your-project/
├── taskito/
│   └── tasks.json          # All your tasks and project data
├── src/                    # Your project files
└── README.md
```

The `tasks.json` file contains:
```json
{
  "name": "Project Name",
  "description": "Project description",
  "tasks": [...],
  "archivedTasks": [...],   // Old completed tasks
  "nextTaskId": 42
}
```

## 🗂️ Managing File Size

As your project grows, the `tasks.json` file can get large. Taskito provides several strategies:

### 1. Archive Completed Tasks
```
Archive completed tasks older than 30 days
```
This moves old completed tasks to `archivedTasks` array, keeping them stored but out of daily view.

### 2. Clean Project
```
Clean project
```
Removes invalid dependency references and optimizes the file structure.

### 3. Manual Strategies

**Split by Epic/Milestone:**
```bash
# Create separate Taskito projects for major features
mkdir feature-auth && cd feature-auth
# Initialize separate project: "User Authentication Epic"

mkdir feature-payments && cd feature-payments  
# Initialize separate project: "Payment System Epic"
```

**Archive by Quarter/Release:**
```bash
# Before major release, archive the project
cp taskito/tasks.json taskito/tasks-v1.0.0-backup.json
# Archive all completed tasks, start fresh for next version
```

## 🎨 Markdown Output

All Taskito responses are formatted in beautiful markdown with:
- 📋 Status icons (todo/in-progress/in-review/done)
- 📏 Size indicators (🟢🔵🟡🟠🔴 for XS/S/M/L/XL)
- 🔥 Priority markers (🔥 high, ➡️ medium, ❄️ low)
- 📊 Tables for project overviews
- 🎯 Clear sections and formatting

Perfect for Windsurf, Claude Desktop, and other markdown-aware UIs!

## 🚀 Releasing (For Maintainers)

### Automated GitHub Releases

This project uses **fully automated releases** via GitHub Actions. No local commands needed!

#### Method 1: Version Bump + Push (Recommended)
```bash
# 1. Update version in package.json locally
npm run version:patch   # 1.0.0 → 1.0.1 (bug fixes)
npm run version:minor   # 1.0.0 → 1.1.0 (new features)  
npm run version:major   # 1.0.0 → 2.0.0 (breaking changes)
npm run version:beta    # 1.0.0 → 1.1.0-beta.0 (pre-release)

# 2. Commit and push
git add package.json
git commit -m "Bump version to $(npm pkg get version | tr -d '\"')"
git push

# 3. GitHub Actions automatically:
#    ✅ Tests the code
#    ✅ Builds the project  
#    ✅ Publishes to npm
#    ✅ Creates git tag
#    ✅ Creates GitHub release
```

#### Method 2: Manual Tag Creation
```bash
# Create and push a tag - triggers immediate release
git tag v1.0.1
git push origin v1.0.1

# GitHub Actions handles the rest automatically
```

#### Method 3: GitHub UI
1. Go to your GitHub repo
2. Click "Releases" → "Create a new release"
3. Create tag `v1.0.1` and publish
4. Automatic release triggers

### Setup Requirements

1. **NPM Token**: Add `NPM_TOKEN` to GitHub repository secrets
   - Go to npmjs.com → Access Tokens → Generate Token
   - Add to GitHub: Settings → Secrets → Actions → `NPM_TOKEN`

2. **Repository Settings**: Ensure GitHub Actions are enabled
   - Settings → Actions → General → Allow all actions

## 🔧 Development

### Local Development
```bash
git clone <repo>
cd taskito
npm install
npm run dev        # Run in development mode
npm run build      # Build for production
```

### Project Structure
```
taskito/
├── src/
│   └── index.ts          # Main server implementation
├── dist/                 # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## 💡 Tips & Tricks

### 1. Start Small
Begin with XS and S tasks to build momentum:
```
Create task "Update README" with size "xs"
Create task "Fix broken link" with size "xs" 
```

### 2. Use Dependencies Wisely
Chain related tasks:
```
Create task "Database Schema" with size "m"
Create task "User Model" that depends on task-1 with size "s"
Create task "Auth Controller" that depends on task-2 with size "m"
```

### 3. Tag for Organization
```
Create task "Frontend Login Form" with tags "frontend,auth,ui"
List all tasks with tag "frontend"
```

### 4. Regular Reviews
```
Show project overview
List all tasks with status "in-review"
Get available tasks
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly: `npm run dev`
5. Commit: `git commit -am 'Add feature'`
6. Push: `git push origin feature-name`
7. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Troubleshooting

### Common Issues

**"Project not found" error:**
```
# Initialize a project first
Initialize project "My Project" with description "Project description"
```

**"Cannot start task - dependencies not satisfied":**
```
# Check what's blocking the task
Check dependencies for task-5
# Or see what's available to start
Get available tasks
```

**Large file size:**
```
# Archive old completed tasks
Archive completed tasks older than 30 days
# Clean up the project
Clean project
```

**Global command not found:**
```bash
# Reinstall globally
npm install -g @particular-labs/taskito

# Or check if npm global bin is in PATH
npm config get prefix
# Add /bin to your PATH if needed
```

### Getting Help

- Check the markdown output for detailed error messages
- Use `Get project overview` to see current state
- Try `Clean project` to fix file issues
- For development issues, run `npm run dev` for detailed logs

---

**Happy task management with Taskito! 🎯✨**