import type { 
  VerificationError, 
  AIFixRequest, 
  AIFixResponse, 
  OpenRouterRequest, 
  OpenRouterResponse 
} from './types';

/**
 * OpenRouter AI-Powered Code Fixing Service
 * Uses OpenRouter API to intelligently fix code errors
 */
export class OpenRouterFixingService {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(apiKey: string, options?: { baseUrl?: string; model?: string }) {
    this.apiKey = apiKey;
    this.baseUrl = options?.baseUrl || 'https://openrouter.ai/api/v1';
    this.defaultModel = options?.model || 'openai/gpt-4o-mini';
  }

  /**
   * Fix code errors using AI
   */
  async fixErrors(request: AIFixRequest): Promise<AIFixResponse> {
    try {
      // Build context-aware prompt
      const prompt = this.buildFixingPrompt(request);
      
      // Make OpenRouter API call
      const openRouterRequest: OpenRouterRequest = {
        model: this.defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are an expert Python developer specializing in Google ADK agents and Langfuse analytics integration. Your task is to fix code errors while preserving functionality and following best practices.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 4000,
        top_p: 0.9
      };

      const response = await this.callOpenRouter(openRouterRequest);
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response from OpenRouter API');
      }

      const aiResponse = response.choices[0].message.content;
      
      // Parse AI response
      return this.parseAIResponse(aiResponse, request);
      
    } catch (error) {
      console.error('OpenRouter fixing service error:', error);
      return {
        success: false,
        fixedCode: request.code,
        appliedFixes: [],
        unfixedErrors: request.errors,
        reasoning: `AI fixing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0
      };
    }
  }

  /**
   * Build context-aware prompt for fixing code
   */
  private buildFixingPrompt(request: AIFixRequest): string {
    const { code, errors, context, options } = request;
    
    const errorDescriptions = errors.map(error => 
      `- ${error.type} (Line ${error.line || 'unknown'}): ${error.message}${error.originalCode ? `\n  Code: ${error.originalCode}` : ''}`
    ).join('\n');

    const integrationContext = context.integrations.length > 0 
      ? `\nIntegrations being used: ${context.integrations.join(', ')}`
      : '';

    return `I need you to fix Python code errors in a ${context.framework} agent. Here are the requirements:

CONTEXT:
- Framework: ${context.framework}
- Language: ${context.language}${integrationContext}
- Preserve structure: ${options.preserveStructure}
- Fix only errors: ${options.fixOnlyErrors}

ERRORS TO FIX:
${errorDescriptions}

ORIGINAL CODE:
\`\`\`python
${code}
\`\`\`

REQUIREMENTS:
1. Fix all identified errors while preserving functionality
2. Maintain the original code structure and logic
3. Use best practices for ${context.framework} development
4. Add proper error handling where needed
5. Ensure Langfuse compatibility (version 3.0+)
6. Keep all existing imports and dependencies
7. Add helpful comments explaining fixes

RESPONSE FORMAT:
Please respond in the following JSON format:
\`\`\`json
{
  "success": true,
  "fixedCode": "COMPLETE_FIXED_CODE_HERE",
  "appliedFixes": [
    {
      "errorId": "error_id",
      "fix": "Description of what was fixed",
      "confidence": 95,
      "reasoning": "Why this fix was applied"
    }
  ],
  "reasoning": "Overall explanation of changes made",
  "confidence": 90
}
\`\`\`

IMPORTANT: 
- Return ONLY the JSON response, no additional text
- Include the complete fixed code in the "fixedCode" field
- Be specific about what each fix addresses
- Rate confidence from 0-100 based on how certain you are the fix is correct`;
  }

  /**
   * Parse AI response and extract fixing information
   */
  private parseAIResponse(aiResponse: string, request: AIFixRequest): AIFixResponse {
    try {
      // Extract JSON from response (handle cases where AI adds extra text)
      const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : aiResponse;
      
      const parsed = JSON.parse(jsonString);
      
      // Validate response structure
      if (!parsed.fixedCode) {
        throw new Error('AI response missing fixedCode');
      }

      // Map applied fixes to include error IDs
      const appliedFixes = (parsed.appliedFixes || []).map((fix: any) => ({
        errorId: fix.errorId || 'unknown',
        fix: fix.fix || 'Unknown fix',
        confidence: fix.confidence || 50,
        reasoning: fix.reasoning || 'No reasoning provided'
      }));

      // Determine which errors were fixed
      const fixedErrorIds = new Set(appliedFixes.map((f: any) => f.errorId));
      const unfixedErrors = request.errors.filter(error => 
        !fixedErrorIds.has(error.id) && !fixedErrorIds.has(error.type)
      );

      return {
        success: parsed.success || true,
        fixedCode: parsed.fixedCode,
        appliedFixes,
        unfixedErrors,
        reasoning: parsed.reasoning || 'Code has been fixed by AI',
        confidence: Math.min(100, Math.max(0, parsed.confidence || 70))
      };

    } catch (error) {
      console.error('Failed to parse AI response:', error);
      
      // Fallback: try to extract code block if JSON parsing fails
      const codeMatch = aiResponse.match(/```python\s*([\s\S]*?)\s*```/);
      const extractedCode = codeMatch ? codeMatch[1] : request.code;
      
      return {
        success: false,
        fixedCode: extractedCode,
        appliedFixes: [],
        unfixedErrors: request.errors,
        reasoning: `Failed to parse AI response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 20
      };
    }
  }

  /**
   * Make API call to OpenRouter
   */
  private async callOpenRouter(request: OpenRouterRequest): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://localhost',
        'X-Title': 'Agent Flow Builder - Code Verification'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`OpenRouter API error: ${result.error.message}`);
    }

    return result;
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const testRequest: OpenRouterRequest = {
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: 'Hello, please respond with "OK" to test the connection.'
          }
        ],
        max_tokens: 10
      };

      const response = await this.callOpenRouter(testRequest);
      
      return {
        success: response.choices?.[0]?.message?.content?.includes('OK') || false
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data?.map((model: any) => model.id) || [];
    } catch (error) {
      console.error('Failed to get available models:', error);
      return [this.defaultModel]; // Return default model as fallback
    }
  }

  /**
   * Estimate token usage for a request
   */
  estimateTokens(request: AIFixRequest): { promptTokens: number; maxResponseTokens: number } {
    const prompt = this.buildFixingPrompt(request);
    
    // Rough estimation: ~4 characters per token
    const promptTokens = Math.ceil(prompt.length / 4);
    const maxResponseTokens = 4000; // Our default max_tokens setting
    
    return { promptTokens, maxResponseTokens };
  }

  /**
   * Set new API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
  }

  /**
   * Set model
   */
  setModel(model: string): void {
    this.defaultModel = model;
  }
}