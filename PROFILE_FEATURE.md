# Smithery Profile Management Feature

## Overview

The Agent Flow Builder now includes comprehensive Smithery profile management functionality, allowing users to create, manage, and use custom profiles with their MCP servers. This feature provides persona-based control over agent behavior through the Smithery Configuration Profiles system.

## Features Added

### 1. Smithery API Integration (`src/lib/smitheryApi.ts`)
- **API Key Validation**: Test Smithery API keys before use
- **Profile CRUD Operations**: Create, read, update, delete profiles
- **Error Handling**: Comprehensive error handling for API calls
- **Profile Schemas**: Support for OpenAI, Anthropic, and Google schemas
- **Model Selection**: Pre-configured model options for each schema

### 2. Profile Management UI (`src/components/NaturalLanguageInput.tsx`)
- **API Key Input**: Secure API key input with validation indicators
- **Profile Creation Modal**: Full profile creation form with:
  - Profile name and description
  - Schema selection (OpenAI Chat, Anthropic Claude, Google Gemini)
  - Model selection based on schema
  - System prompt configuration
  - Temperature control (0.0 - 2.0)
- **Profile Selection**: Dropdown to select existing profiles
- **Profile List**: View and manage existing profiles
- **Profile Deletion**: Remove unwanted profiles

### 3. MCP Integration
- **Profile Arguments**: Automatically add `--profile <profile-id>` to MCP commands
- **Node Data**: Store profile ID in MCP node data
- **Code Generation**: Include profile parameters in generated agent code

## Usage

### Step 1: Set Up Smithery API Key
1. Get your API key from [smithery.ai/account/api-keys](https://smithery.ai/account/api-keys)
2. Enter the API key in the Smithery MCP configuration section
3. The system will validate the key and show a green indicator when valid

### Step 2: Create Profiles
1. Click "Manage Profiles" when the API key is valid
2. Click "New" to create a profile
3. Fill in the profile form:
   - **Name**: Descriptive name (e.g., "Friendly CS Agent")
   - **Description**: Brief description of the profile's purpose
   - **Schema**: Choose the appropriate AI provider schema
   - **Model**: Select from available models for the chosen schema
   - **System Prompt**: Define the agent's behavior and personality
   - **Temperature**: Control randomness (0.0 = deterministic, 2.0 = very creative)
4. Click "Create Profile"

### Step 3: Select Profile for MCP
1. Choose a profile from the "Select Profile" dropdown
2. The selected profile will be automatically included in MCP configuration
3. Generate your agent - the profile will be applied to all MCP calls

### Step 4: Manage Existing Profiles
- View all profiles in the profile list
- Delete unwanted profiles using the trash icon
- Create new profiles as needed

## Technical Implementation

### MCP Command Structure
When a profile is selected, the MCP command will include the profile parameter:

```bash
npx -y @smithery/cli@latest run @username/mcp-package --key <api-key> --profile <profile-id>
```

### Generated Code Example
```python
# MCP toolset configuration with profile
toolset = MCPToolset(
    connection_params=StdioServerParameters(
        command="npx",
        args=["-y", "@smithery/cli@latest", "run", "@username/mcp-package", "--key", "smithery_api_key", "--profile", "spatial-damselfly-XpTIrH"],
        env={"NODE_OPTIONS": "--no-warnings --experimental-fetch", "SMITHERY_API_KEY": "smithery_api_key"}
    )
)
```

### Profile Data Structure
```typescript
interface SmitheryProfile {
  id: string;
  name: string;
  description: string;
  schema_id: string;
  defaults: {
    model?: string;
    system_prompt?: string;
    temperature?: number;
    [key: string]: any;
  };
  created_at?: string;
  updated_at?: string;
}
```

## Benefits

1. **Persona Control**: Define different agent personalities and behaviors
2. **Model Flexibility**: Use different models for different use cases
3. **Prompt Management**: Centralize and reuse system prompts
4. **Parameter Tuning**: Fine-tune temperature and other parameters
5. **Multi-Purpose Agents**: Create specialized profiles for different tasks

## Security Considerations

- API keys are handled securely and not stored in plain text
- Profile data is stored on Smithery's secure cloud infrastructure
- Local components only store profile IDs, not sensitive configuration data
- API calls use proper authentication headers

## Error Handling

The system includes comprehensive error handling for:
- Invalid API keys
- Network connectivity issues
- Profile creation/deletion failures
- Missing required fields
- API rate limiting

## Future Enhancements

Potential future improvements could include:
- Profile sharing between users
- Profile templates for common use cases
- Bulk profile operations
- Profile versioning and history
- Advanced parameter configuration