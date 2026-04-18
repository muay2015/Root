import { useMemo, useState } from 'react';
import { SUBJECT_CONFIG, type SubjectCategory } from '../../lib/question/subjectConfig';
import { isSubjectKey, normalizeToSubjectKey } from '../../lib/examUtils';
import type { WrongNote } from '../../lib/examTypes';
import type { PersistedExamRecord } from '../../lib/rootPersistence';

interface CategoryInfo {
  id: string;
  label: string;
  icon: string;
}

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  all: { label: '전체', icon: '✨' },
  korean: { label: '국어', icon: '📚' },
  math: { label: '수학', icon: '📐' },
  english: { label: '영어', icon: '🔤' },
  history: { label: '역사', icon: '🏛️' },
  social: { label: '사회', icon: '🌍' },
  science: { label: '과학', icon: '🧪' },
  tech_home: { label: '기술·가정', icon: '🏠' },
  ethics: { label: '도덕', icon: '⚖️' },
  default: { label: '기타', icon: '📝' },
};

export function useWrongListScreenLogic(
  wrongNotes: WrongNote[],
  savedExams: PersistedExamRecord[]
) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSubject, setSelectedSubject] = useState<string>('전체');

  // 헬퍼: 오답 노트의 SubjectKey 추출
  const getSubjectKey = (note: WrongNote) => {
    const examMatch = savedExams.find((e) => e.title === note.examTitle);
    return normalizeToSubjectKey(
      note.subject || (note.id.includes('___') ? note.id.split('___')[0] : null),
      note.examTitle,
      examMatch?.questions[0]?.topic,
      examMatch?.questions,
      examMatch?.exam_format
    );
  };

  // 1. 실제 데이터 기반 노출 가능한 대분류(Category) 목록 계산
  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>(['all']);
    wrongNotes.forEach((note) => {
      const sKey = getSubjectKey(note);
      const category = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].category : 'default';
      categoriesSet.add(category);
    });

    return Array.from(categoriesSet)
      .map((id) => ({
        id,
        label: CATEGORY_LABELS[id]?.label || id,
        icon: CATEGORY_LABELS[id]?.icon || '📝',
      }))
      .sort((a, b) => {
        if (a.id === 'all') return -1;
        if (b.id === 'all') return 1;
        const order = ['korean', 'math', 'english', 'history', 'social', 'science'];
        const aIdx = order.indexOf(a.id);
        const bIdx = order.indexOf(b.id);
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.label.localeCompare(b.label);
      });
  }, [wrongNotes, savedExams]);

  // 2. 현재 선택된 대분류에 속하는 소분류(Subject) 목록 계산
  const availableSubjectsInCategory = useMemo(() => {
    const subjectsSet = new Set<string>();
    wrongNotes.forEach((note) => {
      const sKey = getSubjectKey(note);
      const category = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].category : 'default';
      const label = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].label : '기타 과목';

      if (selectedCategory === 'all' || category === selectedCategory) {
        subjectsSet.add(label);
      }
    });

    return Array.from(subjectsSet).sort();
  }, [wrongNotes, selectedCategory, savedExams]);

  // 3. 필터링된 오답 노트 목록
  const filteredNotes = useMemo(() => {
    return wrongNotes.filter((note) => {
      const sKey = getSubjectKey(note);
      const category = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].category : 'default';
      const label = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].label : '기타 과목';

      const matchCategory = selectedCategory === 'all' || category === selectedCategory;
      const matchSubject = selectedSubject === '전체' || label === selectedSubject;

      return matchCategory && matchSubject;
    });
  }, [wrongNotes, selectedCategory, selectedSubject, savedExams]);

  // 4. 과목별 그룹화 데이터 (기존 WrongListScreen 로직 유지)
  const groupedBySubject = useMemo(() => {
    const subjectsMap: Record<
      string,
      { examDict: Record<string, WrongNote[]>; category: SubjectCategory | 'default' }
    > = {};

    for (const note of filteredNotes) {
      const sKey = getSubjectKey(note);
      const subjectLabel = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].label : '기타 과목';
      const category = isSubjectKey(sKey) ? SUBJECT_CONFIG[sKey].category : 'default';

      if (!subjectsMap[subjectLabel]) {
        subjectsMap[subjectLabel] = { examDict: {}, category };
      }
      if (!subjectsMap[subjectLabel].examDict[note.examTitle]) {
        subjectsMap[subjectLabel].examDict[note.examTitle] = [];
      }
      subjectsMap[subjectLabel].examDict[note.examTitle].push(note);
    }

    return Object.entries(subjectsMap).sort(([a], [b]) => {
      if (a === '기타 과목') return 1;
      if (b === '기타 과목') return -1;
      return a.localeCompare(b);
    });
  }, [filteredNotes, savedExams]);

  return {
    state: {
      selectedCategory,
      selectedSubject,
      availableCategories,
      availableSubjectsInCategory,
      filteredNotes,
      groupedBySubject,
    },
    actions: {
      setSelectedCategory,
      setSelectedSubject,
    },
  };
}
