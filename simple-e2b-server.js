import express from 'express';
import { Sandbox } from '@e2b/code-interpreter';

const app = express();
const PORT = 3002; // Use different port

app.use(express.json({ limit: '50mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'Simple E2B Test Server', port: PORT });
});

app.post('/api/test', async (req, res) => {
  console.log('🧪 Starting simple E2B test...');
  let sbx;
  
  try {
    const { files } = req.body;
    
    if (!process.env.E2B_API_KEY) {
      return res.status(500).json({ error: 'E2B_API_KEY not set' });
    }

    console.log('📦 Creating E2B sandbox...');
    sbx = await Sandbox.create({ 
      apiKey: process.env.E2B_API_KEY,
      timeout: 60000, // 1 minute timeout
    });
    console.log('✅ Sandbox created successfully');

    // Write files
    console.log('📝 Writing files...');
    for (const [filename, content] of Object.entries(files)) {
      await sbx.files.write(filename, content);
      console.log(`✅ Created ${filename}`);
    }

    // Execute Python
    console.log('🐍 Running Python...');
    const result = await sbx.commands.run('python test.py');
    console.log('✅ Python execution completed');
    console.log('Output:', result.stdout);
    console.log('Error:', result.stderr);
    console.log('Exit code:', result.exitCode);

    // Clean up
    await sbx.kill();
    console.log('🧹 Sandbox closed');

    res.json({
      success: true,
      output: result.stdout,
      error: result.stderr,
      exitCode: result.exitCode
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    if (sbx) {
      try {
        await sbx.kill();
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
    
    res.status(500).json({
      error: error.message,
      details: error.toString()
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Simple E2B test server running on http://localhost:${PORT}`);
});

export default app; 