import express from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Naver OAuth Routes
app.get('/api/auth/naver/url', (req, res) => {
  const clientId = process.env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = \\://\System.Management.Automation.Internal.Host.InternalHost/api/auth/naver/callback\;

  if (!clientId) {
    return res.status(400).json({ error: '네이버 Client ID가 설정되지 않았습니다.' });
  }

  const state = Math.random().toString(36).substring(7);
  const naverAuthUrl = \https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=\&redirect_uri=\&state=\\;

  res.json({ url: naverAuthUrl });
});

app.get('/api/auth/naver/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(\<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '\' }, '*');window.close();</script>\);
  }

  const clientId = process.env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET || process.env.VITE_NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send('Naver OAuth credentials missing on server');
  }

  try {
    const tokenUrl = \https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=\&client_secret=\&code=\&state=\\;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: \Bearer \\ },
    });
    const profileData = await profileRes.json();

    if (profileData.resultcode !== '00') {
      throw new Error(profileData.message || 'Failed to fetch Naver profile');
    }

    const user = {
      id: profileData.response.id,
      email: profileData.response.email,
      name: profileData.response.name,
      photoURL: profileData.response.profile_image,
      provider: 'naver'
    };

    res.send(\<html><body><script>if (window.opener) { window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: \ }, '*'); window.close(); } else { window.location.href = '/'; }</script></body></html>\);
  } catch (err: any) {
    res.send(\<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '\' }, '*');window.close();</script>\);
  }
});

app.post('/api/chat', async (req, res) => {
  const { contents, systemInstruction } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured' });
  }

  try {
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
    if (!text) {
      throw new Error('AI returned an empty response.');
    }

    res.json({ text });
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message, code: error.code || 'UNKNOWN' });
  }
});

export default app;

