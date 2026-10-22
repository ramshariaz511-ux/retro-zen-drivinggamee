module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const isConfigured = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';

  res.status(200).json({
    status: 'online',
    platform: 'vercel-serverless',
    geminiConfigured: isConfigured,
    model: model
  });
};
