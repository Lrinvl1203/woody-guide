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
    keys: ['wifi', 'wi-fi', 'password', '와이파이', '비밀번호', 'パスワード', '无线', '無線', '密码', '密碼'],
    ko: '와이파이 이름은 U+NetAC4F, 비밀번호는 32F7006823 입니다. 숙소 와이파이 화면에서도 바로 확인하실 수 있습니다.',
    en: 'The Wi-Fi name is U+NetAC4F and the password is 32F7006823. You can also check it on the Wi-Fi section of this guide.',
    ja: 'Wi-Fi名は U+NetAC4F、パスワードは 32F7006823 です。ガイドのWi-Fiセクションでも確認できます。',
    zh: 'Wi-Fi 名称是 U+NetAC4F，密码是 32F7006823。也可以在本指南的 Wi-Fi 页面查看。'
  },
  {
    keys: ['tv', 'television', 'netflix', 'youtube', '티비', '텔레비전', '넷플릭스', '유튜브', 'テレビ', '電視', '电视'],
    ko: '일반 텔레비전은 전원 버튼을 누르시면 됩니다. 넷플릭스와 유튜브는 리모컨의 해당 버튼을 누르세요. 일반 TV로 돌아가려면 외부입력을 HDMI 1로 맞춰 주세요.',
    en: 'For regular TV, press the power button. For Netflix or YouTube, use the dedicated remote buttons. To return to regular TV, set the input to HDMI 1.',
    ja: '通常のテレビを見る場合は電源ボタンを押してください。NetflixやYouTubeはリモコンの専用ボタンを押します。通常放送に戻る場合は外部入力を HDMI 1 に合わせてください。',
    zh: '看普通电视时请按电源键。Netflix 和 YouTube 请按遥控器上的对应按钮。要回到普通电视，请把输入源切换到 HDMI 1。'
  },
  {
    keys: ['boiler', 'heating', 'hot water', '난방', '온수', '보일러', '暖房', 'お湯', '熱水', '热水', '暖气'],
    ko: '난방과 온수는 보일러 전원 버튼으로 켭니다. 온수만 사용하려면 난방/외출 버튼을 두 번 눌러 주세요. 화면 왼쪽은 난방 온도, 오른쪽은 온수 온도입니다.',
    en: 'Turn on the boiler power for heating and hot water. For hot water only, press the heating/away button twice. The left side of the screen is heating temperature, and the right side is hot-water temperature.',
    ja: '暖房とお湯はボイラーの電源ボタンでオンにします。お湯だけ使う場合は、暖房/外出ボタンを2回押してください。画面左側が暖房温度、右側がお湯の温度です。',
    zh: '暖气和热水可通过锅炉电源键开启。只使用热水时，请按两次“暖气/外出”按钮。屏幕左侧是暖气温度，右侧是热水温度。'
  },
  {
    keys: ['air conditioner', 'aircon', 'air purifier', 'ac', '에어컨', '공기청정기', 'エアコン', '空気清浄機', '空调', '空調', '空气净化器', '空氣清淨機'],
    ko: '공기청정기는 전원과 바람 세기 버튼을 사용합니다. 에어컨은 전원, 온도, 바람 세기 버튼으로 조절하시면 됩니다.',
    en: 'Use the power and fan-speed buttons for the air purifier. For the air conditioner, adjust power, temperature, and fan speed with the remote.',
    ja: '空気清浄機は電源ボタンと風量ボタンを使います。エアコンは電源、温度、風量ボタンで調整してください。',
    zh: '空气净化器使用电源和风量按钮。空调可用电源、温度和风量按钮调节。'
  },
  {
    keys: ['washer', 'washing', 'laundry', 'detergent', '세탁', '세탁기', '세제', '빨래', '洗濯', '洗剤', '洗衣', '洗衣机', '洗衣機'],
    ko: '세탁기는 전원을 켠 뒤 코스를 선택하고 시작/일시정지를 누르세요. 세제는 싱크대 아래에 있습니다. 수건 세탁 시에는 섬유유연제를 넣지 말아 주세요.',
    en: 'Turn on the washer, choose a course, then press start/pause. Detergent is under the sink. Please do not use fabric softener when washing towels.',
    ja: '洗濯機は電源を入れてコースを選び、開始/一時停止ボタンを押してください。洗剤はシンク下にあります。タオルを洗う時は柔軟剤を入れないでください。',
    zh: '洗衣机请先打开电源，选择程序后按开始/暂停。洗涤剂在水槽下方。清洗毛巾时请不要使用柔顺剂。'
  },
  {
    keys: ['induction', 'stove', 'cooktop', '인덕션', 'ih', 'コンロ', '電磁炉', '电磁炉'],
    ko: '인덕션은 전원을 켠 뒤 잠겨 있으면 잠금/해제 버튼을 누르고, 화력 버튼으로 세기를 조절하세요.',
    en: 'Turn on the induction cooktop. If it is locked, press the lock/unlock button first, then adjust the heat level.',
    ja: 'IHコンロは電源を入れ、ロックされている場合はロック/解除ボタンを押してから、火力ボタンで調整してください。',
    zh: '电磁炉请先打开电源。如果处于锁定状态，请先按锁定/解锁按钮，然后用火力按钮调节。'
  },
  {
    keys: ['trash', 'garbage', 'recycling', 'food waste', '쓰레기', '재활용', '음식물', 'ゴミ', 'ごみ', 'リサイクル', '垃圾', '回收', '廚餘', '厨余'],
    ko: '일반 쓰레기는 분홍색 또는 흰색 봉투, 음식물 쓰레기는 노란색 봉투와 전용 용기를 사용해 주세요. 재활용은 지하 2층 분리수거장을 이용하시면 됩니다.',
    en: 'For general trash, use the pink or white bags. For food waste, use the yellow bag and dedicated container. Recycling should be taken to the B2 recycling area.',
    ja: '一般ゴミはピンク色または白色の袋、食品ゴミは黄色い袋と専用容器を使ってください。リサイクルは地下2階の分別収集所をご利用ください。',
    zh: '一般垃圾请使用粉色或白色垃圾袋，厨余垃圾请使用黄色垃圾袋和专用容器。可回收物请拿到地下2层的分类回收区。'
  }
];

function detectQuestionLanguage(question) {
  const q = String(question || '');
  if (/[가-힣]/.test(q)) return 'ko';
  if (/[\u3040-\u30ff]/.test(q)) return 'ja';
  if (/[\u3400-\u9fff]/.test(q)) return 'zh';
  if (/[a-z]/i.test(q)) return 'en';
  return 'ko';
}

function languageName(code) {
  return {
    ko: 'Korean',
    en: 'English',
    ja: 'Japanese',
    zh: 'Chinese'
  }[code] || 'Korean';
}

function localAnswer(question) {
  const q = String(question || '').toLowerCase();
  const lang = detectQuestionLanguage(question);
  const hit = LOCAL_ANSWERS.find(item => item.keys.some(key => q.includes(key.toLowerCase())));
  if (hit) return hit[lang] || hit.en || hit.ko;
  return {
    ko: '와이파이, 텔레비전, 난방·온수, 에어컨, 세탁기, 인덕션, 쓰레기 배출 방법을 확인할 수 있습니다. 예약, 도어락, 긴급 상황은 호스트에게 직접 확인해 주세요.',
    en: 'I can help with Wi-Fi, TV, heating and hot water, air conditioner, washer, induction cooktop, and trash or recycling. For booking, door lock, or urgent issues, please contact the host directly.',
    ja: 'Wi-Fi、テレビ、暖房・お湯、エアコン、洗濯機、IHコンロ、ゴミの出し方をご案内できます。予約、ドアロック、緊急時はホストに直接ご確認ください。',
    zh: '我可以帮助查询 Wi-Fi、电视、暖气/热水、空调、洗衣机、电磁炉以及垃圾分类方法。关于预订、门锁或紧急情况，请直接联系房东确认。'
  }[lang];
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
    const targetLanguageCode = detectQuestionLanguage(question);
    const targetLanguage = languageName(targetLanguageCode);

    const guide = readGuideKnowledge();
    const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
    const system = `You are the AI guest-communication manager and premium hotel concierge for 우디하우스 (Woody House), an Airbnb property. Your goal is not just to answer questions, but to make guests feel "this place has outstanding service."

CORE RULES:
1. Answer in TARGET_LANGUAGE, based only on the latest guest question. Do not copy the language of GUIDE_KNOWLEDGE or older chat history. Use natural, warm expressions in TARGET_LANGUAGE.
2. Always use GUIDE_KNOWLEDGE as the primary source. Answer directly and accurately from it first.
3. For topics NOT in GUIDE_KNOWLEDGE, actively supplement with web search, general knowledge, local info, and travel tips. When doing so, add a TARGET_LANGUAGE equivalent of: "This is not clearly covered in the guide, so additional confirmation or host confirmation may be needed."
4. Never guess door lock passwords, private access codes, or undisclosed security info. Direct the guest to check Airbnb/host messages.
5. For urgent issues (fire, flood, lockout), tell the guest to contact the host immediately.

LANGUAGE LOCK:
- TARGET_LANGUAGE is determined from the latest guest question, not from GUIDE_KNOWLEDGE.
- Translate guide facts into TARGET_LANGUAGE.
- Keep the full answer in TARGET_LANGUAGE, including headings, bullets, closing sentence, and host-confirmation notes.
- If the latest guest question mixes languages, use the dominant language; if unclear, use Korean.

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
Instead use a TARGET_LANGUAGE equivalent of: "The host is currently checking whether this is possible, and I will provide accurate final guidance after confirmation. [Final guidance pending host confirmation]"

UNCERTAIN INFO: If info may be outdated, add a TARGET_LANGUAGE equivalent of: "This is based on the latest information currently available, and some details may vary depending on actual operating conditions."

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
      { role: 'user', content: `TARGET_LANGUAGE: ${targetLanguage}\nLATEST_GUEST_QUESTION:\n${question}` }
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
