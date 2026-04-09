import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function listAllModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    const data = await response.json();
    
    console.log('--- Full Model List ---');
    if (data.models) {
      data.models.forEach(m => {
        console.log(`- ${m.name}`);
        console.log(`  Methods: ${m.supportedGenerationMethods.join(', ')}`);
      });
    } else {
      console.log('No models found:', JSON.stringify(data, null, 2));
    }
  } catch (err) {
    console.error('Error listing models:', err);
  }
}

listAllModels();
