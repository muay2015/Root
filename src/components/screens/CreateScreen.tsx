import React, { type ChangeEvent } from 'react';
import { SUBJECT_CONFIG, getSubjectSelectionDefaults, getSubjectSelectionLabel, usesNoSelector, getSubjectQuestionTypes, getSubjectFormats, type SelectionFormat, type SubjectKey } from '../../lib/question/subjectConfig';
import type { BuilderMode, DifficultyLevel, SchoolLevel, MathGrade } from '../../lib/examTypes';
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
  mathGrade: MathGrade;
  setMathGrade: (value: MathGrade) => void;
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
}

export function CreateScreen(props: CreateScreenProps) {
  const {
    mode, setMode, subject, onSelectSubject, questionType, setQuestionType,
    format, setFormat, difficulty, setDifficulty, schoolLevel, setSchoolLevel,
    mathGrade, setMathGrade,
    count, setCount, generationTopic, setGenerationTopic, materialText, setMaterialText,
    parsedFiles, setParsedFiles, questionFiles, answerFiles, setQuestionFiles, setAnswerFiles,
    ready, isGenerating, generationError, onGenerate,
    imageData, setImageData,
    ocrPages, setOcrPages,
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
    : '주제 또는 핵심 단원명을 입력해 주세요.';

  const handleSelectSubject = (key: SubjectKey) => {
    onSelectSubject(key);
    const defaults = getSubjectSelectionDefaults(key);
    setQuestionType(defaults.questionType);
    setFormat(defaults.format);
  };

  const removeFile = (name: string) => {
    setParsedFiles(prev => prev.filter(f => f !== name));
    setMaterialText(prev => {
      const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`\\s*\\[자료: ${escapedName}\\][\\s\\S]*?(?=(\\n\\[자료:|$))`, 'g');
      return prev.replace(pattern, '').trim();
    });
  };

  const handleAIDataUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsParsing(true);
        setParsingProgress('업로드를 준비 중입니다...');
        setSuccessFile(null);
        setParseError(null);
        setShowSuccess(false);
        
        const content = await parseFileToText(file, (msg) => setParsingProgress(msg));
        
        setMaterialText(prev => {
           const separator = prev ? '\n\n' : '';
           return `${prev}${separator}[자료: ${file.name}]\n${content}`;
        });
        
        setParsedFiles(prev => Array.from(new Set([...prev, file.name])));
        setSuccessFile(file.name);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
      } catch (error) {
        setParseError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      } finally {
        setIsParsing(false);
        setParsingProgress('');
      }
    }
  };

  return (
    <main className="min-h-screen bg-surface px-4 pb-28 pt-8 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tight text-slate-900">지능형 문제 생성</h1>
          <p className="text-sm font-medium text-slate-500">학습 목표에 최적화된 평가 환경을 구성합니다. 모든 문항은 정밀 파싱 로직을 거칩니다.</p>
        </header>

        <ModeSelector mode={mode} setMode={setMode} />
        <GradeSelector 
          mode={mode} 
          value={schoolLevel} 
          onChange={setSchoolLevel} 
          mathGrade={mathGrade}
          onMathGradeChange={setMathGrade}
        />
        <SubjectSelector mode={mode} schoolLevel={schoolLevel} subject={subject} onSelectSubject={handleSelectSubject} />
        
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
          mathGrade={mathGrade}
          generationTopic={generationTopic}
          setGenerationTopic={setGenerationTopic}
        />

        <AIDetailsInput 
          mode={mode}
          subject={subject}
          questionType={questionType}
          mathGrade={mathGrade}
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
        />
      </div>
    </main>
  );
}
