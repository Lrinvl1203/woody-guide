const fs = require('fs');
const path = require('path');

function readGuideKnowledge() {
  const candidates = [
    path.join(process.cwd(), 'data', 'guide-knowledge.json'),
    path.join(__dirname, '..', 'data', 'guide-knowledge.json')
  ];
  for (const p of candidates) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (_) {}
  }
  return null;
}

function extractText(output) {
  if (typeof output?.output_text === 'string') return output.output_text;
  const parts = [];
  for (const item of output?.output || []) {
    for (const c of item?.content || []) {
      if (typeof c?.text === 'string') parts.push(c.text);
    }
  }
  return parts.join('\n').trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: 'OPENAI_API_KEY is not configured on the server.',
      answer: 'AI 챗봇 서버 환경변수 OPENAI_API_KEY가 아직 설정되지 않았습니다. Vercel 프로젝트 환경변수에 OpenAI API 키를 추가한 뒤 다시 배포하면 작동합니다.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const question = String(body.message || '').trim().slice(0, 1200);
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    if (!question) return res.status(400).json({ error: 'message is required' });

    const guide = readGuideKnowledge();
    const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
    const system = `You are MADE STAY 301's guest-guide concierge chatbot. Answer in the user's language, default Korean.

Use the provided GUIDE_KNOWLEDGE as the primary source of truth. If the answer is clearly in GUIDE_KNOWLEDGE, answer directly and concisely.

If the user asks for something not clearly present in GUIDE_KNOWLEDGE, you may use web search for general/current information. In that case, explicitly include this Korean notice or a translated equivalent: "가이드에 명확히 없는 내용이라 추가 확인 또는 호스트 확인이 필요합니다." Do not pretend searched information is official host policy.

Never guess door lock passwords, private access codes, undisclosed host phone numbers, or safety/security details. Tell the guest to check the Airbnb/host message.

For urgent issues such as fire, leak, lockout, or inability to enter, tell the guest to contact the host/emergency contact immediately.

Keep answers mobile-friendly: short paragraphs, bullets, and clear next actions.`;

    const input = [
      { role: 'system', content: system },
      { role: 'user', content: `GUIDE_KNOWLEDGE:\n${JSON.stringify(guide, null, 2)}` },
      ...history.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 1200) })),
      { role: 'user', content: question }
    ];

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input,
        tools: [{ type: 'web_search_preview', search_context_size: 'low' }],
        tool_choice: 'auto',
        temperature: 0.2,
        max_output_tokens: 900
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'OpenAI API error',
        detail: data
      });
    }

    const answer = extractText(data) || '죄송합니다. 답변을 생성하지 못했습니다. 호스트에게 확인해 주세요.';
    return res.status(200).json({ answer, model, searched: JSON.stringify(data).includes('web_search') });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
};
