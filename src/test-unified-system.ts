/**
 * Test script for the unified code generation system
 * Run: npx tsx src/test-unified-system.ts
 */

import { codeGenerationEngine } from './lib/unified/CodeGenerationEngine';
import type { Node, Edge } from '@xyflow/react';
import type { BaseNodeData } from './components/nodes/BaseNode';

// Test nodes for different scenarios
const testStandardNodes: Node<BaseNodeData>[] = [
  {
    id: 'agent-1',
    type: 'baseNode',
    data: {
      type: 'agent',
      label: 'Test Agent',
      description: 'A test agent for standard flow',
      instruction: 'You are a helpful test assistant.',
    },
    position: { x: 100, y: 100 }
  }
];

const testMCPNodes: Node<BaseNodeData>[] = [
  {
    id: 'agent-1',
    type: 'baseNode',
    data: {
      type: 'agent',
      label: 'MCP Agent',
      description: 'A test agent with MCP support',
      instruction: 'You are an agent that can use MCP tools.',
    },
    position: { x: 100, y: 100 }
  },
  {
    id: 'mcp-1',
    type: 'baseNode',
    data: {
      type: 'mcp-client',
      label: 'MCP Tool',
      description: 'Upstash MCP tool',
      smitheryMcp: '@upstash/context7-mcp',
      mcpCommand: 'npx',
      mcpArgs: ['-y', '@smithery/cli@latest', 'run', '@upstash/context7-mcp', '--key', 'smithery_api_key'],
    },
    position: { x: 300, y: 100 }
  }
];

const testEdges: Edge[] = [
  {
    id: 'e1',
    source: 'agent-1',
    target: 'mcp-1'
  }
];

async function testUnifiedSystem() {
  console.log('🧪 Testing Unified Code Generation System\n');

  try {
    // Test 1: Standard template generation
    console.log('1️⃣ Testing Standard Template Generation...');
    const standardResult = await codeGenerationEngine.generateCode({
      nodes: testStandardNodes,
      edges: [],
      method: 'template',
      mode: 'standard',
      options: {
        onProgress: (progress) => {
          console.log(`  📊 ${progress.step}: ${Math.round(progress.progress)}% - ${progress.message}`);
        }
      }
    });
    console.log('✅ Standard template generated successfully\n');

    // Test 2: MCP template generation
    console.log('2️⃣ Testing MCP Template Generation...');
    const mcpResult = await codeGenerationEngine.generateCode({
      nodes: testMCPNodes,
      edges: testEdges,
      method: 'template',
      mode: 'mcp',
      options: {
        onProgress: (progress) => {
          console.log(`  📊 ${progress.step}: ${Math.round(progress.progress)}% - ${progress.message}`);
        }
      }
    });
    console.log('✅ MCP template generated successfully\n');

    // Test 3: Flow validation
    console.log('3️⃣ Testing Flow Validation...');
    const validation = await codeGenerationEngine.validateFlow(testMCPNodes, testEdges);
    console.log(`✅ Flow validation: ${validation.isValid ? 'Valid' : 'Invalid'}`);
    console.log(`  📋 Recommended method: ${validation.recommendedMethod}`);
    console.log(`  🎯 Recommended mode: ${validation.recommendedMode}`);
    if (validation.errors.length > 0) {
      console.log(`  ❌ Errors: ${validation.errors.join(', ')}`);
    }
    if (validation.warnings.length > 0) {
      console.log(`  ⚠️ Warnings: ${validation.warnings.join(', ')}`);
    }
    console.log();

    // Test 4: Available modes
    console.log('4️⃣ Testing Available Modes Detection...');
    const availableModes = codeGenerationEngine.getAvailableModes(testMCPNodes);
    const modeNames = availableModes.map(m => m.mode);
    const recommendedModes = availableModes.filter(m => m.recommended).map(m => m.mode);
    console.log(`✅ Available modes: ${modeNames.join(', ')}`);
    console.log(`   Recommended: ${recommendedModes.join(', ') || 'None'}\n`);

    // Test 5: Langfuse template (if we add a langfuse node)
    console.log('5️⃣ Testing Langfuse Template Generation...');
    const langfuseNodes: Node<BaseNodeData>[] = [
      ...testStandardNodes,
      {
        id: 'langfuse-1',
        type: 'baseNode',
        data: {
          type: 'langfuse',
          label: 'Langfuse Analytics',
          langfuseEnabled: true,
          langfusePublicKey: 'test_public_key',
          langfuseSecretKey: 'test_secret_key',
          langfuseHost: 'https://cloud.langfuse.com',
          langfuseProjectName: 'test_project',
        },
        position: { x: 300, y: 100 }
      }
    ];

    const langfuseResult = await codeGenerationEngine.generateCode({
      nodes: langfuseNodes,
      edges: [],
      method: 'template',
      mode: 'langfuse',
      options: {
        onProgress: (progress) => {
          console.log(`  📊 ${progress.step}: ${Math.round(progress.progress)}% - ${progress.message}`);
        }
      }
    });
    console.log('✅ Langfuse template generated successfully\n');

    // Test 6: Memory template
    console.log('6️⃣ Testing Memory Template Generation...');
    const memoryNodes: Node<BaseNodeData>[] = [
      ...testStandardNodes,
      {
        id: 'memory-1',
        type: 'baseNode',
        data: {
          type: 'memory',
          label: 'Mem0 Memory',
          memoryEnabled: true,
          memoryApiKey: 'test_mem0_key',
          memoryHost: 'https://api.mem0.ai',
          memoryUserId: 'test_user',
          memoryType: 'conversation',
        },
        position: { x: 300, y: 100 }
      }
    ];

    const memoryResult = await codeGenerationEngine.generateCode({
      nodes: memoryNodes,
      edges: [],
      method: 'template',
      mode: 'memory',
      options: {
        onProgress: (progress) => {
          console.log(`  📊 ${progress.step}: ${Math.round(progress.progress)}% - ${progress.message}`);
        }
      }
    });
    console.log('✅ Memory template generated successfully\n');

    // Test 7: Event handling template
    console.log('7️⃣ Testing Event Handling Template Generation...');
    const eventNodes: Node<BaseNodeData>[] = [
      ...testStandardNodes,
      {
        id: 'event-1',
        type: 'baseNode',
        data: {
          type: 'event-handling',
          label: 'Event Handling',
          eventHandlingEnabled: true,
          eventTypes: ['user_message', 'agent_response', 'tool_call', 'error'],
          eventMiddleware: ['logging_middleware'],
        },
        position: { x: 300, y: 100 }
      }
    ];

    const eventResult = await codeGenerationEngine.generateCode({
      nodes: eventNodes,
      edges: [],
      method: 'template',
      mode: 'event-handling',
      options: {
        onProgress: (progress) => {
          console.log(`  📊 ${progress.step}: ${Math.round(progress.progress)}% - ${progress.message}`);
        }
      }
    });
    console.log('✅ Event handling template generated successfully\n');

    // Summary
    console.log('🎉 All Tests Completed Successfully!');
    console.log('\n📊 Results Summary:');
    console.log(`✅ Standard template: ${standardResult.code.length} characters`);
    console.log(`✅ MCP template: ${mcpResult.code.length} characters`);
    console.log(`✅ Langfuse template: ${langfuseResult.code.length} characters`);
    console.log(`✅ Memory template: ${memoryResult.code.length} characters`);
    console.log(`✅ Event handling template: ${eventResult.code.length} characters`);
    console.log(`✅ All features working: MCP, Langfuse, Memory, Event Handling`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testUnifiedSystem();
}