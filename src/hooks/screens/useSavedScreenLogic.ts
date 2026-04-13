import { useMemo, useState } from 'react';
import type { PersistedExamRecord } from '../../lib/rootPersistence';
import { normalizeToSubjectKey } from '../../lib/examUtils';
import { SUBJECT_CONFIG } from '../../lib/question/subjectConfig';

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

  const totalGeneratedQuestionCount = useMemo(
    () => exams.reduce((sum, exam) => sum + Number(exam.question_count || 0), 0),
    [exams]
  );

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
  }, [filteredExams]);

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
    },
  };
}
