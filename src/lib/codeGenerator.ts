import { Node, Edge } from '@xyflow/react';
import { BaseNodeData } from '@/components/nodes/BaseNode';

// OpenAI API key (same as used in openai.ts)
const OPENAI_API_KEY = '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';
const MODEL = 'gpt-4.1-mini';

/**
 * Generate code based on workflow nodes and edges
 */
export async function generateCode(
  nodes: Node<BaseNodeData>[], 
  edges: Edge[],
  framework: 'adk' | 'vertex' | 'custom' = 'adk'
): Promise<string> {
  try {
    // Create a structured description of the workflow
    const nodeDescriptions = nodes.map(node => {
      const { id, data } = node;
      let description = `- Node ID: ${id}\n  Type: ${data.type}\n  Label: ${data.label}\n  Description: ${data.description || 'N/A'}`;
      
      // Add type-specific details
      if (data.type === 'model' && data.modelType) {
        description += `\n  Model Type: ${data.modelType}`;
      }
      if (data.type === 'agent' && data.instruction) {
        description += `\n  Instruction: ${data.instruction}`;
      }
      if (data.type === 'tool' && data.toolConfig) {
        description += `\n  Tool Config: ${JSON.stringify(data.toolConfig)}`;
      }
      
      return description;
    }).join('\n\n');
    
    // Create a structured description of the connections
    const edgeDescriptions = edges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const targetNode = nodes.find(n => n.id === edge.target);
      
      return `- Connection from "${sourceNode?.data.label || edge.source}" to "${targetNode?.data.label || edge.target}"${edge.label ? ` (${edge.label})` : ''}`;
    }).join('\n');

    // Determine which framework to generate code for
    let frameworkDescriptor = '';
    let frameworkExample = '';
    
    if (framework === 'adk') {
      frameworkDescriptor = "Google's Agent Development Kit (ADK)";
      frameworkExample = `from google.adk.agents import Agent
from google.adk.tools import google_search

# Simple ADK agent example
agent = Agent(
    name="search_agent",
    model="gemini-2.0-flash",
    description="Agent that can search for information",
    instruction="Search for information and summarize it.",
    tools=[google_search]
)

# Example usage
response = agent.generate("What is the capital of France?")
print(response)`;
    } else if (framework === 'vertex') {
      frameworkDescriptor = "Google Vertex AI";
      frameworkExample = `from google.cloud import aiplatform

# Initialize Vertex AI
aiplatform.init(project="your-project-id", location="your-location")

# Create a Vertex AI agent
agent = aiplatform.Agent.create(
    display_name="My Vertex Agent",
    model="gemini-pro"
)

# Example interaction
response = agent.chat("What is the capital of France?")
print(response)`;
    } else {
      frameworkDescriptor = "a custom agent framework using OpenAI";
      frameworkExample = `import openai
import json

# Initialize OpenAI client
openai.api_key = "your-api-key"

# Define a custom agent
class Agent:
    def __init__(self, name, model="gpt-4.1-mini", tools=None):
        self.name = name
        self.model = model
        self.tools = tools or []
        self.conversation_history = []
        
    def generate(self, user_input):
        # Add user input to conversation
        self.conversation_history.append({"role": "user", "content": user_input})
        
        # Call the model
        response = openai.chat.completions.create(
            model=self.model,
            messages=self.conversation_history
        )
        
        # Process and return the response
        content = response.choices[0].message.content
        self.conversation_history.append({"role": "assistant", "content": content})
        return content

# Create agent instance
agent = Agent(name="my_agent")

# Example usage
response = agent.generate("What is the capital of France?")
print(response)`;
    }

    // Format the request for OpenAI
    const prompt = `You're a code generation expert. Create Python code for an agent-based workflow based on the following nodes and connections using ${frameworkDescriptor}.

NODES:
${nodeDescriptions}

CONNECTIONS:
${edgeDescriptions}

REQUIREMENTS:
1. Generate complete, runnable Python code with proper imports and error handling
2. Follow the design pattern shown in the examples 
3. The code should accurately represent the workflow described by the nodes and connections
4. Include proper documentation and usage examples

Here's a simple example of what the generated code might look like:
\`\`\`python
${frameworkExample}
\`\`\`

Generate complete, well-documented code for this workflow.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a Python expert specializing in AI agents and workflows. Your task is to generate clean, well-structured, and properly documented code based on workflow descriptions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2500,
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract code from the response
    const codeMatch = content.match(/```python\s*([\s\S]*?)```/);
    if (codeMatch && codeMatch[1]) {
      return codeMatch[1].trim();
    }
    
    // If no code block found, return the entire content
    return content;
  } catch (error) {
    console.error('Error generating code:', error);
    throw error;
  }
} 