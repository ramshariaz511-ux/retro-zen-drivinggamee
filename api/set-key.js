module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

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

  const apiKey = (parsed.apiKey || '').trim();
  if (!apiKey) {
    return res.status(400).json({ success: false, error: 'API key cannot be empty.' });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (response.ok && Array.isArray(data.models)) {
      process.env.GEMINI_API_KEY = apiKey;
      return res.status(200).json({
        success: true,
        message: 'Google Gemini API key verified and active!'
      });
    } else {
      return res.status(400).json({
        success: false,
        error: data.error?.message || 'Google rejected this API key.'
      });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
