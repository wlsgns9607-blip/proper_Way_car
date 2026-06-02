import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes go here FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Naver OAuth Routes
app.get("/api/auth/naver/url", (req, res) => {
  const clientId = process.env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  
  // Get external redirect URI correctly in proxy environment
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/naver/callback`;

  if (!clientId) {
    console.error("[Auth] Naver Client ID is missing in environment variables");
    return res.status(400).json({ error: "네이버 Client ID가 설정되지 않았습니다. 설정을 확인해주세요." });
  }

  const state = Math.random().toString(36).substring(7);
  const naverAuthUrl = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  console.log(`[Auth] Generated Naver URL with Redirect URI: ${redirectUri}`);
  res.json({ url: naverAuthUrl });
});

app.get("/api/auth/naver/callback", async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, '*');
        window.close();
      </script>
    `);
  }

  const clientId = process.env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET || process.env.VITE_NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).send("Naver OAuth credentials missing on server");
  }

  try {
    // 1. Exchange code for access token
    const tokenUrl = `https://nid.naver.com/oauth2.0/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${code}&state=${state}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // 2. Fetch user profile
    const profileRes = await fetch("https://openapi.naver.com/v1/nid/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const profileData = await profileRes.json();

    if (profileData.resultcode !== "00") {
      throw new Error(profileData.message || "Failed to fetch Naver profile");
    }

    const user = {
      id: profileData.response.id,
      email: profileData.response.email,
      name: profileData.response.name,
      photoURL: profileData.response.profile_image,
      provider: 'naver'
    };

    // 3. Send success message to parent window
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(user)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Naver Auth Error:", err);
    res.send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err.message}' }, '*');
        window.close();
      </script>
    `);
  }
});

// Kakao OAuth Routes
app.get("/api/auth/kakao/url", (req, res) => {
  const clientId = process.env.VITE_KAKAO_CLIENT_ID || process.env.KAKAO_CLIENT_ID || process.env.KAKAO_REST_API_KEY;
  
  // Get external redirect URI correctly in proxy environment
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.get('host');
  const redirectUri = `${protocol}://${host}/api/auth/kakao/callback`;

  if (!clientId) {
    console.error("[Auth] Kakao Client ID is missing in environment variables");
    return res.status(400).json({ error: "카카오 REST API 키가 설정되지 않았습니다. 설정을 확인해주세요." });
  }

  const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  console.log(`[Auth] Generated Kakao URL with Redirect URI: ${redirectUri}`);
  res.json({ url: kakaoAuthUrl });
});

app.get("/api/auth/kakao/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${error}' }, '*');
        window.close();
      </script>
    `);
  }

  const clientId = process.env.VITE_KAKAO_CLIENT_ID || process.env.KAKAO_CLIENT_ID || process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET || process.env.VITE_KAKAO_CLIENT_SECRET;

  if (!clientId) {
    return res.status(500).send("Kakao OAuth credentials missing on server");
  }

  try {
    // 1. Exchange code for access token
    const tokenUrl = "https://kauth.kakao.com/oauth/token";
    
    // Determine the redirect URI used in the authorize step
    // In AI Studio, we must match the EXACT URL registered in Kakao console
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const redirectUri = `${protocol}://${host}/api/auth/kakao/callback`;

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('client_id', clientId);
    if (clientSecret) params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('code', code as string);

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: params
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      throw new Error(tokenData.error_description || tokenData.error);
    }

    // 2. Fetch user profile
    const profileRes = await fetch("https://kapi.kakao.com/v2/user/me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
    });
    const profileData = await profileRes.json();

    const user = {
      id: profileData.id,
      email: profileData.kakao_account?.email,
      name: profileData.kakao_account?.profile?.nickname,
      photoURL: profileData.kakao_account?.profile?.profile_image_url,
      provider: 'kakao'
    };

    // 3. Send success message
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(user)} 
              }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Kakao Auth Error:", err);
    res.send(`
      <script>
        window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '${err.message}' }, '*');
        window.close();
      </script>
    `);
  }
});

// Gemini API Route
app.post("/api/chat", async (req, res) => {
  const { contents, systemInstruction } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  try {
    const genAI = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Use gemini-1.5-flash which is widely supported and stable
    const modelName = "gemini-1.5-flash"; 

    console.log(`[AI] Calling Gemini with model: ${modelName}`);

    const response = await genAI.models.generateContent({ 
      model: modelName,
      contents: contents,
      config: {
        systemInstruction: systemInstruction 
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI returned an empty response.");
    }

    res.json({ text });
  } catch (error: any) {
    console.error("Gemini Error Detail:", error);
    // Return a more structured error so the client can handle it
    res.status(error.status || 500).json({ 
      error: error.message,
      code: error.code || 'UNKNOWN'
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
