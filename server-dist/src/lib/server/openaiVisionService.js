import OpenAI from 'openai';
export async function segmentExamWithOpenAI(params) {
    const modelName = params.model || process.env.OPENAI_MODEL || "gpt-4o";
    const openai = new OpenAI({ apiKey: params.apiKey });
    const base64Image = params.imageBuffer.toString('base64');
    // 하이브리드 모드: 이미지 원본을 그대로 표시하므로 선지·좌표만 필요
    const prompt = `당신은 한국 시험지 분석 전문가입니다.
제공된 시험지 이미지에서 각 문항의 선지(choices)와 이미지 위치 좌표(image_focus_area)를 추출하세요.

규칙:
1. 단일 문항 이미지(1개 문항만 있는 캡처)라면 image_focus_area를 [0, 0, 1000, 1000]으로 설정하세요.
2. 복수 문항 포함 이미지라면 각 문항 박스를 정밀하게 감싸는 좌표를 설정하세요 (여백 50~70 포함).
3. choices: 선지 기호(①②③④⑤ 또는 1. 2. 3.)를 제외한 텍스트만 포함하세요.
4. answer: 정답 선지 텍스트 (이미지에서 확인 불가 시 빈 문자열 "").
5. image_focus_area: [ymin, xmin, ymax, xmax] 형식, 0~1000 정규화 좌표.

반드시 다음 JSON 형식으로만 반환하세요:
{"questions": [{"id": 1, "choices": ["선지1", "선지2", ...], "answer": "", "image_focus_area": [ymin, xmin, ymax, xmax]}, ...]}`;
    try {
        const response = await openai.chat.completions.create({
            model: modelName,
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${params.mimeType};base64,${base64Image}`,
                                detail: "auto", // 한국어 텍스트 인식을 위해 auto 유지
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
            max_completion_tokens: 3000, // 문항 20개 × 선지 5개 기준 여유값
        });
        const content = response.choices[0].message.content;
        if (!content)
            throw new Error('OpenAI로부터 응답을 받지 못했습니다.');
        console.log('--- OpenAI Raw Response ---');
        console.log(content);
        console.log('---------------------------');
        const parsed = JSON.parse(content);
        let questions = [];
        if (Array.isArray(parsed)) {
            questions = parsed;
        }
        else if (parsed.questions && Array.isArray(parsed.questions)) {
            questions = parsed.questions;
        }
        else if (parsed.items && Array.isArray(parsed.items)) {
            questions = parsed.items;
        }
        else if (parsed.data && Array.isArray(parsed.data)) {
            questions = parsed.data;
        }
        else {
            // 마지막 폴백: 객체에서 첫 번째 배열 값 사용
            const firstArray = Object.values(parsed).find(v => Array.isArray(v));
            if (firstArray)
                questions = firstArray;
        }
        if (questions.length === 0) {
            console.warn('[OpenAI Vision] 파싱된 문항 없음. 원본 응답:', content);
            throw new Error('GPT 응답에서 문항을 찾을 수 없습니다. 응답 키: ' + Object.keys(parsed).join(', '));
        }
        // 데이터 정제 (Sanitization)
        return questions.map((q, index) => {
            let focus = { top: 0, left: 0, width: 100, height: 10 };
            if (Array.isArray(q.image_focus_area) && q.image_focus_area.length === 4) {
                const [ymin, xmin, ymax, xmax] = q.image_focus_area;
                focus = {
                    top: ymin / 10,
                    left: xmin / 10,
                    width: (xmax - xmin) / 10,
                    height: (ymax - ymin) / 10,
                };
            }
            else if (typeof q.image_focus_area === 'object' && q.image_focus_area !== null) {
                focus = {
                    top: q.image_focus_area.top ?? 0,
                    left: q.image_focus_area.left ?? 0,
                    width: q.image_focus_area.width ?? 100,
                    height: q.image_focus_area.height ?? 10,
                };
            }
            return {
                id: q.id || index + 1,
                type: 'multiple',
                topic: '', // 이미지로 표시되므로 불필요
                stem: '', // 이미지로 표시되므로 불필요
                choices: Array.isArray(q.choices) ? q.choices : [],
                answer: q.answer || '',
                explanation: '', // 이미지로 표시되므로 불필요
                image_focus_area: focus
            };
        });
    }
    catch (err) {
        console.error('OpenAI Vision Error:', err.message);
        throw new Error(`GPT-4o 분석 실패: ${err.message}`);
    }
}
