import { createClient } from '@supabase/supabase-js';

const combined = "https://flgrgxhqvlblrdsvlqhm.supabase.co/sb_publishable_hdOkfixk3A2YJEmpc92Q8w_L2T_CbW_";
const markerIndex = combined.indexOf('/sb_publishable_');
const url = combined.slice(0, markerIndex);
const key = combined.slice(markerIndex + 1);

const supabase = createClient(url, key);

async function testLocalIdUpsert() {
  console.log("=== 테스트: local-xxxx ID로 upsert 시도 ===");
  
  const authRes = await supabase.auth.signInAnonymously();
  const userId = authRes.data?.user?.id;
  
  const localId = `local-${Date.now()}`;
  console.log("테스트 ID:", localId);
  
  const payload = {
    id: localId,         // <-- 이것이 UUID 타입과 충돌하는지 확인
    user_id: userId,
    title: "[영어] local ID 테스트",
    builder_mode: "upload",
    question_type: "mixed",
    difficulty: "hard",
    exam_format: "high",
    question_count: 5,
    source_text: null,
    question_files: [],
    answer_files: [],
    questions: [],
    responses: {},
    score: null,
    correct_count: null,
    wrong_count: null,
    submitted_at: null,
  };

  const { error } = await supabase.from('exam_attempts').upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error("❌ local ID upsert 실패:", error.message);
    console.log("→ 이것이 동기화가 안되는 원인입니다!");
  } else {
    console.log("✅ local ID upsert 성공 (DB가 text ID 허용)");
    await supabase.from('exam_attempts').delete().eq('id', localId);
  }
}

testLocalIdUpsert();
