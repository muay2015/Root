import { isEnglishSubject, normalizeEnglishPlainText } from './core.js';
const EMOTION_TYPE = '\uc2ec\uacbd/\ubd84\uc704\uae30';
const EMOTION_WORD = '\uc2ec\uacbd';
const CHANGE_WORD = '\ubcc0\ud654';
const ATMOSPHERE_WORD = '\ubd84\uc704\uae30';
const EMOTION_STEM_PREFIX = '\ub2e4\uc74c \uae00\uc5d0 \ub4dc\ub7ec\ub09c ';
const EMOTION_STEM_SUFFIX = '\uc758 \uc2ec\uacbd \ubcc0\ud654\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc740?';
const ATMOSPHERE_STEM = '\ub2e4\uc74c \uae00\uc758 \uc804\uccb4\uc801\uc778 \ubd84\uc704\uae30\ub85c \uac00\uc7a5 \uc801\uc808\ud55c \uac83\uc740?';
const NAME_STOPWORDS = new Set([
    'The', 'When', 'While', 'After', 'Before', 'Because', 'If', 'As', 'Although', 'But', 'And',
    'In', 'On', 'At', 'For', 'To', 'From', 'By', 'With', 'Without', 'During', 'Then', 'There',
    'It', 'He', 'She', 'They', 'We', 'I', 'You', 'This', 'That', 'These', 'Those',
]);
const KOREAN_CHOICE_DICTIONARY = [
    [/\uae34\uc7a5(?:\ud558\ub2e4|\ud55c)?/gu, 'tense'],
    [/\ubd88\uc548(?:\ud558\ub2e4|\ud55c)?/gu, 'anxious'],
    [/\ucd08\uc870(?:\ud558\ub2e4|\ud55c)?/gu, 'nervous'],
    [/\ub2f9\ud669(?:\ud558\ub2e4|\ud55c)?/gu, 'embarrassed'],
    [/\uc548\ub3c4(?:\ud558\ub2e4|\ud55c)?/gu, 'relieved'],
    [/\uac10\uc0ac(?:\ud558\ub2e4|\ud55c)?/gu, 'grateful'],
    [/\uae30\uc068|\uae30\uc05c|\ud589\ubcf5(?:\ud55c)?/gu, 'happy'],
    [/\uc2ac\ud514|\uc2ac\ud508/gu, 'sad'],
    [/\uc6b0\uc6b8(?:\ud55c)?|\uc74c\uc0b0(?:\ud55c)?/gu, 'gloomy'],
    [/\ud76c\ub9dd(?:\ucc2c)?/gu, 'hopeful'],
    [/\ud765\ubd84|\uc2e0\ub09c|\uae30\ubfd0(?:\ucc2c)?/gu, 'excited'],
    [/\uac71\uc815(?:\ud558\ub2e4|\ud55c)?/gu, 'worried'],
    [/\uc88c\uc808(?:\ud558\ub2e4|\ud55c)?/gu, 'frustrated'],
    [/\uc790\ub791\uc2a4\ub7fd(?:\ub2e4|\uc740)?|\ubfcc\ub4ef(?:\ud558\ub2e4|\ud55c)?/gu, 'proud'],
    [/\ubd80\ub044\ub7fd(?:\ub2e4|\uc740)?|\uc218\uce58\uc2a4\ub7fd(?:\ub2e4|\uc740)?/gu, 'ashamed'],
    [/\uc678\ub86d(?:\ub2e4|\uc740)?/gu, 'lonely'],
    [/\ub450\ub835(?:\ub2e4|\uc740)?|\ubb34\uc11c\uc6b4?/gu, 'afraid'],
    [/\ub180\ub780?|\uacbd\uc545/gu, 'surprised'],
    [/\ud654\ub09c|\ubd84\ub178(?:\ud55c)?/gu, 'angry'],
    [/\ucc28\ubd84(?:\ud55c)?/gu, 'calm'],
    [/\ud3c9\ud654\ub85c\uc6b4/gu, 'peaceful'],
    [/\ub530\ub73b(?:\ud55c)?/gu, 'warm'],
    [/\ubc1d(?:\uc740)?/gu, 'bright'],
    [/\uba85\ub791(?:\ud55c)?/gu, 'cheerful'],
    [/\uc5b4\ub450(?:\uc6b4)?/gu, 'dark'],
    [/\uc2e0\ube44\ub85c\uc6b4/gu, 'mysterious'],
    [/\uace0\uc694(?:\ud55c)?|\uc870\uc6a9(?:\ud55c)?/gu, 'quiet'],
    [/\uc544\ub291(?:\ud55c)?/gu, 'cozy'],
    [/\uc720\ucf8c(?:\ud55c)?/gu, 'pleasant'],
];
const EMOTION_PAIR_FALLBACKS = [
    [/^anxious$/i, 'anxious / relieved'],
    [/^nervous$/i, 'nervous / relieved'],
    [/^tense$/i, 'tense / relieved'],
    [/^worried$/i, 'worried / reassured'],
    [/^afraid$/i, 'afraid / relieved'],
    [/^sad$/i, 'sad / hopeful'],
    [/^gloomy$/i, 'gloomy / hopeful'],
    [/^lonely$/i, 'lonely / comforted'],
    [/^frustrated$/i, 'frustrated / determined'],
    [/^angry$/i, 'angry / calm'],
    [/^embarrassed$/i, 'embarrassed / relieved'],
    [/^surprised$/i, 'surprised / delighted'],
    [/^happy$/i, 'happy / grateful'],
    [/^excited$/i, 'excited / proud'],
    [/^hopeful$/i, 'hopeful / confident'],
    [/^calm$/i, 'calm / confident'],
    [/^proud$/i, 'proud / grateful'],
    [/^grateful$/i, 'grateful / relieved'],
];
function hasKorean(text) {
    return /[\u3131-\u314e\uac00-\ud7a3]/u.test(text);
}
function normalizeWhitespace(text) {
    return normalizeEnglishPlainText(text)
        .replace(/\r\n/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}
function isInstructionLine(line) {
    return (line.includes(EMOTION_WORD) ||
        line.includes(ATMOSPHERE_WORD) ||
        /most appropriate/i.test(line) ||
        /overall atmosphere/i.test(line) ||
        /emotion(?:al)? change/i.test(line));
}
function splitStemParts(stem) {
    const lines = normalizeWhitespace(stem)
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    return {
        passage: lines.filter((line) => !isInstructionLine(line)).join('\n').trim(),
        instruction: lines.filter((line) => isInstructionLine(line)).join(' ').trim(),
    };
}
function extractLikelyName(text) {
    const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) ?? [];
    return matches.find((name) => !NAME_STOPWORDS.has(name)) ?? null;
}
function inferEmotionKind(stem, instruction, passage) {
    const combined = `${stem}\n${instruction}\n${passage}`;
    if (combined.includes(ATMOSPHERE_WORD) || /overall atmosphere|atmosphere/i.test(combined)) {
        return 'atmosphere';
    }
    if (combined.includes(EMOTION_WORD) ||
        combined.includes(CHANGE_WORD) ||
        /emotion(?:al)? change/i.test(combined)) {
        return 'emotion';
    }
    return extractLikelyName(passage || stem) ? 'emotion' : 'atmosphere';
}
function buildCanonicalStem(kind, passage, fallbackStem) {
    if (kind === 'emotion') {
        const name = extractLikelyName(passage || fallbackStem) ?? 'Narrator';
        const prompt = `${EMOTION_STEM_PREFIX}${name}${EMOTION_STEM_SUFFIX}`;
        return passage ? `${prompt}\n\n${passage}` : prompt;
    }
    return passage ? `${ATMOSPHERE_STEM}\n\n${passage}` : ATMOSPHERE_STEM;
}
function translateKoreanChoiceToEnglish(choice) {
    let translated = normalizeWhitespace(choice);
    for (const [pattern, replacement] of KOREAN_CHOICE_DICTIONARY) {
        translated = translated.replace(pattern, replacement);
    }
    translated = translated
        .replace(/[,\u00b7]/g, ' / ')
        .replace(/\s+and\s+/gi, ' / ')
        .replace(/\s*->\s*/g, ' -> ')
        .replace(/\s+/g, ' ')
        .trim();
    return hasKorean(translated) ? choice : translated;
}
function normalizeEmotionPairChoice(choice) {
    const translated = translateKoreanChoiceToEnglish(choice)
        .replace(/\s*->\s*/g, ' / ')
        .replace(/\s+(?:and|&)\s+/gi, ' / ')
        .replace(/\s*,\s*/g, ' / ')
        .replace(/\s*\/\s*/g, ' / ')
        .trim();
    if (!translated.includes('/')) {
        for (const [pattern, replacement] of EMOTION_PAIR_FALLBACKS) {
            if (pattern.test(translated)) {
                return replacement;
            }
        }
    }
    return translated;
}
function normalizeAtmosphereChoice(choice) {
    const translated = translateKoreanChoiceToEnglish(choice);
    return translated.split(/\s*\/\s*/)[0].trim();
}
export function normalizeEmotionChangeChoices(choices) {
    const normalized = choices
        .map((choice) => normalizeWhitespace(choice))
        .filter(Boolean);
    if (normalized.length === 10 && normalized.every((choice) => !choice.includes('/'))) {
        const repaired = [];
        for (let index = 0; index < normalized.length; index += 2) {
            repaired.push(normalizeEmotionPairChoice(`${normalized[index]} / ${normalized[index + 1]}`));
        }
        return repaired;
    }
    return normalized.map((choice) => normalizeEmotionPairChoice(choice));
}
export function normalizeEmotionChangeAnswer(answer) {
    if (typeof answer !== 'string') {
        return answer;
    }
    return normalizeEmotionPairChoice(answer);
}
export function isEnglishEmotionAtmosphereType(params) {
    return (isEnglishSubject(params.subject) &&
        String(params.questionType ?? '').includes(EMOTION_TYPE));
}
export function standardizeEnglishEmotionAtmosphere(params) {
    const normalizedStem = normalizeWhitespace(params.stem);
    const stemParts = splitStemParts(normalizedStem);
    const passage = stemParts.passage || normalizeWhitespace(params.materialText ?? '');
    const kind = inferEmotionKind(normalizedStem, stemParts.instruction, passage);
    return {
        stem: buildCanonicalStem(kind, passage, normalizedStem),
        choices: (params.choices ?? []).map((choice) => kind === 'emotion'
            ? normalizeEmotionPairChoice(choice)
            : normalizeAtmosphereChoice(choice)),
    };
}
