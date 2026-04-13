require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
  const genAI = new GoogleGenerativeAI(process.env.VITE_OPENAI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-pro",
    generationConfig: {
      temperature: 0.7,
      responseMimeType: "application/json",
    }
  });

  const prompt = `당신은 대한민국 수능 영어 요약문 완성 문항만 전문적으로 출제하는 평가원 스타일 출제 위원입니다.
반드시 JSON 배열만 반환하십시오.
반드시 정확히 1개 문항만 생성하십시오.
이 요청은 오직 "요약문 완성" 유형입니다. 요지/주제/제목 유형으로 바꾸지 마십시오.
⚠️ CRITICAL: stem에는 반드시 한국어 발문과 4~6문장의 완전한 영어 읽기 지문을 함께 넣어야 합니다. 영어 지문이 없으면 문항 자체가 성립하지 않습니다.
각 문항은 반드시 다음 키를 포함해야 합니다: ["topic","type","stem","choices","answer","explanation","stimulus"]
- [HARD FORMAT LOCK] stem 형식: 한국어 발문(다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?) + 줄바꿈 두 번 + 4~6문장 완성된 영어 읽기 지문.
- [HARD FORMAT LOCK] stem의 영어 지문에는 (A), (B) 빈칸 표기를 절대 포함하지 마십시오.
- [HARD FORMAT LOCK] stimulus에는 반드시 영어 요약문 한 문장만 넣으십시오.
- [HARD FORMAT LOCK] stimulus에는 반드시 (A)_______ 와 (B)_______ 두 빈칸이 모두 들어 있어야 합니다.
- [HARD FORMAT LOCK] choices는 반드시 5개이며, 모두 "word_A / word_B" 형식이어야 합니다.
- [HARD FORMAT LOCK] answer는 반드시 choices 중 하나와 정확히 같은 문자열이어야 합니다.
- [HARD FORMAT LOCK] 요약문 완성 형식 외에 빈칸 추론, 순서 배열, 문장 삽입, 주제 문제 형식을 섞지 마십시오.
- [EXAMPLE JSON]
[
  {
    "topic": "Urban Policy and Trust",
    "type": "multiple",
    "stem": "다음 글의 내용을 한 문장으로 요약할 때, 빈칸 (A), (B)에 들어갈 말로 가장 적절한 것은?\\n\\nUrban planning has increasingly focused on efficiency metrics while neglecting social cohesion. Several studies have shown that cities with transparent governance frameworks and participatory decision-making processes tend to build stronger community bonds. In contrast, cities that prioritize rapid development without public engagement often face growing mistrust between residents and local authorities. The evidence suggests that lasting reform requires not just technical competence but also a foundation of accountability and civic involvement.",
    "stimulus": "Effective urban reform must combine (A)_______ with (B)_______.",
    "choices": ["technical efficiency / public trust", "rapid expansion / private control", "institutional speed / environmental decline", "economic scale / cultural uniformity", "digital access / reduced accountability"],
    "answer": "technical efficiency / public trust",
    "explanation": "The passage repeatedly contrasts practical performance with legitimacy and trust."
  }
]
Compose an original English reading passage (150-250 words) yourself for each question.
The passage must be realistic, self-contained prose suitable for the requested question type.`;

  try {
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
  } catch (err) {
    console.error(err);
  }
}
run();
