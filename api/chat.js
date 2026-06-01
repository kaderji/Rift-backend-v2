const https = require('https');

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are RIFT, an alternate history engine. You ONLY answer questions about history, alternate history "what if" scenarios, historical events, civilisations, empires, wars, inventions, and their consequences.
If the user asks ANYTHING unrelated to history, respond ONLY with: "⚔ The archive only speaks of history. Ask me a what-if about the past."
Never break character. Be vivid, storytelling-focused, and detailed.`;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, image, mimeType } = req.body;
  if (!prompt && !image) return res.status(400).json({ error: 'No prompt provided' });

  const parts = [];
  if (image) parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: image } });
  parts.push({ text: prompt || 'Identify this historical image and give a what-if.' });

  const requestBody = JSON.stringify({
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts }],
    generationConfig: { maxOutputTokens: 1024, temperature: 0.9 }
  });

  return new Promise((resolve) => {
    const url = new URL(GEMINI_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(requestBody) }
    };
    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          res.status(200).json({ text });
        } catch (e) { res.status(500).json({ error: 'Parse error' }); }
        resolve();
      });
    });
    request.on('error', (e) => { res.status(500).json({ error: e.message }); resolve(); });
    request.write(requestBody);
    request.end();
  });
};
