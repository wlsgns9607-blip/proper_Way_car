module.exports = function handler(req, res) {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'api연결안됬읍니다' });
  }
  res.status(200).json({ status: 'ok' });
}
