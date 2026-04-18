import { useMemo, useState } from 'react';
import type { PersistedExamRecord } from '../../lib/rootPersistence';
import { normalizeToSubjectKey } from '../../lib/examUtils';
import { SUBJECT_CONFIG, CATEGORY_CONFIG, type SubjectCategory } from '../../lib/question/subjectConfig';

export interface UseSavedScreenLogicProps {
  exams: PersistedExamRecord[];
  selectedSubject: string;
  onDeleteMultiple: (recordIds: string[]) => Promise<void> | void;
}

export function useSavedScreenLogic({
  exams,
  selectedSubject,
  onDeleteMultiple,
}: UseSavedScreenLogicProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [previewExamId, setPreviewExamId] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const totalGeneratedQuestionCount = useMemo(
    () => exams.reduce((sum, exam) => sum + Number(exam.question_count || 0), 0),
    [exams]
  );

  // 현재 보관함에 있는 시험지들의 모든 대분류(Category) 추출
  const availableCategories = useMemo(() => {
    const categories = new Set<string>(['all']);
    for (const exam of exams) {
      const subjectKey = normalizeToSubjectKey(
        exam.subject,
        exam.title,
        exam.questions[0]?.topic,
        exam.questions,
        exam.exam_format
      );
      if (subjectKey) {
        categories.add(SUBJECT_CONFIG[subjectKey].category);
      } else {
        categories.add('etc');
      }
    }
    
    // CATEGORY_CONFIG 순서대로 정렬하되 'all'은 맨 앞으로
    const sorted = Array.from(categories).sort((a, b) => {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      
      const order = Object.keys(CATEGORY_CONFIG);
      const aIdx = order.indexOf(a);
      const bIdx = order.indexOf(b);
      
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return sorted.map(cat => {
      if (cat === 'all') return { id: 'all', label: '전체', icon: '✨' };
      if (cat === 'etc') return { id: 'etc', label: '기타', icon: '📁' };
      return { 
        id: cat, 
        label: CATEGORY_CONFIG[cat as SubjectCategory].label,
        icon: CATEGORY_CONFIG[cat as SubjectCategory].icon 
      };
    });
  }, [exams]);

  // 선택된 대분류에 속하는 소분류(Subject) 목록 추출
  const availableSubjectsInCategory = useMemo(() => {
    if (selectedCategory === 'all') return [];

    const subjects = new Set<string>();
    for (const exam of exams) {
      const subjectKey = normalizeToSubjectKey(
        exam.subject,
        exam.title,
        exam.questions[0]?.topic,
        exam.questions,
        exam.exam_format
      );
      
      const cat = subjectKey ? SUBJECT_CONFIG[subjectKey].category : 'etc';
      if (cat === selectedCategory) {
        const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
        subjects.add(label);
      }
    }
    
    return Array.from(subjects).sort();
  }, [exams, selectedCategory]);

  const allSubjects = useMemo(() => {
    const list = new Set<string>(['전체']);
    for (const exam of exams) {
      const subjectKey = normalizeToSubjectKey(
        exam.subject,
        exam.title,
        exam.questions[0]?.topic,
        exam.questions,
        exam.exam_format
      );
      const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      list.add(label);
    }
    return Array.from(list).sort((a, b) => {
      if (a === '전체') return -1;
      if (b === '전체') return 1;
      return a.localeCompare(b);
    });
  }, [exams]);

  const filteredExams = useMemo(() => {
    if (selectedSubject === '전체') return exams;
    return exams.filter((exam) => {
      const subjectKey = normalizeToSubjectKey(
        exam.subject,
        exam.title,
        exam.questions[0]?.topic,
        exam.questions,
        exam.exam_format
      );
      const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      return label === selectedSubject;
    });
  }, [exams, selectedSubject]);

  const groupedBySubject = useMemo(() => {
    if (selectedSubject === '전체') {
      // 전체 보기일 때는 그룹화하지 않고 최신순으로 하나의 섹션에 렌더링
      return [['최근 생성된 문제', filteredExams]] as [string, PersistedExamRecord[]][];
    }

    const subjectsMap: Record<string, PersistedExamRecord[]> = {};

    for (const exam of filteredExams) {
      const subjectKey = normalizeToSubjectKey(
        exam.subject,
        exam.title,
        exam.questions[0]?.topic,
        exam.questions,
        exam.exam_format
      );
      const label = subjectKey ? SUBJECT_CONFIG[subjectKey].label : '기타 과목';
      if (!subjectsMap[label]) subjectsMap[label] = [];
      subjectsMap[label].push(exam);
    }

    return Object.entries(subjectsMap).sort((a, b) => {
      if (a[0] === '기타 과목') return 1;
      if (b[0] === '기타 과목') return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [filteredExams, selectedSubject]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredExams.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExams.map((e) => e.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || isDeleting) return;
    if (window.confirm(`${selectedIds.size}개의 문항을 영구적으로 삭제하시겠습니까?`)) {
      try {
        setIsDeleting(true);
        await onDeleteMultiple(Array.from(selectedIds));
        setIsSelectionMode(false);
        setSelectedIds(new Set());
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleToggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedIds(new Set());
  };

  const handleCancelSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };

  return {
    state: {
      openMenuId,
      previewExamId,
      isSelectionMode,
      selectedIds,
      isDeleting,
      totalGeneratedQuestionCount,
      allSubjects,
      availableCategories,
      availableSubjectsInCategory,
      selectedCategory,
      filteredExams,
      groupedBySubject,
    },
    actions: {
      setOpenMenuId,
      setPreviewExamId,
      toggleSelection,
      selectAll,
      handleDeleteSelected,
      handleToggleSelectionMode,
      handleCancelSelection,
      setSelectedCategory,
    },
  };
}
