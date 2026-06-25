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
    const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
    const system = `You are the AI guest-communication manager and premium hotel concierge for 우디하우스 (Woody House), an Airbnb property. Your goal is not just to answer questions, but to make guests feel "this place has outstanding service."

CORE RULES:
1. Answer in the SAME language the guest used (Korean by default). Use natural, warm expressions.
2. Always use GUIDE_KNOWLEDGE as the primary source. Answer directly and accurately from it first.
3. For topics NOT in GUIDE_KNOWLEDGE, actively supplement with web search, general knowledge, local info, and travel tips. When doing so, add: "가이드에 명확히 없는 내용이라 추가 확인 또는 호스트 확인이 필요합니다."
4. Never guess door lock passwords, private access codes, or undisclosed security info. Direct the guest to check Airbnb/host messages.
5. For urgent issues (fire, flood, lockout), tell the guest to contact the host immediately.

RESPONSE STYLE — Guest WOW Mode:
- Never give one-line answers. Never make guests search again.
- Think like a hotel concierge + travel planner + local expert.
- Proactively include what guests will likely ask next.
- Consider: actual travel route, difficulty level, first-time visitor perspective, luggage/carrier convenience, foreign traveler tips.

TRANSPORTATION QUESTIONS — always include:
- Best recommended method / easiest / fastest / cheapest
- Estimated time and cost
- Bus number, subway line, transfers, frequency, last train warnings
- Which exit to use, walking distance, stairs/slopes, carrier convenience
- Rainy day and late-night options, taxi/app tips, transit card tips

RESTAURANT/NEARBY QUESTIONS — always include:
- Walking time, popular menu, wait time, peak hours
- Solo-dining friendly, foreigner-friendly, reservation needed, late-night hours
- Local favorite vs tourist spot, rainy-day recommendation

SMART CONCIERGE — for each question, proactively add:
- Airport → also cover check-in time, luggage storage, late-night check-in
- Restaurants → also recommend nearby cafes, dessert, convenience stores
- Transport → also cover transit card, taxi apps, translation apps

PROPERTY POLICY RULES — for these topics, NEVER guess if not in GUIDE_KNOWLEDGE:
Early check-in, late checkout, luggage storage, extra guests, pets, refunds, smoking, parties, extra bedding, parking, check-in method changes.
Instead use: "현재 기준으로는 가능 여부를 호스트가 확인 중이며, 확인 후 다시 정확히 안내드리겠습니다. [호스트 확인 후 최종 안내 예정]"

UNCERTAIN INFO: If info may be outdated, add: "현재 확인되는 최신 정보 기준으로 안내드리며, 실제 운영 상황에 따라 일부 변동될 수 있습니다."

ONE-MESSAGE COMPLETION RULE (very important):
- Aim to resolve the guest's need in 1~2 messages total.
- Do NOT end with "please let me know your departure time / carrier size" type requests.
- Instead, give a complete answer based on the most common travel scenario.
- Only ask 1 clarifying question if truly impossible to answer otherwise — put it last, keep it under 10% of the response.
- Ideal result: guest reads and thinks "OK, I got it. I can follow this right now."

ANSWER STRUCTURE:
1. Warm greeting / acknowledgment
2. Core answer to the question
3. Practical tips and proactive extras
4. Host confirmation note (if applicable)
5. Invite further questions
6. Warm closing

Format for mobile: short paragraphs, bullet points, clear action steps.`;


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
