module.exports = async function handler(req, res) {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(\<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '\' }, '*');window.close();</script>\);
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

    res.status(200).send(\<html><body><script>if (window.opener) { window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: \ }, '*'); window.close(); } else { window.location.href = '/'; }</script></body></html>\);
  } catch (err) {
    res.status(500).send(\<script>window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: '\' }, '*');window.close();</script>\);
  }
}

