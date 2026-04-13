const fs = require('fs');
let english = fs.readFileSync('src/lib/question/prompts/english.ts', 'utf8');

// remove buildQuestionPrompt from english.ts as it will stay in promptBuilder.ts
if (english.includes('export function buildQuestionPrompt')) {
  english = english.split('export function buildQuestionPrompt')[0];
  fs.writeFileSync('src/lib/question/prompts/english.ts', english, 'utf8');
}

const lines = fs.readFileSync('src/lib/question/promptBuilder.ts', 'utf8').split('\n');
const prefix = `import { getGenerationRules, type DifficultyLevel, type SchoolLevel } from './generationRules';
import { getSubjectQuestionTypeMixTargets, usesNoSelector, type SubjectKey } from './subjectConfig';
import { PromptBuildInput, buildFeedbackBlock, buildSourceMaterialBlock, isMaterialMeta, sanitizeMaterialText } from './prompts/core';
import { buildCsatKoreanLiteratureSetPrompt, buildCsatKoreanLiteratureRules, buildKoreanPassageRules } from './prompts/korean';
import { buildSciencePromptRules, isScienceSubject } from './prompts/science';
import { isSocialSubject } from './prompts/social';
import { 
  buildEnglishInsertionStrictPrompt, 
  buildEnglishIrrelevantStrictPrompt, buildEnglishOrderStrictArrayPrompt, 
  buildEnglishOrderStrictPrompt, buildEnglishSummaryStrictPrompt,
  isEnglishQuestionType, isEnglishQuestionTypeSafe, isEnglishSubject,
  buildBlankPrompt, buildEnglishOutputFormatRules, buildEnglishTypePromptRules,
  buildGrammarPrompt, buildInsertionPrompt, buildMoodPrompt, buildOddSentencePrompt, buildOrderPrompt, buildSummaryCompletionPromptRules
} from './prompts/english';

`;

let output = prefix;
// Retain lines 641-901 (buildGenericPrompt, buildHistoryPrompt, buildSummaryPrompt, buildCsatPrompt)
output += lines.slice(641, 902).join('\n') + '\n';
// Retain line 979 to the end (buildQuestionPrompt)
output += lines.slice(979).join('\n') + '\n';
fs.writeFileSync('src/lib/question/promptBuilder.ts', output, 'utf8');
console.log('Done refactoring');
