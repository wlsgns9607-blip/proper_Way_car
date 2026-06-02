export default function handler(req: any, res: any) {
  const clientId = process.env.VITE_NAVER_CLIENT_ID || process.env.NAVER_CLIENT_ID;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirectUri = \\://\System.Management.Automation.Internal.Host.InternalHost/api/auth/naver/callback\;

  if (!clientId) {
    return res.status(400).json({ error: '네이버 Client ID가 설정되지 않았습니다.' });
  }

  const state = Math.random().toString(36).substring(7);
  const naverAuthUrl = \https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=\&redirect_uri=\&state=\\;

  res.status(200).json({ url: naverAuthUrl });
}

