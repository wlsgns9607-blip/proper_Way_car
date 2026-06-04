const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Fix double backticks
c = c.replace(/``\/api\/naver-proxy/g, '`/api/naver-proxy');
c = c.replace(/state}``;/g, 'state}`;');
c = c.replace(/``\/api\/naver-openapi-proxy\/v1\/nid\/me``;/g, '`/api/naver-openapi-proxy/v1/nid/me`;');

c = c.replace(/``\/api\/kakao-proxy/g, '`/api/kakao-proxy');
c = c.replace(/toString\(\)}``;/g, 'toString()}`;');

const target = `            const profileUrl = \`https://kapi.kakao.com/v2/user/me\`;
            const proxyProfileUrl = \`/api/naver-openapi-proxy/v1/nid/me\`;
            
            const profileRes = await fetch(proxyProfileUrl, {
              headers: { Authorization: \`Bearer \${tokenData.access_token}\` }
            });`;

const replacement = `            const profileUrl = \`https://kapi.kakao.com/v2/user/me\`;
            const proxyProfileUrl = \`/api/kakao-openapi-proxy/v2/user/me\`;
            
            const profileRes = await fetch(proxyProfileUrl, {
              headers: { 
                Authorization: \`Bearer \${tokenData.access_token}\`,
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
              }
            });`;

c = c.replace(target, replacement);

fs.writeFileSync('src/App.tsx', c);
