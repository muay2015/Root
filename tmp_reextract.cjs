const fs = require('fs');

const content = fs.readFileSync('src/lib/question/promptBuilder.ts.bak', 'utf8');
const lines = content.split('\n');

const imports = `import { type PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock, isMaterialMeta } from './core';
import { getGenerationRules, type DifficultyLevel, type SchoolLevel } from '../generationRules';
import { type SubjectKey } from '../subjectConfig';

`;

// Extraction logic based on the previous turn's successful line indices
// previous script used slice(254, 641) and slice(902, 979)
let output = imports;
output += lines.slice(254, 641).join('\n') + '\n';
output += lines.slice(902, 979).join('\n') + '\n';

// Replace "function " with "export function " at the start of lines
output = output.replace(/^function /gm, 'export function ');

fs.writeFileSync('src/lib/question/prompts/english.ts', output, 'utf8');
console.log('Successfully extracted english.ts from backup');
