import React, { useRef, useState } from 'react';
import { FileText, Upload, X, AlertCircle, Loader2, ChevronDown, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { SUBJECT_CONFIG, type SubjectKey } from '../../lib/question/subjectConfig';
import { compressImageToBase64 } from '../../lib/imageUtils';

// 기출/모의고사에 유의미한 과목만 필터링
const SCAN_SUBJECT_KEYS: SubjectKey[] = [
  'high_korean', 'high_math', 'high_english', 'high_korean_history',
  'korean_writing', 'korean_media', 'korean_literature', 'korean_reading',
  'math_1', 'math_2', 'math_calculus', 'math_stats', 'math_geometry',
  'high_social', 'high_science',
  'social_culture', 'living_ethics', 'korean_geography', 'world_geography',
  'east_asian_history', 'world_history', 'economics', 'politics_law', 'ethics_thought',
  'physics_1', 'chemistry_1', 'biology_1', 'earth_science_1',
  'physics_2', 'chemistry_2', 'biology_2', 'earth_science_2',
  'middle_korean', 'middle_math', 'middle_english', 'middle_history', 'middle_social', 'middle_science',
];

interface ImageScanScreenProps {
  onImport: (params: {
    questionText: string;
    answerText: string;
    subject: SubjectKey;
    examTitle: string;
    questionFileName: string;
    answerFileName: string;
  }) => Promise<void>;
  isImporting: boolean;
  importError: string | null;
  importProgress?: string | null;
}

interface FileState {
  file: File | null;
  text: string;
  isParsing: boolean;
  parseError: string | null;
}

const EMPTY_FILE: FileState = { file: null, text: '', isParsing: false, parseError: null };

/**
 * 이미지 스캔을 통해 문항을 추출하는 화면
 */
export function ImageScanScreen({ onImport, isImporting, importError, importProgress }: ImageScanScreenProps) {
  const [subject, setSubject] = useState<SubjectKey>('high_korean');
  const [examTitle, setExamTitle] = useState('');
  const [questionFiles, setQuestionFiles] = useState<FileState[]>([]);

  const questionInputRef = useRef<HTMLInputElement>(null);

  /**
   * 업로드된 이미지 파일을 처리하여 base64 데이터로 변환합니다. (자동 압축 적용)
   */
  const handleImageFiles = async (files: File[]) => {
    // 다중 선택 시 역순 정렬 (사용자 편의)
    const orderedFiles = [...files].reverse();
    
    // 새로운 파일 상태 추가
    const newFileStates: FileState[] = orderedFiles.map(file => ({
      file, text: '', isParsing: true, parseError: null
    }));
    
    setQuestionFiles(prev => [...prev, ...newFileStates]);

    // 각 파일을 압축 및 base64 문자열로 변환
    for (const file of orderedFiles) {
      try {
        const textFromImage = await compressImageToBase64(file);
        
        // "IMAGE_DATA:" 접두어 호환성 유지
        const finalData = textFromImage.startsWith('data:') ? `IMAGE_DATA:${textFromImage}` : textFromImage;

        setQuestionFiles(prev => {
          const next = [...prev];
          const targetIdx = next.findIndex(f => f.file === file && f.isParsing);
          if (targetIdx !== -1) {
            next[targetIdx] = { file, text: finalData, isParsing: false, parseError: null };
          }
          return next;
        });
      } catch (err) {
        setQuestionFiles(prev => {
          const next = [...prev];
          const targetIdx = next.findIndex(f => f.file === file && f.isParsing);
          if (targetIdx !== -1) {
            next[targetIdx] = { file, text: '', isParsing: false, parseError: '이미지 압축 실패' };
          }
          return next;
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) as File[] : [];
    if (rawFiles.length > 0) handleImageFiles(rawFiles);
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setQuestionFiles(prev => prev.filter((_, i) => i !== index));
  };

  const canStart =
    subject &&
    questionFiles.length > 0 &&
    questionFiles.every(f => !f.isParsing && f.text.startsWith('IMAGE_DATA:')) &&
    !isImporting;

  const handleStart = () => {
    if (!canStart) return;
    
    const combinedText = questionFiles.map(f => f.text).join('|||FILE_BREAK|||');

    onImport({
      questionText: combinedText,
      answerText: '',
      subject,
      examTitle: examTitle.trim() || `${SUBJECT_CONFIG[subject].label} 기출 맞춤 생성`,
      questionFileName: questionFiles[0].file!.name + (questionFiles.length > 1 ? ` 외 ${questionFiles.length - 1}건` : ''),
      answerFileName: '',
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:py-12">
      {/* 헤더 섹션 */}
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900">기출문제 맞춤 생성</h1>
        <p className="mt-3 text-[15px] font-medium text-slate-500 break-keep">
          실제 기출 모의고사나 수능 문제지 이미지를 업로드하세요. <br className="hidden sm:block" />
          AI가 지문과 문항을 정밀 분석하여 나만의 맞춤형 디지털 기출 문제집으로 즉시 변환해 드립니다.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* 설정 영역 */}
        <div className="space-y-6 lg:col-span-7">
          <div className="premium-card p-6 sm:p-8">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-black text-slate-900">
              <SettingsIcon className="h-5 w-5 text-primary" />
              생성 설정
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-wider text-slate-400">학습 과목</label>
                <div className="relative">
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectKey)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-[15px] font-bold text-slate-800 shadow-sm transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
                  >
                    {SCAN_SUBJECT_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {SUBJECT_CONFIG[key].label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-black uppercase tracking-wider text-slate-400">
                  시험 제목 <span className="font-medium text-slate-300">(미입력 시 자동 생성)</span>
                </label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  placeholder={`예: 2024년 6월 모의고사 ${SUBJECT_CONFIG[subject].label}`}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-4 text-[15px] font-bold text-slate-800 placeholder-slate-300 shadow-sm transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>
          </div>

          <div className="hidden lg:block space-y-4">
            <div className="rounded-[2rem] bg-purple-50/50 p-6 text-sm text-purple-700 ring-1 ring-purple-100/50">
              <div className="mb-2 flex items-center gap-2 font-black">
                <CheckCircle2 className="h-4 w-4" />
                스캔 확인 사항
              </div>
              <ul className="space-y-1.5 font-medium text-purple-600/80">
                <li>• 고해상도의 선명한 이미지일수록 인식률이 높습니다.</li>
                <li>• 여러 장의 이미지를 순서대로 업로드할 수 있습니다.</li>
                <li>• 정답이 포함된 이미지라면 AI가 정답까지 함께 추출합니다.</li>
              </ul>
            </div>

            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full group relative overflow-hidden rounded-[2rem] bg-primary py-5 text-lg font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary-container hover:shadow-primary/30 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isImporting ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin text-white/80" />
                    <span>{importProgress ?? '이미지 분석 중...'}</span>
                  </>
                ) : (
                  <>
                    <span>기출문제 생성 시작하기</span>
                    <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* 파일 업로드 영역 */}
        <div className="space-y-6 lg:col-span-5">
          <div className="space-y-6">
            <div className="group relative">
              <label className="mb-2 block text-[13px] font-black uppercase tracking-wider text-slate-400">추출할 이미지 파일</label>
              <div className="space-y-3">
                {questionFiles.map((state, idx) => (
                  <ImageUploadBox
                    key={`img-${idx}-${state.file?.name}`}
                    state={state}
                    onClear={() => removeFile(idx)}
                    onClickUpload={() => questionInputRef.current?.click()}
                  />
                ))}
                {questionFiles.length === 0 && (
                  <ImageUploadBox
                    state={EMPTY_FILE}
                    onClear={() => {}}
                    onClickUpload={() => questionInputRef.current?.click()}
                  />
                )}
                <button 
                  type="button"
                  onClick={() => questionInputRef.current?.click()}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-slate-200 text-sm font-black text-slate-400 hover:border-primary/40 hover:text-primary transition-all bg-white/50"
                >
                  + 다음 페이지 이미지 추가
                </button>
              </div>
              <input
                ref={questionInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex items-center gap-2 rounded-2xl bg-blue-50 px-4 py-3 text-[13px] font-bold text-blue-600 ring-1 ring-blue-100">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              멀티 이미지 지원: 업로드한 순서대로 문항 번호가 부여됩니다.
            </div>
          </div>

          {importError && (
            <div className="flex items-start gap-3 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-600 ring-1 ring-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* 모바일용 시작 버튼 */}
          <div className="lg:hidden">
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full rounded-[2rem] bg-primary py-5 text-lg font-black text-white shadow-xl shadow-primary/20 transition-all active:scale-95 disabled:opacity-40"
            >
              {isImporting ? '분석 중...' : '기출문제 생성 시작하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────
function SettingsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// ─── 업로드 박스 서브 컴포넌트 ───────────────────────────────────────
const ImageUploadBox: React.FC<{
  state: FileState;
  onClear: () => void;
  onClickUpload: () => void;
}> = ({ state, onClear, onClickUpload }) => {
  const { file, text, isParsing, parseError } = state;
  const isReady = text.trim().length > 0;

  if (!file) {
    return (
      <button
        type="button"
        onClick={onClickUpload}
        className="flex w-full flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 transition-all hover:border-purple-400/40 hover:bg-purple-50/50 hover:shadow-inner group"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm transition-transform group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white">
          <Upload className="h-6 w-6" />
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-700">문제 이미지를 올려주세요</p>
          <p className="mt-1 text-xs font-medium text-slate-400">이미지 파일 (최대 50MB)</p>
        </div>
      </button>
    );
  }

  return (
    <div
      className={`relative flex items-center gap-4 rounded-3xl border p-4 transition-all shadow-sm ${
        parseError
          ? 'border-rose-200 bg-rose-50 shadow-rose-100/20'
          : isReady
          ? 'border-purple-200 bg-purple-50 shadow-purple-100/20'
          : 'border-slate-200 bg-white shadow-slate-100/20'
      }`}
    >
      <div className={`overflow-hidden flex h-14 w-14 items-center justify-center rounded-2xl transition-colors shrink-0 ${
        parseError ? 'bg-rose-100 text-rose-600' : isReady ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-400'
      }`}>
        {text.startsWith('IMAGE_DATA:') ? (
          <img src={text.replace('IMAGE_DATA:', '')} alt="preview" className="h-full w-full object-cover" />
        ) : <FileText className="h-6 w-6" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-800">{file.name}</p>
        <div className="mt-1 flex items-center gap-2">
          {isParsing ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              이미지 읽는 중...
            </div>
          ) : parseError ? (
            <span className="text-xs font-bold text-rose-500">{parseError}</span>
          ) : isReady ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              인식 완료
            </div>
          ) : null}
        </div>
      </div>

      <button
        type="button"
        onClick={onClear}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/50 hover:text-rose-600 transition-colors"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
