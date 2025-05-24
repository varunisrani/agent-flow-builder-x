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

A visual no-code/low-code builder for AI agent workflows.

## Features

- Visual flow builder for AI agents
- Natural language to flow conversion
- Multiple agent frameworks support
- Code generation for different agent frameworks
- Syntax highlighting

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/agent-flow-builder-x.git
cd agent-flow-builder-x
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Add your OpenAI API key to the `.env` file:
```
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

5. Start the development server:
```bash
npm run dev
```

## Environment Variables

Before running the application, you need to set up your environment variables:

1. Create a `.env` file in the root directory
2. Add the following variables:
```env
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_API_BASE=https://openrouter.ai/api/v1
```

Replace `your-openrouter-api-key` with your actual OpenRouter API key.

## Usage

1. Open the application in your browser at `http://localhost:3000`
2. Use the node palette to add agents, tools, and models to your workflow
3. Connect the nodes to create a flowchart
4. Alternatively, use the natural language builder to generate a flow from text
5. Generate code for your workflow in different agent frameworks

## License

MIT
