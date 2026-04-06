import { createClient } from '@supabase/supabase-js';

const combined = "https://flgrgxhqvlblrdsvlqhm.supabase.co/sb_publishable_hdOkfixk3A2YJEmpc92Q8w_L2T_CbW_";
const markerIndex = combined.indexOf('/sb_publishable_');
const url = combined.slice(0, markerIndex);
const key = combined.slice(markerIndex + 1);

const supabase = createClient(url, key);

async function checkExams() {
  const { data, error } = await supabase.from('exam_attempts').select('title, created_at, user_id').order('created_at', { ascending: false }).limit(5);
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log(`Fetched ${data.length} recent exams:`);
    console.log(data);
  }
}

checkExams();
