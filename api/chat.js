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

const LOCAL_ANSWERS = [
  {
    keys: ['wifi', 'wi-fi', 'password', '와이파이', '비밀번호'],
    ko: '와이파이 이름은 U+NetAC4F, 비밀번호는 32F7006823 입니다. 숙소 와이파이 화면에서도 바로 확인하실 수 있습니다.',
    en: 'The Wi-Fi name is U+NetAC4F and the password is 32F7006823. You can also check it on the Wi-Fi section of this guide.'
  },
  {
    keys: ['tv', 'television', 'netflix', 'youtube', '티비', '텔레비전', '넷플릭스', '유튜브'],
    ko: '일반 텔레비전은 전원 버튼을 누르시면 됩니다. 넷플릭스와 유튜브는 리모컨의 해당 버튼을 누르세요. 일반 TV로 돌아가려면 외부입력을 HDMI 1로 맞춰 주세요.',
    en: 'For regular TV, press the power button. For Netflix or YouTube, use the dedicated remote buttons. To return to regular TV, set the input to HDMI 1.'
  },
  {
    keys: ['boiler', 'heating', 'hot water', '난방', '온수', '보일러'],
    ko: '난방과 온수는 보일러 전원 버튼으로 켭니다. 온수만 사용하려면 난방/외출 버튼을 두 번 눌러 주세요. 화면 왼쪽은 난방 온도, 오른쪽은 온수 온도입니다.',
    en: 'Turn on the boiler power for heating and hot water. For hot water only, press the heating/away button twice. The left side of the screen is heating temperature, and the right side is hot-water temperature.'
  },
  {
    keys: ['air conditioner', 'aircon', 'air purifier', 'ac', '에어컨', '공기청정기'],
    ko: '공기청정기는 전원과 바람 세기 버튼을 사용합니다. 에어컨은 전원, 온도, 바람 세기 버튼으로 조절하시면 됩니다.',
    en: 'Use the power and fan-speed buttons for the air purifier. For the air conditioner, adjust power, temperature, and fan speed with the remote.'
  },
  {
    keys: ['washer', 'washing', 'laundry', 'detergent', '세탁', '세탁기', '세제', '빨래'],
    ko: '세탁기는 전원을 켠 뒤 코스를 선택하고 시작/일시정지를 누르세요. 세제는 싱크대 아래에 있습니다. 수건 세탁 시에는 섬유유연제를 넣지 말아 주세요.',
    en: 'Turn on the washer, choose a course, then press start/pause. Detergent is under the sink. Please do not use fabric softener when washing towels.'
  },
  {
    keys: ['induction', 'stove', 'cooktop', '인덕션'],
    ko: '인덕션은 전원을 켠 뒤 잠겨 있으면 잠금/해제 버튼을 누르고, 화력 버튼으로 세기를 조절하세요.',
    en: 'Turn on the induction cooktop. If it is locked, press the lock/unlock button first, then adjust the heat level.'
  },
  {
    keys: ['trash', 'garbage', 'recycling', 'food waste', '쓰레기', '재활용', '음식물'],
    ko: '일반 쓰레기는 분홍색 또는 흰색 봉투, 음식물 쓰레기는 노란색 봉투와 전용 용기를 사용해 주세요. 재활용은 지하 2층 분리수거장을 이용하시면 됩니다.',
    en: 'For general trash, use the pink or white bags. For food waste, use the yellow bag and dedicated container. Recycling should be taken to the B2 recycling area.'
  }
];

function localAnswer(question) {
  const q = String(question || '').toLowerCase();
  const isEnglish = /[a-z]/i.test(q) && !/[가-힣]/.test(q);
  const hit = LOCAL_ANSWERS.find(item => item.keys.some(key => q.includes(key.toLowerCase())));
  if (hit) return isEnglish ? hit.en : hit.ko;
  return isEnglish
    ? 'I can help with Wi-Fi, TV, heating and hot water, air conditioner, washer, induction cooktop, and trash or recycling. For booking, door lock, or urgent issues, please contact the host directly.'
    : '와이파이, 텔레비전, 난방·온수, 에어컨, 세탁기, 인덕션, 쓰레기 배출 방법을 확인할 수 있습니다. 예약, 도어락, 긴급 상황은 호스트에게 직접 확인해 주세요.';
}

function parseBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body || '{}');
    } catch (_) {
      return {};
    }
  }
  return req.body || {};
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const body = parseBody(req);
    return res.status(200).json({
      fallback: true,
      answer: localAnswer(body.message)
    });
  }

  try {
    const body = parseBody(req);
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
      console.warn('OpenAI API fallback:', response.status, data?.error?.code || data?.error?.message || 'unknown');
      return res.status(200).json({
        fallback: true,
        answer: localAnswer(question)
      });
    }

    const answer = extractText(data) || '죄송합니다. 답변을 생성하지 못했습니다. 호스트에게 확인해 주세요.';
    return res.status(200).json({ answer, model, searched: JSON.stringify(data).includes('web_search') });
  } catch (err) {
    console.warn('Chat API fallback:', err.message || String(err));
    return res.status(200).json({
      fallback: true,
      answer: localAnswer(parseBody(req).message)
    });
  }
};
