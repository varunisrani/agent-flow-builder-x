# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Agent Flow Builder X** is a visual AI agent workflow builder with real-time analytics. It's a React-based web application that allows users to create, manage, and monitor AI agent workflows through a drag-and-drop interface powered by XYFlow.

## Essential Commands

### Development
```bash
npm run dev          # Start development server (port 8080)
npm run build        # Production build
npm run build:ts     # TypeScript check + build
npm run lint         # ESLint with TypeScript rules
npm run preview      # Preview production build
```

### Deployment
```bash
npm run deploy       # Deploy to Vercel staging
npm run deploy:prod  # Deploy to Vercel production
```

## Architecture Overview

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **Flow Editor**: XYFlow/React for visual workflow creation
- **UI Framework**: Tailwind CSS + Shadcn/ui components
- **State Management**: React Context + TanStack Query
- **Code Execution**: E2B sandbox environment
- **Analytics**: Langfuse integration for AI observability
- **Memory**: Mem0 integration for agent memory
- **Backend**: Express.js server + Vercel serverless functions

### Key Architecture Components

#### Flow Editor System (`/src/components`)
- **BaseNode.tsx**: Core node component supporting multiple types (agent, tool, memory, langfuse)
- **Flow editor**: Drag-and-drop interface with undo/redo functionality
- **Node types**: agent, tool, input, output, model, mcp-client, mcp-server, langfuse, memory
- **Code generation**: Automatic Python agent code generation from visual flows

#### Service Layer (`/src/services`)
- **langfuseService.ts**: AI observability and analytics
- **mem0Service.ts**: Memory integration for agent context
- **projectService.ts**: Project lifecycle management  
- **agentService.ts**: Agent creation and management

#### Pages Architecture (`/src/pages`)
- **Index.tsx**: Main flow editor with visual workflow builder
- **Analytics.tsx**: Langfuse dashboard integration
- **Projects.tsx**: Multi-project workspace management
- **Auth.tsx**: Authentication interface

## Code Generation System

The application generates Python agents from visual flows:

### Key Files
- **`/src/lib/codeGeneration.ts`**: Core code generation logic
- **Templates**: ADK (Agent Development Kit) and MCP (Model Context Protocol) patterns
- **Integration detection**: Automatically detects Langfuse, Mem0, and MCP configurations
- **Verification**: Built-in code verification and error fixing

### Code Generation Flow
1. Extract configurations from visual nodes
2. Generate Python agent code using templates
3. Apply integrations (Langfuse analytics, Mem0 memory, MCP tools)
4. Verify and fix code using AI-powered verification
5. Execute in E2B sandbox environment

## Environment Configuration

Required environment variables:
```bash
# Core APIs
VITE_OPENAI_API_KEY=           # OpenAI integration
VITE_OPENROUTER_API_KEY=       # OpenRouter for code generation
E2B_API_KEY=                   # E2B code execution (server)
VITE_E2B_API_KEY=             # E2B code execution (client)

# Analytics Integration
VITE_LANGFUSE_PUBLIC_KEY=      # Langfuse analytics
VITE_LANGFUSE_SECRET_KEY=      # Langfuse analytics
VITE_LANGFUSE_HOST=            # Langfuse endpoint

# Memory Integration (optional)
MEM0_API_KEY=                  # Mem0 memory service
MEM0_HOST=                     # Mem0 endpoint
```

## Visual Flow to Code Mapping

### Node Types and Generated Code
- **Agent nodes**: Generate main agent class with instructions and prompts
- **MCP nodes**: Generate MCP client/server configurations with Smithery integration
- **Langfuse nodes**: Add analytics instrumentation to agent code
- **Memory nodes**: Integrate Mem0 for persistent agent memory
- **Tool nodes**: Generate custom tool implementations

### Code Templates
- **ADK Pattern**: Google Agent Development Kit structure
- **MCP Pattern**: Model Context Protocol integration
- **Memory-enabled**: Agents with persistent context via Mem0
- **Analytics-enabled**: Agents with Langfuse observability

## Development Patterns

### Component Structure
- Use Shadcn/ui components for consistent styling
- Follow the BaseNode pattern for new node types
- Implement proper TypeScript interfaces for all data structures
- Use React Context for global state management

### Service Integration
- Follow the pattern established in `langfuseService.ts` and `mem0Service.ts`
- Implement proper error handling and fallback strategies
- Use environment variables for API keys with localStorage fallbacks
- Include comprehensive logging for debugging

### Code Generation
- Extend templates in `/src/lib/codeGeneration.ts`
- Add new node type detection in `hasMemoryNodes()` pattern
- Update configuration extraction functions for new integrations
- Ensure generated code follows Python best practices

## File Locations

### Import Aliases
- `@/*` maps to `./src/*` (configured in tsconfig.json and Vite)

### Key Directories
- `/src/components/nodes/`: Visual flow node components
- `/src/components/ui/`: Shadcn/ui component library
- `/src/lib/`: Utility functions and core logic
- `/server/`: Express.js backend for agent management
- `/agents/`: Generated agent code output
- `/adk_agent_samples/`: Reference implementations

## Integration Points

### E2B Code Execution
- Sandbox environment for running generated Python agents
- Real-time code execution with output streaming
- File system access for agent code and dependencies

### Langfuse Analytics  
- Automatic instrumentation of generated agents
- Real-time analytics dashboard integration
- Trace collection for agent conversations

### Mem0 Memory
- Persistent context across agent conversations
- Memory types: preferences, conversation, knowledge, all
- User isolation and retention management

### MCP Protocol
- Smithery integration for MCP server discovery
- Dynamic tool loading and configuration
- Profile-based MCP client generation

## Common Development Tasks

### Adding New Node Types
1. Extend `BaseNodeData` interface in `BaseNode.tsx`
2. Add color styling in `getNodeColor()` function
3. Create configuration UI in `NaturalLanguageInput.tsx`
4. Update code generation in `codeGeneration.ts`
5. Add detection logic in `CodeGenerationModal.tsx`

### Adding New Service Integrations
1. Create service file following `langfuseService.ts` pattern
2. Add configuration interface and extraction functions
3. Update code generation templates
4. Add UI configuration components
5. Include in environment variable documentation

### Debugging Code Generation
- Check browser console for debug logs
- Verify node configurations in flow editor
- Test generated code in E2B sandbox
- Use verification system for code quality checks
when user say adk doc use this https://google.github.io/adk-docs/
and also to test this adk agent run first source venv after that , python agent.py
