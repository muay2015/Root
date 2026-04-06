import { createClient } from '@supabase/supabase-js';

const combined = "https://flgrgxhqvlblrdsvlqhm.supabase.co/sb_publishable_hdOkfixk3A2YJEmpc92Q8w_L2T_CbW_";
const markerIndex = combined.indexOf('/sb_publishable_');
const url = combined.slice(0, markerIndex);
const key = combined.slice(markerIndex + 1);

const supabase = createClient(url, key);

async function testInsert() {
  console.log("Testing insert without subject...");
  
  const authRes = await supabase.auth.signInAnonymously();
  if (authRes.error) {
    console.error("Auth error:", authRes.error.message);
    return;
  }
  
  const userId = authRes.data.user.id;
  
  const payload = {
    user_id: userId,
    title: "Test Exam",
    builder_mode: "upload",
    question_type: "mixed",
    difficulty: "hard",
    exam_format: "high",
    question_count: 5,
    source_text: "test",
    question_files: [],
    answer_files: [],
    questions: [],
    responses: {},
    score: null,
    correct_count: null,
    wrong_count: null,
    submitted_at: null,
  };

  const { data, error } = await supabase.from('exam_attempts').insert(payload).select('*').single();
  
  if (error) {
    console.error("❌ Insert Error:", error);
  } else {
    console.log("✅ Insert Success. Returned keys:", Object.keys(data));
  }
}

testInsert();
