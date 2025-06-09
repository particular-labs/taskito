#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";

// Type definitions
interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in-progress" | "in-review" | "done";
  dependencies: string[]; // Array of task IDs that must be completed first
  created: string;
  updated: string;
  size: "xs" | "s" | "m" | "l" | "xl"; // Task size estimation
  priority?: "low" | "medium" | "high";
  tags?: string[];
}

interface Project {
  name: string;
  description: string;
  created: string;
  updated: string;
  tasks: Task[];
  nextTaskId: number;
  archivedTasks?: Task[]; // For completed tasks older than X days
}

class TaskitoServer {
  private server: Server;
  private projectDir: string;
  private tasksFile: string;

  constructor() {
    this.server = new Server(
      {
        name: "taskito",
        version: "1.0.0",
        capabilities: {
          tools: {},
        }
      }
    );

    // Always look for taskito folder in current working directory
    this.projectDir = path.join(process.cwd(), "taskito");
    this.tasksFile = path.join(this.projectDir, "tasks.json");
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "initialize_project",
            description: "Initialize a new Taskito project from a PRD file or description",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Project name",
                },
                description: {
                  type: "string", 
                  description: "Project description or path to PRD file",
                },
                prd_file: {
                  type: "string",
                  description: "Optional: Path to PRD file to read and parse",
                },
              },
              required: ["name", "description"],
            },
          },
          {
            name: "create_task",
            description: "Create a new task",
            inputSchema: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "Task title",
                },
                description: {
                  type: "string",
                  description: "Task description",
                },
                size: {
                  type: "string",
                  enum: ["xs", "s", "m", "l", "xl"],
                  description: "Task size: xs (< 1h), s (1-4h), m (4-8h), l (1-2 days), xl (2+ days)",
                  default: "m",
                },
                dependencies: {
                  type: "array",
                  items: { type: "string" },
                  description: "Array of task IDs this task depends on",
                  default: [],
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Task priority",
                  default: "medium",
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "Tags for categorizing the task",
                  default: [],
                },
              },
              required: ["title", "description"],
            },
          },
          {
            name: "update_task_status",
            description: "Update a task's status",
            inputSchema: {
              type: "object",
              properties: {
                task_id: {
                  type: "string",
                  description: "Task ID to update",
                },
                status: {
                  type: "string",
                  enum: ["todo", "in-progress", "in-review", "done"],
                  description: "New status for the task",
                },
              },
              required: ["task_id", "status"],
            },
          },
          {
            name: "update_task",
            description: "Update task details",
            inputSchema: {
              type: "object",
              properties: {
                task_id: {
                  type: "string",
                  description: "Task ID to update",
                },
                title: {
                  type: "string",
                  description: "New task title",
                },
                description: {
                  type: "string",
                  description: "New task description",
                },
                size: {
                  type: "string",
                  enum: ["xs", "s", "m", "l", "xl"],
                  description: "New task size",
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "New priority",
                },
                tags: {
                  type: "array",
                  items: { type: "string" },
                  description: "New tags",
                },
              },
              required: ["task_id"],
            },
          },
          {
            name: "list_tasks",
            description: "List all tasks with optional filtering, returns markdown format",
            inputSchema: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  enum: ["todo", "in-progress", "in-review", "done"],
                  description: "Filter by status",
                },
                priority: {
                  type: "string",
                  enum: ["low", "medium", "high"],
                  description: "Filter by priority",
                },
                size: {
                  type: "string",
                  enum: ["xs", "s", "m", "l", "xl"],
                  description: "Filter by size",
                },
                tag: {
                  type: "string",
                  description: "Filter by tag",
                },
                format: {
                  type: "string",
                  enum: ["markdown", "simple"],
                  description: "Output format",
                  default: "markdown",
                },
              },
            },
          },
          {
            name: "get_task",
            description: "Get details of a specific task in markdown format",
            inputSchema: {
              type: "object",
              properties: {
                task_id: {
                  type: "string",
                  description: "Task ID to retrieve",
                },
              },
              required: ["task_id"],
            },
          },
          {
            name: "delete_task",
            description: "Delete a task",
            inputSchema: {
              type: "object",
              properties: {
                task_id: {
                  type: "string",
                  description: "Task ID to delete",
                },
              },
              required: ["task_id"],
            },
          },
          {
            name: "get_project_overview",
            description: "Get project overview in markdown format",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "check_dependencies",
            description: "Check if a task's dependencies are satisfied",
            inputSchema: {
              type: "object",
              properties: {
                task_id: {
                  type: "string",
                  description: "Task ID to check dependencies for",
                },
              },
              required: ["task_id"],
            },
          },
          {
            name: "get_available_tasks",
            description: "Get tasks that can be started (no blocking dependencies) in markdown format",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "archive_completed_tasks",
            description: "Archive completed tasks older than specified days to reduce file size",
            inputSchema: {
              type: "object",
              properties: {
                days_old: {
                  type: "number",
                  description: "Archive completed tasks older than this many days",
                  default: 30,
                },
              },
            },
          },
          {
            name: "clean_project",
            description: "Clean up project by removing deleted tasks and optimizing file structure",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "initialize_project":
            return await this.initializeProject(args);
          case "create_task":
            return await this.createTask(args);
          case "update_task_status":
            return await this.updateTaskStatus(args);
          case "update_task":
            return await this.updateTask(args);
          case "list_tasks":
            return await this.listTasks(args);
          case "get_task":
            return await this.getTask(args);
          case "delete_task":
            return await this.deleteTask(args);
          case "get_project_overview":
            return await this.getProjectOverview();
          case "check_dependencies":
            return await this.checkDependencies(args);
          case "get_available_tasks":
            return await this.getAvailableTasks();
          case "archive_completed_tasks":
            return await this.archiveCompletedTasks(args);
          case "clean_project":
            return await this.cleanProject();
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error}`
        );
      }
    });
  }

  private async ensureProjectDir(): Promise<void> {
    try {
      await fs.access(this.projectDir);
    } catch {
      await fs.mkdir(this.projectDir, { recursive: true });
    }
  }

  private async loadProject(): Promise<Project> {
    try {
      const data = await fs.readFile(this.tasksFile, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "Project not found. Please initialize a project first using initialize_project."
      );
    }
  }

  private async saveProject(project: Project): Promise<void> {
    await this.ensureProjectDir();
    project.updated = new Date().toISOString();
    await fs.writeFile(this.tasksFile, JSON.stringify(project, null, 2));
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case "todo": return "📋";
      case "in-progress": return "🔄";
      case "in-review": return "👀";
      case "done": return "✅";
      default: return "❓";
    }
  }

  private getSizeIcon(size: string): string {
    switch (size) {
      case "xs": return "🟢"; // < 1h
      case "s": return "🔵";  // 1-4h
      case "m": return "🟡";  // 4-8h
      case "l": return "🟠";  // 1-2 days
      case "xl": return "🔴"; // 2+ days
      default: return "⚪";
    }
  }

  private getPriorityIcon(priority?: string): string {
    switch (priority) {
      case "high": return "🔥";
      case "medium": return "➡️";
      case "low": return "❄️";
      default: return "➡️";
    }
  }

  private async initializeProject(args: any) {
    let description = args.description;
    
    // If PRD file is provided, read it
    if (args.prd_file) {
      try {
        description = await fs.readFile(args.prd_file, "utf-8");
      } catch (error) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Could not read PRD file: ${args.prd_file}`
        );
      }
    }

    const project: Project = {
      name: args.name,
      description,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      tasks: [],
      nextTaskId: 1,
      archivedTasks: [],
    };

    await this.saveProject(project);

    return {
      content: [
        {
          type: "text",
          text: `# 🎯 Taskito Project Initialized\n\n**Project:** ${args.name}\n\n**Location:** \`${this.projectDir}/tasks.json\`\n\n**Status:** Ready for tasks! 🚀\n\nYou can now create tasks using the \`create_task\` command.`,
        },
      ],
    };
  }

  private async createTask(args: any) {
    const project = await this.loadProject();
    
    const task: Task = {
      id: `task-${project.nextTaskId}`,
      title: args.title,
      description: args.description,
      status: "todo",
      size: args.size || "m",
      dependencies: args.dependencies || [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      priority: args.priority || "medium",
      tags: args.tags || [],
    };

    // Validate dependencies exist
    for (const depId of task.dependencies) {
      if (!project.tasks.find(t => t.id === depId)) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          `Dependency task "${depId}" not found`
        );
      }
    }

    project.tasks.push(task);
    project.nextTaskId++;
    await this.saveProject(project);

    const depText = task.dependencies.length > 0 
      ? `\n**Dependencies:** ${task.dependencies.join(", ")}`
      : "";

    return {
      content: [
        {
          type: "text",
          text: `# ✨ Task Created\n\n**ID:** \`${task.id}\`\n**Title:** ${task.title}\n**Size:** ${this.getSizeIcon(task.size)} ${task.size.toUpperCase()}\n**Priority:** ${this.getPriorityIcon(task.priority)} ${task.priority}\n**Status:** ${this.getStatusIcon(task.status)} ${task.status}${depText}`,
        },
      ],
    };
  }

  private async updateTaskStatus(args: any) {
    const project = await this.loadProject();
    const task = project.tasks.find(t => t.id === args.task_id);
    
    if (!task) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Task "${args.task_id}" not found`
      );
    }

    // Check if dependencies are satisfied before allowing status change to "in-progress"
    if (args.status === "in-progress" && task.dependencies.length > 0) {
      const unfinishedDeps = task.dependencies.filter(depId => {
        const depTask = project.tasks.find(t => t.id === depId);
        return depTask && depTask.status !== "done";
      });

      if (unfinishedDeps.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: `# ⏳ Cannot Start Task\n\n**Task:** \`${args.task_id}\`\n\n**Blocked by:** ${unfinishedDeps.map(id => `\`${id}\``).join(", ")}\n\n*Complete dependencies first before starting this task.*`,
            },
          ],
        };
      }
    }

    const oldStatus = task.status;
    task.status = args.status;
    task.updated = new Date().toISOString();
    await this.saveProject(project);

    return {
      content: [
        {
          type: "text",
          text: `# 🔄 Status Updated\n\n**Task:** \`${task.id}\` - ${task.title}\n\n**Changed:** ${this.getStatusIcon(oldStatus)} ${oldStatus} → ${this.getStatusIcon(args.status)} ${args.status}`,
        },
      ],
    };
  }

  private async updateTask(args: any) {
    const project = await this.loadProject();
    const task = project.tasks.find(t => t.id === args.task_id);
    
    if (!task) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Task "${args.task_id}" not found`
      );
    }

    // Update provided fields
    if (args.title) task.title = args.title;
    if (args.description) task.description = args.description;
    if (args.size) task.size = args.size;
    if (args.priority) task.priority = args.priority;
    if (args.tags) task.tags = args.tags;
    
    task.updated = new Date().toISOString();
    await this.saveProject(project);

    return {
      content: [
        {
          type: "text",
          text: `# ✏️ Task Updated\n\n**ID:** \`${task.id}\`\n**Title:** ${task.title}\n**Size:** ${this.getSizeIcon(task.size)} ${task.size.toUpperCase()}\n**Priority:** ${this.getPriorityIcon(task.priority)} ${task.priority}`,
        },
      ],
    };
  }

  private async listTasks(args: any) {
    const project = await this.loadProject();
    let tasks = project.tasks;

    // Apply filters
    if (args.status) {
      tasks = tasks.filter(t => t.status === args.status);
    }
    if (args.priority) {
      tasks = tasks.filter(t => t.priority === args.priority);
    }
    if (args.size) {
      tasks = tasks.filter(t => t.size === args.size);
    }
    if (args.tag) {
      tasks = tasks.filter(t => t.tags?.includes(args.tag));
    }

    if (args.format === "simple") {
      const taskList = tasks.map(task => {
        const depStatus = task.dependencies.length > 0 
          ? ` (deps: ${task.dependencies.join(", ")})`
          : "";
        return `• ${task.id}: ${task.title} [${task.status}]${depStatus}`;
      }).join("\n");

      return {
        content: [
          {
            type: "text",
            text: `Found ${tasks.length} task(s):\n\n${taskList || "No tasks match the criteria"}`,
          },
        ],
      };
    }

    // Markdown format
    const statusGroups = {
      "todo": tasks.filter(t => t.status === "todo"),
      "in-progress": tasks.filter(t => t.status === "in-progress"), 
      "in-review": tasks.filter(t => t.status === "in-review"),
      "done": tasks.filter(t => t.status === "done"),
    };

    let markdown = `# 📋 Task List\n\n`;
    
    if (tasks.length === 0) {
      markdown += "*No tasks match the criteria*\n";
    } else {
      Object.entries(statusGroups).forEach(([status, statusTasks]) => {
        if (statusTasks.length > 0) {
          markdown += `## ${this.getStatusIcon(status)} ${status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')} (${statusTasks.length})\n\n`;
          
          statusTasks.forEach(task => {
            const tags = task.tags && task.tags.length > 0 ? ` \`${task.tags.join('`  `')}\`` : "";
            const deps = task.dependencies.length > 0 ? `\n   *Dependencies: ${task.dependencies.join(", ")}*` : "";
            
            markdown += `### ${this.getSizeIcon(task.size)} \`${task.id}\` ${task.title}\n`;
            markdown += `${this.getPriorityIcon(task.priority)} **${task.priority}** ${tags}${deps}\n\n`;
            markdown += `${task.description}\n\n---\n\n`;
          });
        }
      });
    }

    return {
      content: [
        {
          type: "text",
          text: markdown,
        },
      ],
    };
  }

  private async getTask(args: any) {
    const project = await this.loadProject();
    const task = project.tasks.find(t => t.id === args.task_id);
    
    if (!task) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Task "${args.task_id}" not found`
      );
    }

    const depDetails = task.dependencies.map(depId => {
      const depTask = project.tasks.find(t => t.id === depId);
      return `- \`${depId}\`: ${depTask?.title || "Task not found"} ${depTask ? this.getStatusIcon(depTask.status) : "❓"}`;
    }).join("\n");

    const tags = task.tags && task.tags.length > 0 
      ? task.tags.map(tag => `\`${tag}\``).join("  ")
      : "*None*";

    const markdown = `# ${this.getStatusIcon(task.status)} Task Details\n\n## \`${task.id}\` ${task.title}\n\n**Status:** ${this.getStatusIcon(task.status)} ${task.status}\n**Size:** ${this.getSizeIcon(task.size)} ${task.size.toUpperCase()}\n**Priority:** ${this.getPriorityIcon(task.priority)} ${task.priority}\n**Tags:** ${tags}\n\n## Description\n\n${task.description}\n\n## Dependencies\n\n${task.dependencies.length > 0 ? depDetails : "*None*"}\n\n## Timeline\n\n**Created:** ${new Date(task.created).toLocaleDateString()}\n**Updated:** ${new Date(task.updated).toLocaleDateString()}`;

    return {
      content: [
        {
          type: "text",
          text: markdown,
        },
      ],
    };
  }

  private async deleteTask(args: any) {
    const project = await this.loadProject();
    const taskIndex = project.tasks.findIndex(t => t.id === args.task_id);
    
    if (taskIndex === -1) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Task "${args.task_id}" not found`
      );
    }

    // Check if other tasks depend on this one
    const dependentTasks = project.tasks.filter(t => 
      t.dependencies.includes(args.task_id)
    );

    if (dependentTasks.length > 0) {
      const dependentIds = dependentTasks.map(t => `\`${t.id}\``).join(", ");
      return {
        content: [
          {
            type: "text",
            text: `# ⚠️ Cannot Delete Task\n\n**Task:** \`${args.task_id}\`\n\n**Blocked by dependencies in:** ${dependentIds}\n\n*Remove dependencies first or delete dependent tasks.*`,
          },
        ],
      };
    }

    const deletedTask = project.tasks[taskIndex];
    project.tasks.splice(taskIndex, 1);
    await this.saveProject(project);

    return {
      content: [
        {
          type: "text",
          text: `# 🗑️ Task Deleted\n\n**Removed:** \`${deletedTask.id}\` - ${deletedTask.title}`,
        },
      ],
    };
  }

  private async getProjectOverview() {
    const project = await this.loadProject();
    
    const statusCounts = {
      todo: 0,
      "in-progress": 0,
      "in-review": 0,
      done: 0,
    };

    const sizeCounts = {
      xs: 0, s: 0, m: 0, l: 0, xl: 0,
    };

    project.tasks.forEach(task => {
      statusCounts[task.status]++;
      sizeCounts[task.size]++;
    });

    const totalTasks = project.tasks.length;
    const completionRate = totalTasks > 0 ? ((statusCounts.done / totalTasks) * 100).toFixed(1) : "0";
    const archivedCount = project.archivedTasks?.length || 0;

    const markdown = `# 🎯 ${project.name}\n\n## 📊 Overview\n\n**Total Active Tasks:** ${totalTasks}\n**Archived Tasks:** ${archivedCount}\n**Completion Rate:** ${completionRate}%\n\n## 📋 Status Breakdown\n\n| Status | Count | Icon |\n|--------|-------|------|\n| Todo | ${statusCounts.todo} | ${this.getStatusIcon("todo")} |\n| In Progress | ${statusCounts["in-progress"]} | ${this.getStatusIcon("in-progress")} |\n| In Review | ${statusCounts["in-review"]} | ${this.getStatusIcon("in-review")} |\n| Done | ${statusCounts.done} | ${this.getStatusIcon("done")} |\n\n## 📏 Size Distribution\n\n| Size | Count | Time | Icon |\n|------|-------|------|------|\n| XS | ${sizeCounts.xs} | < 1h | ${this.getSizeIcon("xs")} |\n| S | ${sizeCounts.s} | 1-4h | ${this.getSizeIcon("s")} |\n| M | ${sizeCounts.m} | 4-8h | ${this.getSizeIcon("m")} |\n| L | ${sizeCounts.l} | 1-2 days | ${this.getSizeIcon("l")} |\n| XL | ${sizeCounts.xl} | 2+ days | ${this.getSizeIcon("xl")} |\n\n**Last Updated:** ${new Date(project.updated).toLocaleString()}`;

    return {
      content: [
        {
          type: "text",
          text: markdown,
        },
      ],
    };
  }

  private async checkDependencies(args: any) {
    const project = await this.loadProject();
    const task = project.tasks.find(t => t.id === args.task_id);
    
    if (!task) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Task "${args.task_id}" not found`
      );
    }

    if (task.dependencies.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `# ✅ Dependencies Clear\n\n**Task:** \`${task.id}\` - ${task.title}\n\n*No dependencies - ready to start anytime!*`,
          },
        ],
      };
    }

    const depStatus = task.dependencies.map(depId => {
      const depTask = project.tasks.find(t => t.id === depId);
      return {
        id: depId,
        title: depTask?.title || "Task not found",
        status: depTask?.status || "unknown",
        completed: depTask?.status === "done",
      };
    });

    const completedDeps = depStatus.filter(dep => dep.completed);
    const pendingDeps = depStatus.filter(dep => !dep.completed);
    const canStart = pendingDeps.length === 0;

    let markdown = `# ${canStart ? "✅" : "⏳"} Dependency Check\n\n**Task:** \`${task.id}\` - ${task.title}\n\n**Status:** ${canStart ? "Ready to start!" : "Waiting for dependencies"}\n\n`;
    
    if (completedDeps.length > 0) {
      markdown += `## ✅ Completed Dependencies\n\n`;
      completedDeps.forEach(dep => {
        markdown += `- \`${dep.id}\`: ${dep.title}\n`;
      });
      markdown += "\n";
    }

    if (pendingDeps.length > 0) {
      markdown += `## ⏳ Pending Dependencies\n\n`;
      pendingDeps.forEach(dep => {
        markdown += `- \`${dep.id}\`: ${dep.title} (${dep.status})\n`;
      });
    }

    return {
      content: [
        {
          type: "text",
          text: markdown,
        },
      ],
    };
  }

  private async getAvailableTasks() {
    const project = await this.loadProject();
    
    const availableTasks = project.tasks.filter(task => {
      // Only include todo tasks
      if (task.status !== "todo") return false;
      
      // Check if all dependencies are completed
      if (task.dependencies.length > 0) {
        const allDepsCompleted = task.dependencies.every(depId => {
          const depTask = project.tasks.find(t => t.id === depId);
          return depTask && depTask.status === "done";
        });
        return allDepsCompleted;
      }
      
      return true;
    });

    let markdown = `# 🚀 Available Tasks\n\n`;
    
    if (availableTasks.length === 0) {
      markdown += "*No tasks are currently available to start*\n\n";
      markdown += "Check if there are tasks waiting for dependencies to be completed.";
    } else {
      markdown += `Found **${availableTasks.length}** task(s) ready to start:\n\n`;
      
      // Group by priority
      const priorityGroups = {
        high: availableTasks.filter(t => t.priority === "high"),
        medium: availableTasks.filter(t => t.priority === "medium"),
        low: availableTasks.filter(t => t.priority === "low"),
      };

      Object.entries(priorityGroups).forEach(([priority, tasks]) => {
        if (tasks.length > 0) {
          markdown += `## ${this.getPriorityIcon(priority)} ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority\n\n`;
          
          tasks.forEach(task => {
            markdown += `### ${this.getSizeIcon(task.size)} \`${task.id}\` ${task.title}\n`;
            markdown += `**Size:** ${task.size.toUpperCase()} • **Tags:** ${task.tags?.join(", ") || "None"}\n\n`;
            markdown += `${task.description}\n\n---\n\n`;
          });
        }
      });
    }

    return {
      content: [
        {
          type: "text",
          text: markdown,
        },
      ],
    };
  }

  private async archiveCompletedTasks(args: any) {
    const project = await this.loadProject();
    const daysOld = args.days_old || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const tasksToArchive = project.tasks.filter(task => 
      task.status === "done" && new Date(task.updated) < cutoffDate
    );

    if (tasksToArchive.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `# 📦 Archive Complete\n\n*No completed tasks older than ${daysOld} days found.*`,
          },
        ],
      };
    }

    // Move tasks to archive
    project.archivedTasks = project.archivedTasks || [];
    project.archivedTasks.push(...tasksToArchive);

    // Remove from active tasks
    project.tasks = project.tasks.filter(task => !tasksToArchive.includes(task));

    await this.saveProject(project);

    return {
      content: [
        {
          type: "text",
          text: `# 📦 Tasks Archived\n\n**Archived:** ${tasksToArchive.length} completed tasks older than ${daysOld} days\n\n**Active Tasks:** ${project.tasks.length}\n**Archived Tasks:** ${project.archivedTasks.length}\n\n*File size reduced! Archived tasks are still stored but don't appear in regular listings.*`,
        },
      ],
    };
  }

  private async cleanProject() {
    const project = await this.loadProject();
    const originalTaskCount = project.tasks.length;
    const originalArchivedCount = project.archivedTasks?.length || 0;

    // Remove any invalid references in dependencies
    project.tasks.forEach(task => {
      task.dependencies = task.dependencies.filter(depId => 
        project.tasks.some(t => t.id === depId)
      );
    });

    // Compact the project structure
    const cleanedProject = {
      name: project.name,
      description: project.description,
      created: project.created,
      updated: new Date().toISOString(),
      tasks: project.tasks,
      nextTaskId: project.nextTaskId,
      ...(project.archivedTasks && project.archivedTasks.length > 0 && {
        archivedTasks: project.archivedTasks
      })
    };

    await this.saveProject(cleanedProject);

    // Get file size
    const stats = await fs.stat(this.tasksFile);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    return {
      content: [
        {
          type: "text",
          text: `# 🧹 Project Cleaned\n\n**Active Tasks:** ${originalTaskCount}\n**Archived Tasks:** ${originalArchivedCount}\n**File Size:** ${fileSizeKB} KB\n\n✅ Removed invalid dependency references\n✅ Optimized file structure\n✅ Updated timestamps`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Taskito MCP server running on stdio");
  }
}

const server = new TaskitoServer();
server.run().catch(console.error);