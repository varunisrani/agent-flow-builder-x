# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7fe14eec-edf8-47a1-b479-0d397cdfe067

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7fe14eec-edf8-47a1-b479-0d397cdfe067) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7fe14eec-edf8-47a1-b479-0d397cdfe067) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

# Agent Flow Builder X

A visual agent flow builder with Langfuse analytics integration for AI agent observability.

## 🚀 New Feature: Langfuse Analytics

### **Real-time AI Agent Observability**

Monitor your AI agents with comprehensive analytics powered by Langfuse:

- **📊 Real-time Metrics**: Track traces, costs, token usage, and latency
- **📈 Visual Charts**: Traces over time and model usage breakdown  
- **💰 Cost Tracking**: Monitor API costs across all your agents
- **🔍 Trace Explorer**: View detailed execution logs and debug issues
- **⚡ Performance Insights**: Analyze response times and bottlenecks

### **How to Use Analytics**

1. **Access Analytics**: Click "See Analysis" button in the Projects page
2. **Configure Langfuse**: Enter your Langfuse credentials from [cloud.langfuse.com](https://cloud.langfuse.com)
3. **View Insights**: Monitor your agent performance in real-time

### **Getting Langfuse Credentials**

1. Sign up at [Langfuse Cloud](https://cloud.langfuse.com)
2. Create a new project
3. Go to Settings → Copy your Public Key (`pk-lf-...`) and Secret Key (`sk-lf-...`)
4. Paste them in the Analytics configuration

### **Sample Data Display**

The analytics dashboard shows:
- Total traces tracked (e.g., 1 trace)
- Model costs (e.g., $0.000267)
- Token usage (e.g., 1.06K tokens for gemini-2.0-flash)
- Time-based analytics (24h, 7d, 30d views)
- Recent trace history with detailed metadata

## Features

- **Visual Agent Builder**: Drag-and-drop interface for creating AI agent workflows
- **Real-time Analytics**: Comprehensive observability with Langfuse integration
- **Multi-platform**: Web-based with responsive design
- **Project Management**: Organize and manage multiple agent projects
- **User Authentication**: Secure access with user management

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Routing**: React Router
- **State Management**: React Context + Local Storage
- **UI Components**: Shadcn/ui + Lucide Icons
- **Analytics**: Langfuse integration
- **Animations**: Framer Motion

## Getting Started

1. **Clone the repository**
```bash
git clone https://github.com/your-repo/agent-flow-builder-x.git
cd agent-flow-builder-x
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
Create a `.env` file:
```bash
# Langfuse Configuration (get these from https://cloud.langfuse.com)
VITE_LANGFUSE_PUBLIC_KEY=pk-lf-your_public_key
VITE_LANGFUSE_SECRET_KEY=sk-lf-your_secret_key
VITE_LANGFUSE_HOST=https://cloud.langfuse.com

# For US region, use: https://us.cloud.langfuse.com
```

4. **Start the development server**
```bash
npm run dev
```

5. **Open in browser**
Navigate to `http://localhost:3000`

## Usage

### Creating Projects
1. Click "New Project" on the Projects page
2. Enter project name and description
3. Start building your agent workflow

### Analytics Integration
1. Click "See Analysis" in the Projects page
2. Configure your Langfuse credentials
3. View real-time agent observability data

### Building Agent Flows
1. Open a project
2. Use the drag-and-drop editor
3. Connect nodes to create your agent workflow
4. Deploy and monitor with analytics

## Project Structure

```
src/
├── components/         # Reusable UI components
├── pages/             # Main application pages
│   ├── Projects.tsx   # Project management
│   ├── Analytics.tsx  # Langfuse analytics dashboard
│   └── Index.tsx      # Agent flow editor
├── services/          # API and external service integrations
│   └── langfuseService.ts  # Langfuse API integration
├── hooks/             # Custom React hooks
├── lib/               # Utility functions
└── types/             # TypeScript type definitions
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
