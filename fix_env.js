const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

c = c.replace(
  'const clientId = import.meta.env.VITE_NAVER_CLIENT_ID;',
  "const clientId = import.meta.env.VITE_NAVER_CLIENT_ID || 'YvjDJahZ9cHp3Bd8CG72';"
);
c = c.replace(
  'const clientSecret = import.meta.env.VITE_NAVER_CLIENT_SECRET || import.meta.env.NAVER_CLIENT_SECRET;',
  "const clientSecret = import.meta.env.VITE_NAVER_CLIENT_SECRET || import.meta.env.NAVER_CLIENT_SECRET || 'f3qAWzT2IM';"
);
c = c.replace(
  'const clientId = import.meta.env.VITE_KAKAO_CLIENT_ID || import.meta.env.KAKAO_REST_API_KEY;',
  "const clientId = import.meta.env.VITE_KAKAO_CLIENT_ID || import.meta.env.KAKAO_REST_API_KEY || 'c934ba91c61cc67f5a0c4f422b3717dc';"
);

fs.writeFileSync('src/App.tsx', c);
