import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateExamApiResponse,
} from '../src/lib/server/generateExamApi.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = process.cwd();
const envLocalPath = path.resolve(projectRoot, '.env.local');
const envPath = path.resolve(projectRoot, '.env');

console.log('--- Server Config Debug ---');
console.log('Project Root:', projectRoot);
console.log('Checking .env.local at:', envLocalPath);

dotenv.config({ path: envPath });
dotenv.config({ path: envLocalPath, override: true });

const app = express();
const port = Number(process.env.PORT || 8787);
const openAiApiKey = process.env.OPENAI_API_KEY?.trim() || '';
const openAiModel = process.env.OPENAI_MODEL?.trim() || 'gpt-5.4-mini';
const hasOpenAiKey = openAiApiKey.length > 0;

if (hasOpenAiKey) {
  console.log('✅ OpenAI API Key loaded successfully.');
} else {
  console.warn('⚠️ OpenAI API Key is missing! Check your .env.local file.');
}
console.log('---------------------------');

app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    provider: hasOpenAiKey ? 'openai' : 'mock',
    model: openAiModel,
    keyLoaded: hasOpenAiKey,
  });
});

app.post('/api/ai/generate-exam', async (req, res) => {
  const result = await generateExamApiResponse({
    payload: req.body,
    openAiApiKey,
    openAiModel,
  });

  res.status(result.status).json(result.body);
});

app.listen(port, '0.0.0.0', () => {
  console.log(`ROOT API server listening on http://0.0.0.0:${port}`);
});
