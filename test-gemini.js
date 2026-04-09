import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is missing in .env.local');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  
  try {
    console.log('--- Listing Models ---');
    // Note: Node SDK might not have a direct listModels, but we can try common ones
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro-vision'];
    
    for (const modelName of models) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent('Hi');
        console.log(`✅ Model ${modelName} is available and supports generateContent`);
      } catch (err) {
        console.log(`❌ Model ${modelName} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('Fatal Error:', err);
  }
}

test();
