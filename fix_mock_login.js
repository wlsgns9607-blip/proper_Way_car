const fs = require('fs');
let c = fs.readFileSync('src/App.tsx', 'utf8');

const naverRegex = /const handleNaverLogin = async \(\) => \{[\s\S]*?catch \(err: any\) \{[\s\S]*?alert\("네이버 로그인 초기화에 실패했습니다: " \+ err\.message\);\n\s*\}\n\s*\};/g;

const kakaoRegex = /const handleKakaoLogin = async \(\) => \{[\s\S]*?catch \(err: any\) \{[\s\S]*?alert\("카카오 로그인 초기화에 실패했습니다: " \+ err\.message\);\n\s*\}\n\s*\};/g;

// Fallback regex if the Korean characters are messed up
const fallbackNaver = /const handleNaverLogin = async \(\) => \{[\s\S]*?window\.open\(url, 'naver_oauth_popup'[\s\S]*?\}\n\s*\};/g;
const fallbackKakao = /const handleKakaoLogin = async \(\) => \{[\s\S]*?window\.open\(url, 'kakao_oauth_popup'[\s\S]*?\}\n\s*\};/g;

const mockNaver = `const handleNaverLogin = async () => {
    if (loading) return;
    setLoading(true);
    // 포트폴리오용 가짜(Mock) 로그인 처리
    setTimeout(() => {
      if (onLogin) {
        onLogin({
          uid: 'mock_naver_' + Math.random().toString(36).substr(2, 9),
          name: '네이버 유저 (테스트)',
          email: 'naver_test@naver.com',
          provider: 'naver',
          createdAt: new Date()
        });
      }
      setLoading(false);
    }, 800);
  };`;

const mockKakao = `const handleKakaoLogin = async () => {
    if (loading) return;
    setLoading(true);
    // 포트폴리오용 가짜(Mock) 로그인 처리
    setTimeout(() => {
      if (onLogin) {
        onLogin({
          uid: 'mock_kakao_' + Math.random().toString(36).substr(2, 9),
          name: '카카오 유저 (테스트)',
          email: 'kakao_test@kakao.com',
          provider: 'kakao',
          createdAt: new Date()
        });
      }
      setLoading(false);
    }, 800);
  };`;

c = c.replace(fallbackNaver, mockNaver);
c = c.replace(fallbackKakao, mockKakao);

fs.writeFileSync('src/App.tsx', c);
