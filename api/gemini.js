const SYSTEM_INSTRUCTION = `You are Google Gemini, an intelligent, versatile, helpful, and creative AI assistant embedded within the retroZen driving web experience.
You can converse about ANYTHING and answer ANY questions across all topics: general knowledge, science, mathematics, coding, literature, philosophy, history, jokes, creative writing, everyday conversation, or life advice.

Tone & Style:
- Friendly, thoughtful, engaging, and clear.
- Use clean, well-formatted markdown (bullet points, bold text, paragraphs, inline code where helpful).

INTERACTIVE 3D RETROZEN GAME INTEGRATION:
You are also connected to the retroZen 3D driving simulation!
If the user asks for a driving or walking recommendation, shares their mood/emotions (e.g. stressed, nostalgic, happy, tired), asks where they should travel in the game, or asks for a relaxing cruise:
1. Provide a warm, personalized conversational response.
2. At the very end of your response, append an optional trip configuration block in this exact markdown format:
\`\`\`zen-trip
{
  "mapId": "tokyo" | "hillside" | "london" | "snow" | "times_square" | "istiklal",
  "timeOfDay": "sunrise" | "afternoon" | "sunset" | "night",
  "beatTrack": 1 | 2 | 3 | 4 | 5 | 6,
  "vinyl": true | false,
  "rain": true | false,
  "mode": "car" | "walk" | "skateboard"
}
\`\`\`

Game reference for the trip block:
- Maps:
  * 'tokyo': Sci-fi elevated cyber expressway with neon billboards & synthwave skyline.
  * 'hillside': Rolling green hills, windmills, wildflowers, distant mountain peaks.
  * 'london': Colorful Victorian townhouses, British pubs, red phone boxes, Big Ben.
  * 'snow': Alpine mountain pass, snow-capped peaks, falling 3D snow.
  * 'times_square': Pedestrian plaza at 42nd & Broadway, giant pixel video walls, yellow cabs.
  * 'istiklal': Historic pedestrian avenue in Istanbul with red tram, simit carts, Ottoman bay windows. (NOTE: Istiklal is a strict NO-DRIVING zone: mode must be 'walk' or 'skateboard'!).
- Timings: 'sunrise', 'afternoon', 'sunset', 'night'.
- Lo-Fi Beats: 1 (Shibuya Sunset), 2 (Green Hill Breeze), 3 (London Drizzle Jazz), 4 (Alpine Solitude), 5 (Times Square Midnight), 6 (Istiklal Twilight).
- Modes: 'car' (driving cockpit with speedometer), 'walk' (first-person stroll), 'skateboard' (high-speed cruising deck).

CRITICAL RULE:
If the user is asking a general question (e.g. "who is elon musk?", science, coding, history), answer their question thoroughly, intelligently, and naturally. DO NOT include a zen-trip block unless they specifically ask for a route or their query is about wanting a zen driving journey.`;

function generateFallbackDrive(userPrompt) {
  const text = (userPrompt || '').toLowerCase();
  if (text.includes('turkey') || text.includes('istanbul') || text.includes('istiklal') || text.includes('tram') || text.includes('simit')) {
    return {
      text: "Hoş geldiniz! Istanbul's İstiklal Caddesi is rich with centuries of history, bustling aromas of roasted chestnuts, and neoclassical architecture. Here is a peaceful sunset walk for you.",
      trip: { mapId: "istiklal", timeOfDay: "sunset", beatTrack: 6, vinyl: true, rain: false, mode: "walk" }
    };
  } else if (text.includes('times square') || text.includes('new york') || text.includes('skate') || text.includes('broadway')) {
    return {
      text: "Times Square is brimming with kinetic electric energy. Gliding down Broadway on a retro skateboard is a fantastic way to turn restless thoughts into smooth rhythm.",
      trip: { mapId: "times_square", timeOfDay: "sunset", beatTrack: 5, vinyl: false, rain: false, mode: "skateboard" }
    };
  } else if (text.includes('london') || text.includes('rain') || text.includes('sad') || text.includes('melancholy') || text.includes('nostalg')) {
    return {
      text: "Rain has a beautiful way of slowing the world down and clearing the mental slate. A night cruise through London's wet Victorian streets with gentle jazz is just what you need.",
      trip: { mapId: "london", timeOfDay: "night", beatTrack: 3, vinyl: true, rain: true, mode: "car" }
    };
  } else if (text.includes('tokyo') || text.includes('japan') || text.includes('futur') || text.includes('cyber') || text.includes('neon') || text.includes('speed')) {
    return {
      text: "Ready to accelerate into tomorrow? The Tokyo cyber expressway offers glowing kanji signs, neon megatowers, and smooth driving flow.",
      trip: { mapId: "tokyo", timeOfDay: "night", beatTrack: 1, vinyl: false, rain: false, mode: "car" }
    };
  } else if (text.includes('snow') || text.includes('mountain') || text.includes('alpine') || text.includes('quiet') || text.includes('sleep') || text.includes('peace')) {
    return {
      text: "Snow absorbs noise and creates a serene sanctuary. Cruising through the frosted pines of the alpine pass will ease your mind into tranquil stillness.",
      trip: { mapId: "snow", timeOfDay: "night", beatTrack: 4, vinyl: true, rain: false, mode: "car" }
    };
  } else if (text.includes('drive') || text.includes('route') || text.includes('map') || text.includes('stress') || text.includes('tired') || text.includes('unwind')) {
    return {
      text: "Taking a drive through rolling green meadows with fresh air and winding turns is one of the best ways to release tension and regain clarity.",
      trip: { mapId: "hillside", timeOfDay: "sunset", beatTrack: 2, vinyl: true, rain: false, mode: "car" }
    };
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // Parse body
  let parsed = req.body;
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed); } catch (e) { parsed = {}; }
  }
  if (!parsed && req.on) {
    parsed = await new Promise(resolve => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); }
      });
    });
  }
  parsed = parsed || {};

  const userPrompt = (parsed.prompt || '').trim();
  if (!userPrompt) {
    return res.status(400).json({ success: false, error: 'Please enter a message or question.' });
  }

  // Support key sent from client (localStorage) OR server env
  const apiKey = (parsed.apiKey || '').trim() || (process.env.GEMINI_API_KEY || '').trim();

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const fallbackDrive = generateFallbackDrive(userPrompt);
    if (fallbackDrive) {
      return res.status(200).json({
        success: true,
        text: fallbackDrive.text,
        trip: fallbackDrive.trip,
        recommendation: fallbackDrive.trip,
        isMock: true,
        info: "Offline Drive Suggestion. To chat about any topic, click [ 🔑 SET KEY ] above to enter your free Gemini key."
      });
    } else {
      return res.status(200).json({
        success: true,
        text: `🔑 **Live Google Gemini API Key Needed**\n\nI want to answer your question! To chat freely about anything with Google AI, please enter your free API key:\n\n1. Click **[ 🔑 SET KEY ]** at the top right of this drawer\n2. Paste your free key from [Google AI Studio](https://aistudio.google.com/app/apikey) and click **SAVE**!`,
        trip: null,
        needsKey: true,
        isMock: true
      });
    }
  }

  // 1. Discover available models for this key directly from Google
  let availableModels = [];
  let apiVersion = 'v1beta';

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();
    if (listRes.ok && Array.isArray(listData.models)) {
      availableModels = listData.models
        .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));
    }
  } catch (err) {}

  // Priority list for selecting the best available model
  const candidatePriority = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-flash-latest',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
    'gemini-pro'
  ];

  // Combine discovered models with priority
  const modelsToTry = [
    ...candidatePriority.filter(m => availableModels.includes(m)),
    ...availableModels,
    ...candidatePriority
  ];
  const uniqueModels = [...new Set(modelsToTry.filter(Boolean))];

  // Build messages
  const contents = [];
  if (Array.isArray(parsed.history)) {
    for (const msg of parsed.history) {
      if (msg && msg.role && msg.text) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        });
      }
    }
  }
  contents.push({ role: 'user', parts: [{ text: userPrompt }] });

  let geminiData = null;
  let successModel = null;
  let lastErrorMessage = '';

  for (const model of uniqueModels) {
    // Try with systemInstruction first
    try {
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
        })
      });
      const data = await res.json();
      if (res.ok && data.candidates?.[0]) {
        geminiData = data;
        successModel = model;
        break;
      } else {
        lastErrorMessage = data.error?.message || `Status ${res.status}`;
      }
    } catch (e) {
      lastErrorMessage = e.message;
    }

    // If model rejected systemInstruction (like Gemma models), try without systemInstruction
    try {
      const promptWithSystem = `${SYSTEM_INSTRUCTION}\n\nUser Question: ${userPrompt}`;
      const fallbackContents = [
        ...contents.slice(0, -1),
        { role: 'user', parts: [{ text: promptWithSystem }] }
      ];
      const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: fallbackContents,
          generationConfig: { temperature: 0.8, maxOutputTokens: 2048 }
        })
      });
      const data = await res.json();
      if (res.ok && data.candidates?.[0]) {
        geminiData = data;
        successModel = model;
        break;
      } else {
        lastErrorMessage = data.error?.message || `Status ${res.status}`;
      }
    } catch (e) {
      lastErrorMessage = e.message;
    }
  }

  if (!geminiData) {
    const fallbackDrive = generateFallbackDrive(userPrompt);
    return res.status(200).json({
      success: true,
      text: fallbackDrive ? fallbackDrive.text : `⚠️ Google API note: ${lastErrorMessage || 'Could not reach model.'}`,
      trip: fallbackDrive ? fallbackDrive.trip : null,
      isMock: true
    });
  }

  const rawText = geminiData.candidates[0].content?.parts?.[0]?.text || '';
  let cleanText = rawText;
  let trip = null;

  const tripMatch = rawText.match(/```(?:zen-trip|json)?\s*(\{[\s\S]*?\})\s*```/i);
  if (tripMatch) {
    try {
      const parsedTrip = JSON.parse(tripMatch[1]);
      if (parsedTrip.mapId) {
        if (parsedTrip.mapId === 'istiklal' && parsedTrip.mode === 'car') {
          parsedTrip.mode = 'walk';
        }
        trip = parsedTrip;
        cleanText = rawText.replace(tripMatch[0], '').trim();
      }
    } catch (e) {}
  }

  return res.status(200).json({
    success: true,
    text: cleanText || rawText,
    trip: trip,
    recommendation: trip,
    isMock: false,
    model: successModel
  });
};
