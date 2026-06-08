export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { contents, systemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    // Format system instruction for REST API
    const body = {
      contents: contents,
      systemInstruction: systemInstruction ? {
        role: "system",
        parts: [{ text: systemInstruction }]
      } : undefined
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return res.status(response.status).json({ error: data.error?.message || 'Gemini API Error' });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      throw new Error("Empty response from AI");
    }

    res.status(200).json({ text });
  } catch (error) {
    console.error("Serverless Function Error:", error);
    res.status(500).json({ error: error.message || 'Unknown AI error' });
  }
}

