import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateExamApiResponse } from '../src/lib/server/generateExamApi.ts';
import { segmentExamWithOpenAI } from '../src/lib/server/openaiVisionService.ts';

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

function sanitizeEnvStyleValue(value?: string) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/^['"]+|['"]+$/g, '').trim();
}

const app = express();
const port = Number(process.env.PORT || 8787);
const openAiApiKey = sanitizeEnvStyleValue(process.env.OPENAI_API_KEY);
const openAiModel = sanitizeEnvStyleValue(process.env.OPENAI_MODEL) || 'gpt-4o';
const hasOpenAiKey = openAiApiKey.length > 0;

if (hasOpenAiKey) {
  console.log('✅ OpenAI API Key loaded successfully.');
} else {
  console.warn('⚠️ OpenAI API Key is missing!');
}
console.log('---------------------------');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    provider: hasOpenAiKey ? 'openai' : 'mock',
    model: openAiModel,
    openaiKeyLoaded: hasOpenAiKey,
  });
});

app.post('/api/ai/generate-exam', async (req, res) => {
  console.log('--- Incoming Request: /api/ai/generate-exam ---');
  try {
    const result = await generateExamApiResponse({
      payload: req.body,
      openAiApiKey,
      openAiModel,
    });
    console.log('API Result Status:', result.status);
    res.status(result.status).json(result.body);
  } catch (err: any) {
    console.error('SERVER FATAL ERROR:', err);
    res.status(500).json({ 
      error: 'Server internal error', 
      details: err.message,
      stack: err.stack
    });
  }
});



app.post('/api/ai/segment-exam', async (req, res) => {
  console.log('--- Incoming Request: /api/ai/segment-exam ---');
  try {
    const { image, subject } = req.body;
    if (!hasOpenAiKey) {
      return res.status(401).json({ error: 'OpenAI API 키가 설정되지 않았습니다.' });
    }
    if (!image?.data) {
      return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
    }

    const base64Data = image.data.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const questions = await segmentExamWithOpenAI({
      imageBuffer,
      mimeType: image.mimeType || 'image/png',
      apiKey: openAiApiKey,
      subject,
      model: openAiModel,
    });

    res.json({
      title: `${subject || '이미지'} 기출문제`,
      questions,
      questionCount: questions.length,
    });
  } catch (err: any) {
    console.error('SEGMENT EXAM ERROR (GPT-4o):', err);
    res.status(500).json({ error: 'GPT-4o segmentation failure', details: err.message });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Pool-go API server listening on http://0.0.0.0:${port} (also accessible via http://127.0.0.1:${port})`);
});
