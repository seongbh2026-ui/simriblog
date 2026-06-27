import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/agent/topic", async (req, res) => {
    try {
      const { keyword } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
당신은 유튜브 트렌드와 인터넷 커뮤니티를 분석하는 '심리학 콘텐츠 기획 에이전트'입니다.
현재 구글 검색 도구를 사용할 수 있습니다. 인터넷에서 최신 트렌드나 유튜브에서 인기 있는 심리학 관련 주제를 검색하여 참고하세요.
현재 키워드: "${keyword}"

위 키워드와 관련된 사람들의 일상적인 고민을 해결해줄 수 있는 '신박하고 흥미로운 심리학 이론' 3가지를 매칭하여 블로그 글감을 제안해주세요.

응답은 반드시 아래 JSON 스키마를 따라야 합니다:
{
  "topics": [
    {
      "title": "가제 (예: 왜 우리는 퇴근만 하면 무기력해질까? - 자존감 부족 이론)",
      "theory": "관련 심리학 이론 이름",
      "reason": "이 주제가 흥미로운 이유"
    }
  ]
}
`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          }
        });
      } catch (err: any) {
        if (err?.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota') || err.message.includes('exceeded'))) {
          console.warn("gemini-3.5-flash limit exceeded. Falling back to gemini-2.5-flash...");
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
              tools: [{ googleSearch: {} }],
            }
          });
        } else {
          throw err;
        }
      }

      const text = response.text;
      if (!text) throw new Error("No response from Gemini API");

      // Extract JSON from markdown block if present
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      
      const result = JSON.parse(jsonStr);
      res.json(result);

    } catch (error: any) {
      console.error(error);
      const msg = error.message;
      let userError = msg;
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        userError = '사용량이 초과되었습니다. 잠시 후 다시 시도해주세요. (Rate Limit Exceeded)';
      } else if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
        userError = '현재 AI 모델 요청이 폭주하고 있습니다. 잠시 후 다시 시도해주세요. (Service Unavailable)';
      } else if (msg.includes('JSON')) {
         userError = '에이전트가 응답 형식을 맞추지 못했습니다. 다시 시도해주세요.';
      }
      res.status(500).json({ error: userError });
    }
  });

  app.post("/api/agent/write", async (req, res) => {
    try {
      const { topic, theory } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set" });
      }

      const styleGuide = fs.readFileSync(path.join(process.cwd(), 'prompt_assets', 'style_guide.md'), 'utf-8');
      const seoGuide = fs.readFileSync(path.join(process.cwd(), 'prompt_assets', 'seo_guide.md'), 'utf-8');

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
당신은 독자와 소통을 잘하는 따뜻한 심리 상담가이자 SEO 전문가입니다.
다음 주제와 이론을 바탕으로 제공된 [블로그 스타일 가이드]와 [SEO 가이드]를 철저히 준수하여 OREO 프레임워크에 맞춰 블로그 포스팅을 작성해주세요.

[주제]: ${topic}
[핵심 이론]: ${theory}

[필수 조건]
1. OREO 프레임워크 준수
   - Opinion (의견): 독자의 고민에 공감하며, 글의 핵심 주장 제시
   - Reason (이유): 왜 그런 마음이 드는지 '${theory}'을(를) 활용해 아주 쉽게 설명
   - Example (사례): 직장인, 학생 등 일상에서 누구나 겪을 법한 구체적이고 생생한 예시
   - Offer/Opinion (제안/강조): 오늘 당장 실천할 수 있는 작은 행동 지침이나 따뜻한 위로, 그리고 독자의 댓글을 유도하는 질문으로 마무리
2. 기계적인 마크다운 서식 금지: 굵은 글씨(**) 기호나 소제목(##, ###) 기호를 절대 사용하지 마세요. 강조나 소제목은 기호 없이 문맥 띄어쓰기나 일반 텍스트로 자연스럽게 구분하세요. HTML 태그도 사용하지 마세요. 순수 텍스트(Plain Text) 느낌으로 작성하되 문단과 띄어쓰기로만 시각적 구분을 주세요.

---
[블로그 스타일 가이드 참조 내용]
${styleGuide}

---
[SEO 가이드 참조 내용]
${seoGuide}
---

작성해 주세요:
`;

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt
        });
      } catch (err: any) {
        if (err?.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('quota') || err.message.includes('exceeded'))) {
          console.warn("gemini-3.5-flash limit exceeded. Falling back to gemini-2.5-flash...");
          response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
          });
        } else {
          throw err;
        }
      }

      res.json({ content: response.text });

    } catch (error: any) {
      console.error(error);
      const msg = error.message;
      let userError = msg;
      if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        userError = '사용량이 초과되었습니다. 잠시 후 다시 시도해주세요. (Rate Limit Exceeded)';
      } else if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
        userError = '현재 AI 모델 요청이 폭주하고 있습니다. 잠시 후 다시 시도해주세요. (Service Unavailable)';
      }
      res.status(500).json({ error: userError });
    }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
