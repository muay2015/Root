import React from 'react';
import { FileUp, CheckCircle2, X, Camera, Image as ImageIcon, AlertCircle, Info, Lightbulb, Sparkles } from 'lucide-react';
import { fileToBase64, optimizeImage } from '../../lib/imageUtils';
import { type DetailedGrade, type BuilderMode } from '../../lib/examTypes';
import { type SubjectKey, SUBJECT_CONFIG, getUploadRecommendation } from '../../lib/question/subjectConfig';
import { MIDDLE_MATH_CURRICULUM } from '../../lib/question/mathCurriculum';
import { ocrService } from '../../services/ocrService';

interface AIDetailsInputProps {
  mode: BuilderMode;
  subject: SubjectKey;
  questionType: string;
  detailedGrade: DetailedGrade;
  generationTopic: string;
  setGenerationTopic: (val: string) => void;
  materialText: string;
  setMaterialText: (val: string | ((prev: string) => string)) => void;
  parsedFiles: string[];
  removeFile: (name: string) => void;
  isParsing: boolean;
  parsingProgress: string;
  parseError: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSuccess: boolean;
  successFile: string | null;
  isGenerating: boolean;
  generationError: string | null;
  onGenerate: () => void;
  imageData: { mimeType: string; data: string }[];
  setImageData: React.Dispatch<React.SetStateAction<{ mimeType: string; data: string }[]>>;
  ocrPages: { id: string; text: string }[];
  setOcrPages: React.Dispatch<React.SetStateAction<{ id: string; text: string }[]>>;
}

const MATH_AREA_GUIDE: Record<string, string> = {
  '수와 연산': '예: 소인수분해, 정수와 유리수의 사칙계산, 제곱근과 실수',
  '문자와 식': '예: 일차방정식의 활용, 식의 전개와 인수분해, 이차방정식의 풀이',
  '함수': '예: 좌표평면과 그래프, 일차함수와 그래프, 이차함수의 성질',
  '기하(도형)': '예: 삼각형의 내심과 외심, 피타고라스 정리, 원과 직선',
  '확률과 통계': '예: 대푯값과 산포도, 경우의 수와 확률, 상관관계',
};

export function AIDetailsInput(props: AIDetailsInputProps) {
  const {
    mode,
    subject,
    questionType,
    detailedGrade,
    generationTopic,
    setGenerationTopic,
    materialText,
    setMaterialText,
    parsedFiles,
    removeFile,
    isParsing,
    parsingProgress,
    parseError,
    onFileChange,
    showSuccess,
    successFile,
    imageData,
    setImageData,
    ocrPages,
    setOcrPages
  } = props;

  const [isExtracting, setIsExtracting] = React.useState(false);
  const [extractingIndices, setExtractingIndices] = React.useState<number[]>([]);
  const [completedIndices, setCompletedIndices] = React.useState<number[]>([]);
  const [activePageIndex, setActivePageIndex] = React.useState<number>(0);
  const [showRequirementToast, setShowRequirementToast] = React.useState(false);

  // 내신 대비 모드 + 지문 필수 과목 선택 시 토스트 표시
  React.useEffect(() => {
    const isRequired = getUploadRecommendation(subject) === 'REQUIRED';
    if (mode === 'school' && isRequired) {
      setShowRequirementToast(true);
      const timer = setTimeout(() => setShowRequirementToast(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setShowRequirementToast(false);
    }
  }, [subject, mode]);

  const processImages = async (files: File[]) => {
    if (files.length === 0) return;

    setIsExtracting(true);
    let currentBatchIndex = 0;

    for (const file of files) {
      try {
        const optimized = await optimizeImage(file);
        const base64 = await fileToBase64(optimized);
        
        // 업로드 시작 전 현재 인덱스 확정
        let newIndex = 0;
        setImageData(prev => {
          newIndex = prev.length;
          return [...prev, base64];
        });
        
        // 파일별 개별 상태 추적을 위해 유일한 ID 생성
        const pageId = `img-${Date.now()}-${currentBatchIndex}`;
        setOcrPages(prev => [...prev, { id: pageId, text: `[분석 중: ${file.name}]` }]);
        
        // 추출 시작 인덱스 기록
        setExtractingIndices(prev => [...prev, newIndex]);
        
        const result = await ocrService.extractText(base64);
        
        if (result.text) {
          const pageHeader = `---------- [사진 추출 내용: ${file.name}] ----------\n`;
          setOcrPages(prev => {
            const next = [...prev];
            // 정확한 인덱스에 매핑 (상태 업데이트 시점 고려)
            if (next[newIndex]) {
              next[newIndex].text = pageHeader + result.text;
            } else {
              // 혹시 모를 누락 방지
              next[newIndex] = { id: pageId, text: pageHeader + result.text };
            }
            return next;
          });
          setCompletedIndices(prev => [...prev, newIndex]);
        }
        
        setExtractingIndices(prev => prev.filter(idx => idx !== newIndex));
        currentBatchIndex++;
      } catch (err) {
        console.error('Image processing or OCR failed:', err);
      }
    }

    setIsExtracting(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) as File[] : [];
    await processImages(rawFiles);
    e.target.value = '';
  };

  const handleUnifiedUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles = e.target.files ? Array.from(e.target.files) as File[] : [];
    if (rawFiles.length === 0) return;

    const images = rawFiles.filter(f => f.type.startsWith('image/'));
    const nonImages = rawFiles.filter(f => !f.type.startsWith('image/'));

    // 이미지 파일은 OCR 처리 프로세스로 전달
    if (images.length > 0) {
      await processImages(images);
    }

    // 비이미지 파일(PDF 등)은 기존 파일 변경 핸들러로 전달
    if (nonImages.length > 0) {
      // Create a mock event to reuse onFileChange
      const mockEvent = {
        ...e,
        target: {
          ...e.target,
          files: nonImages as any
        }
      } as React.ChangeEvent<HTMLInputElement>;
      onFileChange(mockEvent);
    }
    
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setImageData(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <section className="space-y-6">
      <section className="premium-card p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500">
            학습 집중 영역 (단원/주제)
          </h2>
        </div>
        <input
          value={generationTopic}
          onChange={(event) => setGenerationTopic(event.target.value)}
          placeholder={
            mode === 'csat' 
              ? (SUBJECT_CONFIG[subject].csatExampleTopic || "전 범위에서 핵심 문항을 자동 선정합니다.")
              : (subject === 'middle_math' && questionType && Object.prototype.hasOwnProperty.call(MATH_AREA_GUIDE, questionType))
                ? MATH_AREA_GUIDE[questionType]
                : SUBJECT_CONFIG[subject].exampleTopic
          }
          className="mt-4 w-full rounded-2xl bg-slate-50 border-none px-5 py-4 text-[13px] font-bold text-slate-900 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-accent transition-all placeholder:text-slate-300 placeholder:font-medium"
        />
        <p className="mt-2.5 text-[11px] font-bold text-blue-500/80 pl-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-500">
          <Sparkles className="h-3 w-3" />
          <span>단원과 세부 주제에 집중된 문항이 생성됩니다.</span>
        </p>
      </section>

      {/* 중등 수학이 아닐 때만 학습 자료 추가 섹션 표시 */}
      {subject !== 'middle_math' && (
        <section className="premium-card p-6">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-slate-500">학습 내용 추가</h2>
              
              {(() => {
                const rawRec = getUploadRecommendation(subject);
                const rec = (mode === 'csat' && rawRec === 'REQUIRED') ? 'RECOMMENDED' : rawRec;

                if (rec === 'REQUIRED') {
                  return (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 ring-1 ring-red-100 animate-in fade-in slide-in-from-right-2 duration-500">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-black">지문·자료 첨부 필수</span>
                    </div>
                  );
                }
                if (rec === 'RECOMMENDED') {
                  return (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-100 animate-in fade-in slide-in-from-right-2 duration-500">
                      <Lightbulb className="h-3.5 w-3.5" />
                      <span className="text-[11px] font-black">{mode === 'csat' ? '추가 자료 활용 권장' : '지문·자료 첨부 권장'}</span>
                    </div>
                  );
                }
                return (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 animate-in fade-in slide-in-from-right-2 duration-500">
                    <Info className="h-3.5 w-3.5" />
                    <span className="text-[11px] font-black">현 상태로 생성 가능</span>
                  </div>
                );
              })()}
            </div>
            
            <div className="pl-1 h-3">
              {/* 기존 문구 제거됨 (토스트로 대체) */}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-violet-50 px-4 py-2 text-xs font-bold text-violet-600 ring-1 ring-violet-100 hover:bg-violet-100 transition-all active:scale-95 shadow-sm">
                <Camera className="h-4 w-4" />
                <span>사진 촬영</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={handleImageUpload}
                />
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-xs font-bold text-blue-600 ring-1 ring-blue-100 hover:bg-blue-100 transition-all active:scale-95 shadow-sm">
                <FileUp className="h-4 w-4" />
                <span>파일 업로드</span>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,.pdf"
                  multiple
                  onClick={(e) => {
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onChange={handleUnifiedUpload}
                />
              </label>
            </div>
          </div>
          
          <div className="relative mt-2">
            {isParsing && (
              <div className="absolute inset-x-0 -inset-y-2 z-50 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[2px] animate-in fade-in duration-300">
                <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200">
                  <div className="relative h-16 w-16">
                    <div className="absolute inset-0 animate-ping rounded-full bg-blue-100" />
                    <div className="relative flex h-full w-full items-center justify-center rounded-full bg-blue-50">
                      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent shadow-sm" />
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-1 text-center">
                    <span className="text-[15px] font-black text-slate-800">지능형 자료 분석 중</span>
                    <p className="text-[11px] font-bold text-slate-400 max-w-[200px] leading-relaxed">
                      {parsingProgress || 'AI가 지식을 습득하고 있습니다.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2 mb-3">
              {showSuccess && (
                <div className="flex items-center justify-between rounded-xl bg-emerald-500 px-5 py-3.5 text-[13px] font-black text-white shadow-lg shadow-emerald-900/10 animate-in zoom-in-95 slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
                      <CheckCircle2 className="h-4 w-4" strokeWidth={3} />
                    </div>
                    <span>자료 업로드 및 반영 완료 : {successFile}</span>
                  </div>
                  <div className="h-1.5 w-16 rounded-full bg-white/30 overflow-hidden">
                    <div className="h-full bg-white animate-[progress_4s_linear_forwards]" />
                  </div>
                </div>
              )}
              
              {(parsedFiles.length > 0 || imageData.length > 0) && (
                <div className="flex flex-wrap gap-2 py-1">
                  {parsedFiles.map((name, i) => (
                    <div key={`file-${i}`} className="group relative inline-flex items-center gap-1.5 rounded-xl bg-white pl-3.5 pr-1.5 py-1.5 text-[12px] font-black text-slate-700 ring-1 ring-slate-200 shadow-sm hover:ring-blue-400 hover:text-blue-600 transition-all cursor-default overflow-hidden">
                      <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative flex items-center gap-1.5 mr-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{name}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(name);
                        }}
                        className="relative flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                  {imageData.map((img, i) => {
                    const isProcessing = extractingIndices.includes(i);
                    const isDone = completedIndices.includes(i);
                    
                    return (
                      <div key={`img-${i}`} className={`group relative inline-flex items-center gap-1.5 rounded-xl bg-white p-1.5 text-[12px] font-black text-slate-700 ring-1 ${isDone ? 'ring-emerald-200 bg-emerald-50/20' : 'ring-slate-200'} shadow-sm hover:ring-violet-400 hover:text-violet-600 transition-all cursor-default`}>
                        <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-slate-100 border border-slate-100">
                          <img 
                            src={`data:${img.mimeType};base64,${img.data}`} 
                            alt="Preview" 
                            className={`h-full w-full object-cover ${(isProcessing || isExtracting && i === imageData.length - 1) ? 'opacity-40 grayscale' : ''}`}
                          />
                          {(isProcessing || isExtracting && i === imageData.length - 1) && (
                             <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
                             </div>
                          )}
                          {isDone && (
                            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" strokeWidth={3} />
                            </div>
                          )}
                        </div>
                        <span className="max-w-[80px] truncate">이미지 {i + 1}</span>
                        {isProcessing && (
                          <span className="text-[10px] text-violet-500 animate-pulse">분석 중...</span>
                        )}
                        {isDone && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" strokeWidth={3} />
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(i);
                            setCompletedIndices(prev => prev.filter(idx => idx !== i));
                          }}
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={3} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 분석 중이거나 오류 발생 시에만 상태 박스 표시 */}
              {(isParsing || parseError) && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed ${isParsing ? 'border-blue-200 bg-blue-50/30' : 'border-red-100 bg-red-50/30'} text-[12px] font-bold`}>
                  {isParsing ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-blue-600">{parsingProgress || '자료 분석 중...'}</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span className="text-red-500">분석 실패: {parseError}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {ocrPages.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {ocrPages.map((_, idx) => (
                     <button
                       key={`tab-${idx}`}
                       onClick={() => setActivePageIndex(idx)}
                       className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                         activePageIndex === idx 
                          ? 'bg-violet-600 text-white shadow-md scale-105' 
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                       }`}
                     >
                       페이지 {idx + 1}
                     </button>
                  ))}
                </div>
              )}

              <textarea
                value={ocrPages[activePageIndex]?.text || (activePageIndex === 0 ? materialText : '')}
                onChange={(event) => {
                  const val = event.target.value;
                  if (ocrPages.length > 0 && ocrPages[activePageIndex]) {
                    setOcrPages(prev => {
                      const next = [...prev];
                      next[activePageIndex].text = val;
                      return next;
                    });
                  } else if (activePageIndex === 0) {
                    setMaterialText(val);
                  }
                }}
                placeholder={ocrPages.length > 0 ? "이 페이지에서 추출된 내용을 수정하세요." : "학습할 교재의 텍스트를 붙여넣거나, 상단 '자료 업로드' 버튼을 통해 파일을 추가하세요."}
                className="w-full min-h-[180px] p-5 rounded-2xl bg-slate-50/50 border-2 border-slate-100 text-sm focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 transition-all outline-none resize-none font-medium leading-relaxed placeholder:text-slate-300"
              />
            </div>
          </div>
        </section>
      )}
      {/* 지문 필수 안내 토스트 */}
      {showRequirementToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl ring-1 ring-white/10 flex items-center gap-3 border border-white/5">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[13px] font-bold text-white">지문 자료가 꼭 필요해요!</span>
              <p className="text-[11px] font-medium text-slate-300 leading-tight">
                {SUBJECT_CONFIG[subject].label} 과목은 지문 사진이나 파일을 필수로 첨부해야 합니다.
              </p>
            </div>
            <button 
              onClick={() => setShowRequirementToast(false)}
              className="ml-auto p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
