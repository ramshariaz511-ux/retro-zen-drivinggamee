/**
 * RETROZEN DRIVING - SECURE BACKEND SERVER
 * Serves static web game assets and provides a secure Google Gemini AI proxy route.
 * 
 * Safely fetches GEMINI_API_KEY from environment variables / .env.
 * Never exposes the API key to frontend clients.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Safe loader for .env file
function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (val) {
            process.env[key] = val;
          }
        }
      }
    } catch (err) {
      console.warn('[Server] Could not parse .env file:', err.message);
    }
  }
}
loadEnvFile();

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

let GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';
let GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';
let DISCOVERED_MODELS = [];

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
If the user is asking a general question (e.g., "What is the capital of France?", "How do airplanes fly?", "Write a python function", "Tell me a joke", or general life discussion), answer their question thoroughly, intelligently, and naturally. DO NOT include a zen-trip block unless they specifically ask for a route or their query is about wanting a zen driving journey.`;

/**
 * Persist API Key to process.env and .env
 */
function saveApiKeyToFile(key, model, version) {
  process.env.GEMINI_API_KEY = key;
  if (model) process.env.GEMINI_MODEL = model;
  if (version) process.env.GEMINI_API_VERSION = version;

  const envPath = path.join(__dirname, '..', '.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }

  if (content.includes('GEMINI_API_KEY=')) {
    content = content.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${key}`);
  } else {
    content = `GEMINI_API_KEY=${key}\n` + content;
  }

  if (model) {
    if (content.includes('GEMINI_MODEL=')) {
      content = content.replace(/GEMINI_MODEL=.*/g, `GEMINI_MODEL=${model}`);
    } else {
      content += `\nGEMINI_MODEL=${model}`;
    }
  }

  fs.writeFileSync(envPath, content.trim() + '\n', 'utf8');
}

/**
 * Discover supported models via Google's ListModels API directly
 */
async function discoverAndVerifyGeminiKey(key) {
  const versions = ['v1beta', 'v1'];
  let modelsList = [];
  let lastError = null;
  let activeVersion = 'v1beta';

  // 1. Ask Google what models this exact key is permitted to use
  for (const ver of versions) {
    try {
      const url = `https://generativelanguage.googleapis.com/${ver}/models?key=${key}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && Array.isArray(data.models) && data.models.length > 0) {
        modelsList = data.models;
        activeVersion = ver;
        break;
      } else if (data.error) {
        lastError = data.error.message || `Status ${res.status}`;
        // If key is invalid, Google immediately says API_KEY_INVALID
        if (data.error.message?.includes('API_KEY_INVALID') || data.error.message?.includes('not valid')) {
          return { ok: false, error: 'API key is not valid. Please check your key at aistudio.google.com.' };
        }
      }
    } catch (e) {
      lastError = e.message;
    }
  }

  // If ListModels failed to return models
  if (modelsList.length === 0) {
    // Fallback: try common models directly if ListModels endpoint is restricted
    const fallbackList = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-pro'];
    for (const fb of fallbackList) {
      for (const ver of versions) {
        try {
          const testUrl = `https://generativelanguage.googleapis.com/${ver}/models/${fb}:generateContent?key=${key}`;
          const testRes = await fetch(testUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Ping' }] }] })
          });
          const testData = await testRes.json();
          if (testRes.ok && testData.candidates) {
            return { ok: true, model: fb, version: ver, availableModels: [fb] };
          }
        } catch (e) {}
      }
    }
    return { ok: false, error: lastError || 'Google rejected the API key or no models are available.' };
  }

  // Filter models that support generateContent
  const contentModels = modelsList.filter(m => 
    Array.isArray(m.supportedGenerationMethods) && 
    m.supportedGenerationMethods.includes('generateContent')
  ).map(m => m.name.replace(/^models\//, ''));

  if (contentModels.length === 0) {
    return { ok: false, error: 'Key connected, but no models supporting generateContent are assigned to this Google project.' };
  }

  DISCOVERED_MODELS = contentModels;

  // Priority order for selecting the best model
  const priority = [
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-pro'
  ];

  let selectedModel = null;
  for (const pref of priority) {
    const match = contentModels.find(m => m === pref || m.startsWith(pref));
    if (match) {
      selectedModel = match;
      break;
    }
  }

  if (!selectedModel) {
    selectedModel = contentModels[0];
  }

  // Test generateContent on the selected model to be 100% sure
  try {
    const testUrl = `https://generativelanguage.googleapis.com/${activeVersion}/models/${selectedModel}:generateContent?key=${key}`;
    const testRes = await fetch(testUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] })
    });
    const testData = await testRes.json();
    if (!testRes.ok) {
      // If selectedModel gave an error, try other models from contentModels
      for (const alt of contentModels) {
        if (alt === selectedModel) continue;
        const altUrl = `https://generativelanguage.googleapis.com/${activeVersion}/models/${alt}:generateContent?key=${key}`;
        const altRes = await fetch(altUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Hello' }] }] })
        });
        if (altRes.ok) {
          selectedModel = alt;
          break;
        }
      }
    }
  } catch (e) {
    // If test ping had network blip, trust the ListModels result
  }

  return {
    ok: true,
    model: selectedModel,
    version: activeVersion,
    availableModels: contentModels
  };
}

/**
 * Call Gemini with multi-turn and discovered model fallback
 */
async function callGemini(apiKey, contents) {
  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }]
    },
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048
    }
  };

  // Build candidate model list
  const modelsToTry = [
    GEMINI_MODEL,
    'gemma-4-26b-a4b-it',
    'gemma-4-31b-it',
    ...(DISCOVERED_MODELS || []),
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-pro'
  ];
  const uniqueModels = [...new Set(modelsToTry.filter(Boolean))];

  const versionsToTry = [GEMINI_API_VERSION, 'v1beta', 'v1'];
  const uniqueVersions = [...new Set(versionsToTry.filter(Boolean))];

  let lastData = null;
  let lastStatus = 500;

  for (const ver of uniqueVersions) {
    for (const m of uniqueModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/${ver}/models/${m}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        lastStatus = res.status;
        lastData = await res.json();

        if (res.ok && lastData.candidates?.[0]) {
          GEMINI_MODEL = m;
          GEMINI_API_VERSION = ver;
          return { ok: true, data: lastData, model: m, version: ver };
        }

        // Retry without systemInstruction for models (like Gemma) that don't support systemInstruction
        if (!res.ok) {
          const fallbackContents = contents.map((c, idx) => {
            if (idx === 0) {
              return { ...c, parts: [{ text: `${SYSTEM_INSTRUCTION}

${c.parts[0]?.text || ''}` }] };
            }
            return c;
          });
          const retryRes = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: fallbackContents, generationConfig: { temperature: 0.8, maxOutputTokens: 2048 } })
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && retryData.candidates?.[0]) {
            GEMINI_MODEL = m;
            GEMINI_API_VERSION = ver;
            return { ok: true, data: retryData, model: m, version: ver };
          }
        }

        if (lastStatus === 400 && (lastData.error?.message?.includes('API_KEY_INVALID') || lastData.error?.message?.includes('not valid'))) {
          return { ok: false, error: lastData.error.message, status: 400, invalidKey: true };
        }
      } catch (e) {
        lastData = { error: { message: e.message } };
      }
    }
  }

  return { ok: false, error: lastData?.error?.message || 'Gemini API call failed', status: lastStatus };
}

/**
 * Built-in Driving Fallback Oracle
 */
function generateFallbackDrive(userPrompt) {
  const text = (userPrompt || '').toLowerCase();
  
  if (text.includes('turkey') || text.includes('istanbul') || text.includes('istiklal') || text.includes('tram') || text.includes('simit')) {
    return {
      text: "Hoş geldiniz! Istanbul's İstiklal Caddesi is rich with centuries of history, bustling aromas of roasted chestnuts, and neoclassical architecture. Here is a peaceful sunset walk for you.",
      trip: {
        mapId: "istiklal",
        timeOfDay: "sunset",
        beatTrack: 6,
        vinyl: true,
        rain: false,
        mode: "walk"
      }
    };
  } else if (text.includes('times square') || text.includes('new york') || text.includes('skate') || text.includes('broadway')) {
    return {
      text: "Times Square is brimming with kinetic electric energy. Gliding down Broadway on a retro skateboard is a fantastic way to turn restless thoughts into smooth rhythm.",
      trip: {
        mapId: "times_square",
        timeOfDay: "sunset",
        beatTrack: 5,
        vinyl: false,
        rain: false,
        mode: "skateboard"
      }
    };
  } else if (text.includes('london') || text.includes('rain') || text.includes('sad') || text.includes('melancholy') || text.includes('nostalg')) {
    return {
      text: "Rain has a beautiful way of slowing the world down and clearing the mental slate. A night cruise through London's wet Victorian streets with gentle jazz is just what you need.",
      trip: {
        mapId: "london",
        timeOfDay: "night",
        beatTrack: 3,
        vinyl: true,
        rain: true,
        mode: "car"
      }
    };
  } else if (text.includes('tokyo') || text.includes('japan') || text.includes('futur') || text.includes('cyber') || text.includes('neon') || text.includes('speed')) {
    return {
      text: "Ready to accelerate into tomorrow? The Tokyo cyber expressway offers glowing kanji signs, neon megatowers, and smooth driving flow.",
      trip: {
        mapId: "tokyo",
        timeOfDay: "night",
        beatTrack: 1,
        vinyl: false,
        rain: false,
        mode: "car"
      }
    };
  } else if (text.includes('snow') || text.includes('mountain') || text.includes('alpine') || text.includes('quiet') || text.includes('sleep') || text.includes('peace')) {
    return {
      text: "Snow absorbs noise and creates a serene sanctuary. Cruising through the frosted pines of the alpine pass will ease your mind into tranquil stillness.",
      trip: {
        mapId: "snow",
        timeOfDay: "night",
        beatTrack: 4,
        vinyl: true,
        rain: false,
        mode: "car"
      }
    };
  } else if (text.includes('drive') || text.includes('route') || text.includes('map') || text.includes('stress') || text.includes('tired') || text.includes('unwind')) {
    return {
      text: "Taking a drive through rolling green meadows with fresh air and winding turns is one of the best ways to release tension and regain clarity.",
      trip: {
        mapId: "hillside",
        timeOfDay: "sunset",
        beatTrack: 2,
        vinyl: true,
        rain: false,
        mode: "car"
      }
    };
  } else {
    return null;
  }
}

/**
 * Handle POST /api/set-key
 */
async function handleSetKey(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 50000) req.connection.destroy();
  });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const candidateKey = (parsed.apiKey || '').trim();

      if (!candidateKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'API key cannot be empty.' }));
      }

      console.log('[RetroZen] Verifying API Key with Google ModelService...');
      const discovery = await discoverAndVerifyGeminiKey(candidateKey);

      if (!discovery.ok) {
        console.warn('[RetroZen] Key verification failed:', discovery.error);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: `Google rejected this key: ${discovery.error}`
        }));
      }

      // Save key with discovered working model & API version
      GEMINI_MODEL = discovery.model;
      GEMINI_API_VERSION = discovery.version;
      saveApiKeyToFile(candidateKey, discovery.model, discovery.version);

      console.log(`[RetroZen] Google Gemini Key verified! Active model: ${GEMINI_MODEL} (${GEMINI_API_VERSION})`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        success: true,
        message: `Connected to Google Gemini (${GEMINI_MODEL})!`,
        model: GEMINI_MODEL
      }));

    } catch (err) {
      console.error('[RetroZen] Error in /api/set-key:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });
}

/**
 * Handle POST /api/gemini
 */
async function handleGemini(req, res) {
  let body = '';
  req.on('data', chunk => {
    body += chunk;
    if (body.length > 500000) {
      req.connection.destroy();
    }
  });

  req.on('end', async () => {
    try {
      const parsed = JSON.parse(body || '{}');
      const userPrompt = (parsed.prompt || '').trim();

      if (!userPrompt) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: false,
          error: 'Please enter a message or question.'
        }));
      }

      // 1. Detect if user pasted an API key directly into the chat
      if (/^AIza[0-9A-Za-z-_]{30,}$/.test(userPrompt)) {
        const discovery = await discoverAndVerifyGeminiKey(userPrompt);
        if (discovery.ok) {
          GEMINI_MODEL = discovery.model;
          GEMINI_API_VERSION = discovery.version;
          saveApiKeyToFile(userPrompt, discovery.model, discovery.version);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            text: `✨ **Google Gemini Key Connected (${discovery.model})!**\n\nYour key has been verified with Google and saved to the server. I am now fully online as Google Gemini!\n\nYou can now ask me **anything** (science, history, coding, philosophy, trivia, stories) or ask for customized zen driving journeys. What's on your mind?`,
            trip: null,
            isMock: false,
            keyActivated: true
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            text: `⚠️ **Key Verification Failed**\n\nThe API key was rejected by Google:\n\`${discovery.error}\`\n\nPlease check your key at [Google AI Studio](https://aistudio.google.com/app/apikey).`,
            trip: null,
            needsKey: true,
            isMock: true
          }));
        }
      }

      const apiKey = (parsed.apiKey || '').trim() || (process.env.GEMINI_API_KEY || '').trim();

      // 2. If no valid key is configured
      if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
        const fallbackDrive = generateFallbackDrive(userPrompt);

        if (fallbackDrive) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            text: fallbackDrive.text,
            trip: fallbackDrive.trip,
            recommendation: fallbackDrive.trip,
            isMock: true,
            info: "Offline Drive Suggestion. To chat about any topic with live Google Gemini, add your API key."
          }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            text: `🔑 **Live Google Gemini API Key Needed**\n\nI want to answer your question thoroughly! Right now, live Gemini conversation is inactive because an API key hasn't been added yet.\n\n### How to activate live Gemini in 30 seconds (Free):\n1. Click **[ 🔑 SET KEY ]** at the top of this drawer (or paste your \`AIzaSy...\` key directly into this chat!)\n2. Get a free key at [Google AI Studio (aistudio.google.com)](https://aistudio.google.com/app/apikey)\n\n*(Once connected, I will answer all your questions on any topic in detail!)*`,
            trip: null,
            recommendation: null,
            isMock: true,
            needsKey: true
          }));
        }
      }

      // 3. Build multi-turn chat contents
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
      contents.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });

      // 4. Call live Google Gemini API
      const geminiCall = await callGemini(apiKey, contents);

      if (!geminiCall.ok) {
        console.warn('[Gemini API Call Failed]', geminiCall.error);
        
        if (geminiCall.invalidKey) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({
            success: true,
            text: `⚠️ **Invalid Gemini API Key**\n\nGoogle rejected the API key with error:\n\`${geminiCall.error}\`\n\nPlease click **[ 🔑 SET KEY ]** above to update it with a valid key from [Google AI Studio](https://aistudio.google.com/app/apikey).`,
            trip: null,
            needsKey: true,
            isMock: true
          }));
        }

        const fallbackDrive = generateFallbackDrive(userPrompt);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({
          success: true,
          text: fallbackDrive ? fallbackDrive.text : `⚠️ **Gemini API Error:** ${geminiCall.error}`,
          trip: fallbackDrive ? fallbackDrive.trip : null,
          isMock: true,
          apiError: geminiCall.error
        }));
      }

      // 5. Extract response text and embedded zen-trip block
      const candidate = geminiCall.data.candidates?.[0];
      const rawText = candidate?.content?.parts?.[0]?.text || 'No response generated.';

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
        } catch (e) {
          // keep raw text if JSON parse fails
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        text: cleanText || rawText,
        trip: trip,
        recommendation: trip,
        isMock: false,
        model: geminiCall.model
      }));

    } catch (err) {
      console.error('[Server Error /api/gemini]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: false,
        error: err.message
      }));
    }
  });
}

/**
 * HTTP Server
 */
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Gemini API route
  if (pathname === '/api/gemini' && req.method === 'POST') {
    return handleGemini(req, res);
  }

  // Set API Key route
  if (pathname === '/api/set-key' && req.method === 'POST') {
    return handleSetKey(req, res);
  }

  // Health / API status route
  if (pathname === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'online',
      geminiConfigured: !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'),
      model: GEMINI_MODEL
    }));
  }

  // Static file serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Internal Server Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`\n=================================================`);
    console.log(`  🚗 RETROZEN DRIVING SERVER ONLINE`);
    console.log(`  URL: http://localhost:${portToTry}`);
    console.log(`  Gemini Key Configured: ${!!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here') ? 'YES' : 'NO (Key entry available in UI)'}`);
    console.log(`=================================================\n`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[Port ${portToTry} in use, trying ${portToTry + 1}...]`);
      startServer(portToTry + 1);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = server;
