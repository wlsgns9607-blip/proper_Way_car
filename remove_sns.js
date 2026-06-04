const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

// Remove Naver Login Handler
c = c.replace(/const handleNaverLogin = async \(\) => \{[\s\S]*?catch \(err: any\) \{[\s\S]*?\}\n\s*\};\n/g, '');

// Remove Kakao Login Handler
c = c.replace(/const handleKakaoLogin = async \(\) => \{[\s\S]*?catch \(err: any\) \{[\s\S]*?\}\n\s*\};\n/g, '');
// Fallback if the regex missed because of missing catch block? Kakao handler might not have a catch block in this snippet?
// Let's just use string replacement for the handlers.
c = c.replace(/const handleNaverLogin = async \(\) => \{[\s\S]*?console\.error\("\[Auth\] Naver URL error:", err\);\n\s*alert\([\s\S]*?\);\n\s*\}\n\s*\};\n*/g, '');
c = c.replace(/const handleKakaoLogin = async \(\) => \{[\s\S]*?window\.open\(url, 'kakao_oauth_popup', `width=\$\{width\},height=\$\{height\},left=\$\{left\},top=\$\{top\}`\);\n\s*catch[\s\S]*?\}\n\s*\};\n*/g, '');
// Or even simpler:
c = c.replace(/const handleNaverLogin = async \(\) => \{[\s\S]*?window\.open\(url, 'naver_oauth_popup'[\s\S]*?\}\n\s*\};/g, '');
c = c.replace(/const handleKakaoLogin = async \(\) => \{[\s\S]*?window\.open\(url, 'kakao_oauth_popup'[\s\S]*?\}\n\s*\};/g, '');


// Remove the buttons from JSX
c = c.replace(/<button\s*type="button"\s*onClick=\{handleNaverLogin\}[\s\S]*?<\/button>/g, '');
c = c.replace(/<button\s*type="button"\s*onClick=\{handleKakaoLogin\}[\s\S]*?<\/button>/g, '');

fs.writeFileSync('src/App.tsx', c);
