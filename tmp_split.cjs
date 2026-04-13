const fs = require('fs');
const lines = fs.readFileSync('src/lib/question/promptBuilder.ts', 'utf8').split('\n');
const imports = `import { type PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock, isMaterialMeta } from './core.ts';
import { getGenerationRules, type DifficultyLevel, type SchoolLevel } from '../generationRules.ts';
import { type SubjectKey } from '../subjectConfig.ts';

`;
let output = imports;
output += lines.slice(254, 641).join('\n') + '\n';
output += lines.slice(902, 979).join('\n') + '\n';
output = output.replace(/^function /gm, 'export function ');
fs.writeFileSync('src/lib/question/prompts/english.ts', output, 'utf8');
console.log('Done extracting english.ts');
