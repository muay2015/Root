import React, { type ChangeEvent } from 'react';
import { SUBJECT_CONFIG, getSubjectSelectionDefaults, getSubjectSelectionLabel, usesNoSelector, getSubjectQuestionTypes, getSubjectFormats, type SelectionFormat, type SubjectKey } from '../../lib/question/subjectConfig';
import type { BuilderMode, DifficultyLevel, SchoolLevel, DetailedGrade } from '../../lib/examTypes';
import { CURRICULUM_MAP } from '../../lib/question/curriculumConfig';
import { UploadPanel } from '../ui/UploadPanel';
import { parseFileToText } from '../../lib/fileParser';

// Refactored Sub-components
import { ModeSelector } from '../create/ModeSelector';
import { GradeSelector } from '../create/GradeSelector';
import { SubjectSelector } from '../create/SubjectSelector';
import { GenerationSettings } from '../create/GenerationSettings';
import { AIDetailsInput } from '../create/AIDetailsInput';
import { GenerationExecution } from '../create/GenerationExecution';

export interface CreateScreenProps {
  mode: BuilderMode;
  setMode: (value: BuilderMode) => void;
  subject: SubjectKey;
  onSelectSubject: (value: SubjectKey) => void;
  questionType: string;
  setQuestionType: (value: string) => void;
  format: SelectionFormat;
  setFormat: (value: SelectionFormat) => void;
  difficulty: DifficultyLevel;
  setDifficulty: (value: DifficultyLevel) => void;
  schoolLevel: SchoolLevel;
  setSchoolLevel: (value: SchoolLevel) => void;
  detailedGrade: DetailedGrade;
  setDetailedGrade: (value: DetailedGrade) => void;
  count: number;
  setCount: (value: number) => void;
  generationTopic: string;
  setGenerationTopic: (value: string) => void;
  materialText: string;
  setMaterialText: React.Dispatch<React.SetStateAction<string>>;
  parsedFiles: string[];
  setParsedFiles: React.Dispatch<React.SetStateAction<string[]>>;
  questionFiles: string[];
  answerFiles: string[];
  setQuestionFiles: (value: string[]) => void;
  setAnswerFiles: (value: string[]) => void;
  ready: boolean;
  isGenerating: boolean;
  generationError: string | null;
  onGenerate: () => void;
  imageData: { mimeType: string; data: string }[];
  setImageData: React.Dispatch<React.SetStateAction<{ mimeType: string; data: string }[]>>;
  ocrPages: { id: string; text: string }[];
  setOcrPages: React.Dispatch<React.SetStateAction<{ id: string; text: string }[]>>;
  isAnonymous: boolean;
}

export function CreateScreen(props: CreateScreenProps) {
  const {
    mode, setMode, subject, onSelectSubject, questionType, setQuestionType,
    format, setFormat, difficulty, setDifficulty, schoolLevel, setSchoolLevel,
    detailedGrade, setDetailedGrade,
    count, setCount, generationTopic, setGenerationTopic, materialText, setMaterialText,
    parsedFiles, setParsedFiles, questionFiles, answerFiles, setQuestionFiles, setAnswerFiles,
    ready, isGenerating, generationError, onGenerate,
    imageData, setImageData,
    ocrPages, setOcrPages,
    isAnonymous,
  } = props;

  const [isParsing, setIsParsing] = React.useState(false);
  const [parsingProgress, setParsingProgress] = React.useState('');
  const [showSuccess, setShowSuccess] = React.useState(false);
  const [successFile, setSuccessFile] = React.useState<string | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);

  const selectionLabel = getSubjectSelectionLabel(subject, questionType, format);
  const hideSelector = usesNoSelector(subject);
  const questionTypeOptions = getSubjectQuestionTypes(subject);
  const formatOptions = getSubjectFormats(subject);

  const readyHint = ready
    ? '설정이 완료되었습니다. 문제 생성을 시작할 수 있습니다.'
    : SUBJECT_CONFIG[subject].uploadRecommendation === 'REQUIRED'
      ? '학습할 지문 자료를 업로드하거나 텍스트를 입력해 주세요.'
      : '주제 또는 핵심 단원명을 입력해 주세요.';

  const handleSelectSubject = (key: SubjectKey) => {
    onSelectSubject(key);
    const defaults = getSubjectSelectionDefaults(key);
    setQuestionType(defaults.questionType);
    setFormat(defaults.format);
  };

  // 문제 유형 선택 시 단원/주제(학습 집중 영역)에 자동 주입 (UX 개선)
  React.useEffect(() => {
    const hasCurriculum = !!CURRICULUM_MAP[subject];
    // 커리큘럼이 있는 경우(예: 중등수학) 세부 영역이 아니라 세부 단원이 집중 영역에 들어가야 하므로 자동 주입 생략
    if (!hasCurriculum && questionType && questionType !== '전체') {
      setGenerationTopic(questionType);
    }
  }, [questionType, setGenerationTopic, subject]);

  const removeFile = (name: string) => {
    setParsedFiles(prev => prev.filter(f => f !== name));
    setMaterialText(prev => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\s*\\[자료: ${escapedName}\\][\\s\\S]*?(?=(\\n\\[자료:|$))`, 'g');
      return prev.replace(pattern, '').trim();
    });
  };

  const handleAIDataUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) as File[] : [];
    if (rawFiles.length === 0) return;

    try {
      setIsParsing(true);
      setParseError(null);
      setShowSuccess(false);
      
      let filesProcessed = 0;
      for (const file of rawFiles) {
        setParsingProgress(`자료 분석 중 (${filesProcessed + 1}/${rawFiles.length}): ${file.name}`);
        
        const content = await parseFileToText(file, (msg) => {
          setParsingProgress(`[${file.name}] ${msg}`);
        });
        
        setMaterialText(prev => {
           const separator = prev ? '\n\n' : '';
           return `${prev}${separator}[자료: ${file.name}]\n${content}`;
        });
        
        setParsedFiles(prev => Array.from(new Set([...prev, file.name])));
        filesProcessed++;
      }
      
      setSuccessFile(`${rawFiles.length}개의 자료 업로드 완료`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 4000);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsParsing(false);
      setParsingProgress('');
      e.target.value = ''; // 같은 파일 재선택 가능하도록 초기화
    }
  };

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">지능형 문제 생성</h1>
          <p className="text-sm font-medium text-slate-500">학습 목표에 맞춰 문제를 자동으로 구성합니다.</p>
        </header>

        <ModeSelector mode={mode} setMode={setMode} />
        <GradeSelector 
          mode={mode} 
          value={schoolLevel} 
          onChange={setSchoolLevel} 
          detailedGrade={detailedGrade}
          onDetailedGradeChange={setDetailedGrade}
        />
        <SubjectSelector mode={mode} schoolLevel={schoolLevel} detailedGrade={detailedGrade} subject={subject} onSelectSubject={handleSelectSubject} />
        
        <GenerationSettings 
          hideSelector={hideSelector}
          questionTypeOptions={questionTypeOptions}
          questionType={questionType}
          setQuestionType={setQuestionType}
          formatOptions={formatOptions}
          format={format}
          setFormat={setFormat}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          count={count}
          setCount={setCount}
          subject={subject}
          detailedGrade={detailedGrade}
          setDetailedGrade={setDetailedGrade}
          generationTopic={generationTopic}
          setGenerationTopic={setGenerationTopic}
          mode={mode}
          isAnonymous={isAnonymous}
        />

        <AIDetailsInput 
          mode={mode}
          subject={subject}
          questionType={questionType}
          detailedGrade={detailedGrade}
          generationTopic={generationTopic}
          setGenerationTopic={setGenerationTopic}
          materialText={materialText}
          setMaterialText={setMaterialText}
          parsedFiles={parsedFiles}
          removeFile={removeFile}
          isParsing={isParsing}
          parsingProgress={parsingProgress}
          parseError={parseError}
          onFileChange={handleAIDataUpload}
          showSuccess={showSuccess}
          successFile={successFile}
          imageData={imageData}
          setImageData={setImageData}
          ocrPages={ocrPages}
          setOcrPages={setOcrPages}
          isGenerating={isGenerating}
          generationError={generationError}
          onGenerate={onGenerate}
        />

        <GenerationExecution 
          ready={ready}
          isGenerating={isGenerating}
          generationError={generationError}
          subject={subject}
          selectionLabel={selectionLabel}
          schoolLevel={schoolLevel}
          difficulty={difficulty}
          count={count}
          readyHint={readyHint}
          onGenerate={onGenerate}
          mode={mode}
          imageCount={imageData.length}
        />
      </div>
    </main>
  );
}
