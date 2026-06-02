const { GoogleGenAI } = require('@google/genai');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { contents, systemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const genAI = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const modelName = 'gemini-1.5-flash'; 
    const response = await genAI.models.generateContent({ 
      model: modelName,
      contents: contents,
      config: { systemInstruction: systemInstruction }
    });

    const text = response.text;
    res.status(200).json({ text });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Unknown AI error' });
  }
}

