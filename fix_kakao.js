const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const proxyProfileUrl = `\/api\/naver-openapi-proxy\/v1\/nid\/me`;[\s\S]*?const profileRes = await fetch\(proxyProfileUrl, \{[\s\S]*?headers: \{ Authorization: `Bearer \$\{tokenData\.access_token\}` \}[\s\S]*?\}\);/g;

const replacement = `const proxyProfileUrl = \`/api/kakao-openapi-proxy/v2/user/me\`;
            
            const profileRes = await fetch(proxyProfileUrl, {
              headers: { 
                Authorization: \`Bearer \${tokenData.access_token}\`,
                'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
              }
            });`;

c = c.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', c);
