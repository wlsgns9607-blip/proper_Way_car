import { useState, useEffect, useRef } from 'react';
import { 
  LogIn, 
  UserPlus, 
  Navigation, 
  CloudSun, 
  Search, 
  Star, 
  Bell, 
  MessageCircle, 
  MessageSquare,
  Home, 
  HelpCircle,
  LogOut,
  ChevronLeft,
  X,
  User,
  Users,
  Menu,
  UserCog,
  RefreshCw,
  Calendar,
  Phone,
  Car,
  Lightbulb,
  ShieldCheck,
  Send,
  Mic,
  Volume2,
  Camera,
  Plus,
  Sparkles,
  BookOpen,
  ArrowLeft,
  MapPin,
  ChevronRight,
  Cloud,
  Image as ImageIcon,
  ShoppingBag,
  Droplet,
  Droplets,
  Check,
  ArrowRight,
  Target,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, isFirebaseEnabled } from './lib/firebase';
export { db };
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  onSnapshot, 
  getDocFromServer,
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  limit, 
  Timestamp 
} from 'firebase/firestore';
import type { UserProfile, AppState, ChatMessage } from './types';
import Markdown from 'react-markdown';
import { ReviewMatrix } from './components/ReviewMatrix';

const callAI = async (contents: any[], systemInstruction: string) => {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, systemInstruction })
    });
    
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Server Error (${res.status})`);
    }
    
    return data;
  } catch (err: any) {
    console.error("AI Proxy Error:", err);
    throw err;
  }
};

const speak = (text: string) => {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'ko-KR';
  window.speechSynthesis.speak(msg);
};

// Global Animation Variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const;

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
} as const;

export const OWNER_EMAIL = 'wlsgns9607@gmail.com';

export default function App() {
  const [state, setState] = useState<AppState & { isOffline?: boolean; pendingPhoto?: File | null }>(() => {
    const savedDemoUser = typeof window !== 'undefined' ? localStorage.getItem('demo_user') : null;
    let initialUser = null;
    if (savedDemoUser) {
      try {
        initialUser = JSON.parse(savedDemoUser);
      } catch {
        // Ignore
      }
    }
    return {
      user: initialUser,
      loading: true,
      view: 'home',
      modal: 'none',
      adminActiveSessionUid: null,
      pendingModal: null,
      isOffline: false,
    };
  });
  const [pendingProvider, setPendingProvider] = useState<'naver' | 'kakao' | null>(null);

  useEffect(() => {
    // Check firestore availability with a timeout
    const checkConnection = async () => {
      if (!db) {
        setState(prev => ({ ...prev, isOffline: true, loading: false }));
        return;
      }
      const timeoutId = setTimeout(() => {
        setState(prev => ({ ...prev, isOffline: true, loading: false }));
      }, 4000); // 4 second safety timeout (reduced for better UX)

      try {
        // Use getDocFromServer to bypass local cache for reality check
        await getDocFromServer(doc(db, 'test', 'connection'));
        setState(prev => ({ ...prev, isOffline: false, loading: false }));
      } catch (error: any) {
        console.warn("[Firestore] Connection check failed/unavailable:", error.code);
        setState(prev => ({ ...prev, isOffline: true, loading: false }));
      } finally {
        clearTimeout(timeoutId);
      }
    };
    checkConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // 1. 즉시 UI 업데이트 (기본 정보로 먼저 전환하여 대기 시간 최소화)
        const initialUser: UserProfile = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || (firebaseUser as any).name || '사용자',
          email: firebaseUser.email || '',
          createdAt: new Date().toISOString(),
        };

        // Transition immediately
        setState(prev => ({ 
          ...prev, 
          user: initialUser, 
          loading: false,
          view: prev.view === 'auth' ? 'home' : prev.view,
          modal: prev.view === 'auth' ? (prev.pendingModal || 'login_success') as any : prev.modal,
          pendingModal: prev.view === 'auth' ? null : prev.pendingModal
        }));

        // 2. 백그라운드에서 Firestore 데이터 동기화 (비차단)
        if (db) {
          (async () => {
             try {
                // Use a race to avoid hanging on profile fetch if unavailable
                const profilePromise = getDoc(doc(db, 'users', firebaseUser.uid));
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject('timeout'), 3000));
                
                const userDoc = await Promise.race([profilePromise, timeoutPromise]) as any;
                let userData: UserProfile;
                
                if (userDoc && userDoc.exists()) {
                  userData = userDoc.data() as UserProfile;
                } else {
                  userData = {
                    ...initialUser,
                    createdAt: serverTimestamp(),
                  };
                  await setDoc(doc(db, 'users', firebaseUser.uid), userData).catch(e => {
                    console.error("[Auth] User creation error:", e);
                  });
                }
                setState(prev => ({ ...prev, user: userData }));
             } catch (error) {
                console.error("[Auth] Profile fetch skipped (timeout or error):", error);
             }
          })();
        }
      } else {
        const savedUser = localStorage.getItem('demo_user');
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            setState(prev => ({ ...prev, user: userData, loading: false }));
          } catch {
            setState(prev => ({ ...prev, user: null, loading: false }));
          }
        } else {
          setState(prev => ({ ...prev, user: null, loading: false }));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const handleActualLogout = async () => {
    await signOut(auth);
    localStorage.removeItem('demo_user');
    setState(prev => ({ ...prev, view: 'home', user: null, modal: 'none' }));
  };

  useEffect(() => {
    // Security check: Only the owner can see the admin/practitioner dashboard
    if (state.view.includes('dashboard') && state.user && state.user.email !== OWNER_EMAIL) {
      console.warn('Unauthorized access attempt to dashboard filtered.');
      setView('home');
    }
  }, [state.view, state.user]);

  if (state.loading) {
    return (
      <div className="h-screen w-full bg-[#f8fafc] flex justify-center items-center">
        <div className="flex flex-col items-center gap-6 px-10 text-center">
          <div className="relative">
            <motion.div 
               animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
               transition={{ repeat: Infinity, duration: 2 }}
               className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center shadow-inner"
            >
              <RefreshCw className="animate-spin text-emerald-500" size={40} />
            </motion.div>
          </div>
          <div className="space-y-2">
            <p className="font-black text-slate-800 text-xl tracking-tight leading-none">
              {state.isOffline ? "서버에 연결할 수 없습니다" : "안전하게 연결 중입니다"}
            </p>
            <p className="text-slate-400 text-[13px] font-bold">
              {state.isOffline 
                ? "현재 오프라인 모드로 시도 중입니다. 일부 기능이 제한될 수 있습니다." 
                : "최적의 세차 정보를 불러오고 있습니다."}
            </p>
          </div>
          {state.isOffline && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setState(prev => ({ ...prev, loading: false }))}
              className="mt-4 px-6 py-2 bg-emerald-500 text-white rounded-full font-bold text-sm shadow-lg shadow-emerald-200"
            >
              로그인 없이 시작하기
            </motion.button>
          )}
        </div>
      </div>
    );
  }

  const setView = (v: any) => setState(prev => ({ ...prev, view: v }));
  const setModal = (m: any) => setState(prev => ({ ...prev, modal: m }));

  const findNearbyCarWash = (provider: 'naver' | 'kakao') => {
    setPendingProvider(provider);
    setModal('location_permission');
  };

  const handleGrantPermission = () => {
    const provider = pendingProvider;
    setModal('searching_splash'); // Show searching splash
    setPendingProvider(null);
    
    // Auto-close after 5 seconds
    setTimeout(() => {
      setModal('none');
    }, 5000);
    
    if (!provider) return;
    
    if (!navigator.geolocation) {
      alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        let url = '';
        if (provider === 'naver') {
          // Modern Naver Map search URL with coordinates to center the search on user's location
          url = `https://map.naver.com/v5/search/${encodeURIComponent('세차장')}?c=${longitude},${latitude},15,0,0,0,dh`;
        } else {
          // Kakao Map search URL - using coordinate-based search if possible or standard link
          url = `https://map.kakao.com/link/search/${encodeURIComponent('세차장')}?location=${latitude},${longitude}`;
        }
        window.open(url, '_blank');
        setModal('none'); // Close splash when done
      },
      (error) => {
        console.error("GPS error:", error);
        setModal('none'); // Close splash on error
        const errorMsg = error.code === 1 
          ? "위치 권한이 거부되었습니다. 설정에서 브라우저의 위치 권한을 허용해주세요." 
          : "위치 정보를 가져오는데 실패했습니다. (오류: " + error.message + ")";
        alert(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const renderView = () => {
    switch (state.view) {
      case 'home': return <HomeScreen user={state.user} setView={setView} onOpenService={() => setModal('service_choice')} setState={setState} state={state} />;
      case 'auth': return <AuthScreen onLogin={(u) => {
        const nextModal = (state as any).pendingModal || 'login_success';
        setState(prev => ({ ...prev, user: u, view: 'home', modal: nextModal as any, pendingModal: null }));
      }} />;
    case 'chat': return <ChatScreen user={state.user} onBack={() => setView('home')} onPhoto={() => setView('photo_upload_ai')} onPhotoSelect={(f) => setState(prev => ({...prev, view: 'photo_upload_ai', pendingPhoto: f}))} title="AI세차전문가한테 물어보세요!!" allowAutoAI={true} chatType="ai" onNavigateToGuide={() => setView('guide')} />;
    case 'guide_query': {
      if (!state.user && !state.loading) {
        return <AuthScreen onLogin={(u) => {
          const nextModal = (state as any).pendingModal || 'login_success';
          setState(prev => ({ ...prev, user: u, view: 'guide_query', modal: nextModal as any, pendingModal: null }));
        }} />;
      }
      return (
        <ChatScreen 
          user={state.user} 
          onBack={() => setView('home')} 
          onPhoto={() => setView('photo_upload_expert')} 
          onPhotoSelect={(f) => setState(prev => ({...prev, view: 'photo_upload_expert', pendingPhoto: f}))}
          title="궁금하신점은 무엇입니까~" 
          placeholder="궁금한것을 물어 보세요!!" 
          allowAutoAI={false} 
          chatType="expert" 
          overrideSessionId={state.adminActiveSessionUid}
        />
      );
    }

    case 'guide': return <ExpertGuideScreen onBack={() => setView('home')} />;
    case 'admin_dashboard': {
      if (!state.loading && state.user?.email !== OWNER_EMAIL) {
        return <HomeScreen user={state.user} setView={setView} onOpenService={() => setModal('service_choice')} setState={setState} state={state} />;
      }
      return (
        <ExpertAdminDashboard 
          user={state.user} 
          onBack={() => setView('home')} 
          onSelectSession={(uid) => setState(prev => ({ ...prev, adminActiveSessionUid: uid, view: 'guide_query' }))} 
        />
      );
    }
    case 'photo_upload_ai': return <PhotoUploadScreen user={state.user} onBack={() => { setState(prev => ({...prev, pendingPhoto: null})); setView('chat'); }} title="AI 세차 분석" chatType="ai" initialFile={state.pendingPhoto} />;
    case 'photo_upload_expert': return <PhotoUploadScreen user={state.user} onBack={() => { setState(prev => ({...prev, pendingPhoto: null})); setView('guide_query'); }} title={state.adminActiveSessionUid ? "전문가 답변란" : "전문가의 답변"} disableAI chatType="expert" overrideSessionId={state.adminActiveSessionUid} initialFile={state.pendingPhoto} />;
    case 'review_matrix': return <ReviewMatrix onBack={() => setView('home')} user={state.user} />;
    default: return <HomeScreen user={state.user} setView={setView} onOpenService={() => setModal('service_choice')} setState={setState} state={state} />;
  }
};

  return (
    <div className="h-screen w-full bg-slate-900 flex justify-center items-center font-sans text-slate-900 selection:bg-emerald-100 overflow-hidden relative">
      {/* Dynamic Background for Desktop Portfolio */}
      <div className="absolute inset-0 z-0 overflow-hidden hidden md:block">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, -5, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 2 }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-blue-500/10 rounded-full blur-[140px]" 
        />
      </div>

      {/* Main Container - Responsive expansion for tablet/desktop portfolio view */}
      <div className="h-full w-full max-w-[480px] md:max-w-[85%] lg:max-w-[70%] xl:max-w-[60%] bg-white flex flex-col shadow-2xl relative overflow-hidden transition-all duration-500 z-10 border-x border-white/10 md:h-[95vh] md:rounded-[3.5rem]">
        
        {!isFirebaseEnabled ? (
          <div className="bg-slate-800 text-white text-[10px] font-black py-1 px-4 text-center z-[100] flex items-center justify-center gap-2 pt-safe">
            <Target size={10} />
            데모 모드 실행 중 (Firebase 설정 대기)
          </div>
        ) : state.isOffline ? (
          <div className="bg-orange-500 text-white text-[10px] font-black py-1 px-4 text-center z-[100] flex items-center justify-center gap-2 pt-safe">
            <RefreshCw size={10} className="animate-spin" />
            실시간 데이터 연동 지연 (오프라인 모드)
          </div>
        ) : null}

        {/* Header removed as requested */}

      {/* Content Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={state.view}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ 
              type: "spring",
              stiffness: 300,
              damping: 30
            }}
            className="h-full w-full overflow-y-auto"
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Global Nav */}
      {state.view !== 'auth' && state.view !== 'home' && !state.view.startsWith('photo_upload') && !state.view.includes('dashboard') && (
        <nav className="bg-[#f5f0e1] border-t border-slate-200 px-8 py-4 flex justify-between items-center pb-safe-8 md:pb-8 sticky bottom-0 z-50">
          <style dangerouslySetInnerHTML={{ __html: `
            .pb-safe-8 { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 2rem); }
          ` }} />
          <NavTab 
            icon={state.view === 'chat' ? <UserCog size={28} className="text-slate-900" /> : <Sparkles size={28} className="text-slate-500" />} 
            label={state.view === 'chat' ? "전문가" : "AI세차박사"} 
            active={state.view === 'chat'} 
            onClick={() => state.view === 'chat' ? setView('guide') : setView('chat')} 
          />
          <NavTab icon={<Home size={34} strokeWidth={2.5} className={(state.view as string) === 'home' ? 'text-slate-900' : 'text-slate-500'} />} label="Home" active={(state.view as string) === 'home'} onClick={() => setView('home')} />
          <NavTab 
            icon={state.view === 'guide_query' ? <UserCog size={28} className="text-slate-900" /> : <MessageCircle size={28} className="text-slate-500" />} 
            label={state.view === 'guide_query' ? "실무자의 노하우" : "궁금하신점"} 
            active={(state.view as string) === 'guide_query'} 
            onClick={() => state.view === 'guide_query' ? setView('guide') : setView('guide_query')} 
          />
        </nav>
      )}

        {/* Global Modals */}
        <AnimatePresence>
          {state.modal === 'service_choice' && (
            <div className="absolute inset-0 z-[200] flex items-center justify-center p-6 text-center">
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setModal('none')}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white w-full rounded-2xl p-6 relative z-10 flex flex-col gap-4 shadow-2xl"
              >
                <div className="flex flex-col text-center gap-1 mb-2">
                  <h3 className="font-bold text-slate-800 text-lg">세차 서비스를 선택해주세요</h3>
                  <p className="text-slate-500 text-xs text-center">주변 세차장을 검색할 앱을 선택합니다.</p>
                </div>
                <button 
                  onClick={() => findNearbyCarWash('naver')}
                  className="bg-[#03C75A] text-white py-4 rounded-xl flex items-center justify-center gap-3 font-bold shadow-lg active:scale-95 transition-transform"
                >
                  네이버 지도로 찾기
                </button>
                <button 
                  onClick={() => findNearbyCarWash('kakao')}
                  className="bg-[#FEE500] text-[#3c1e1e] py-4 rounded-xl flex items-center justify-center gap-3 font-bold shadow-lg active:scale-95 transition-transform"
                >
                  카카오맵으로 찾기
                </button>
                <button 
                  onClick={() => setModal('none')}
                  className="text-slate-400 text-sm font-medium mt-2"
                >
                  취소
                </button>
              </motion.div>
            </div>
          )}

          {state.modal === 'location_permission' && (
             <div className="absolute inset-0 z-[300] flex items-center justify-center p-8">
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setModal('none')}
                  className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                />
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white w-[300px] rounded-[1.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col items-center pt-8 pb-6 px-10"
                >
                   <button 
                     onClick={() => setModal('none')}
                     className="absolute top-4 right-4 text-red-500 hover:scale-110 transition-transform"
                   >
                      <X size={20} />
                   </button>

                   <div className="mb-6 relative">
                      <div className="w-2.5 h-2.5 bg-red-600 rounded-full" />
                      <div className="absolute -inset-1.5 bg-red-600/20 rounded-full animate-ping" />
                   </div>

                   <p className="text-[15px] font-medium text-slate-700 text-center leading-relaxed mb-10 whitespace-pre-line">
                      현 위치를 기반으로{"\n"}가까운 세차장을 찾아드릴까요?
                   </p>

                   <div className="w-full flex justify-end">
                      <button 
                        onClick={handleGrantPermission}
                        className="bg-[#b3f9d3] px-8 py-2.5 rounded-2xl text-[14px] font-black text-slate-900 shadow-sm active:scale-95 transition-transform"
                      >
                         OK
                      </button>
                   </div>
                </motion.div>
             </div>
          )}

          {state.modal === 'searching_splash' && (
             <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }}
               className="absolute inset-0 z-[400] bg-white"
             >
                <SplashScreen onDismiss={() => setModal('none')} />
             </motion.div>
          )}

          {state.modal === 'vehicle_config' && (
            <VehicleConfigModal 
              user={state.user} 
              onClose={() => setModal('none')} 
              onSave={(updatedUser) => {
                setState(prev => ({ ...prev, user: updatedUser, modal: 'login_success' }));
                alert("차량 정보가 저장되었습니다! AI가 이를 바탕으로 답변해 드릴게요.");
              }}
              onAuthRequired={() => {
                 setState(prev => ({ ...prev, modal: 'none', view: 'auth', pendingModal: 'vehicle_config' }));
              }}
            />
          )}

          {state.modal === 'logout_confirm' && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center p-8">
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 onClick={() => setModal('none')}
                 className="absolute inset-0 bg-black/40 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0, y: 20 }}
                 animate={{ scale: 1, opacity: 1, y: 0 }}
                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
                 className="bg-white w-[300px] rounded-[2rem] border-[4px] border-[#1ea08a] shadow-2xl relative z-10 flex flex-col items-center pt-12 pb-10 px-8 text-center"
               >
                  {/* Icon Area */}
                  <div className="mb-8 relative">
                     <div className="w-24 h-24 rounded-full border-[6px] border-[#89d5c6] flex items-center justify-center bg-white">
                        <div className="w-14 h-14 rounded-xl border-[4px] border-[#1ea08a] flex items-center justify-center relative overflow-hidden">
                           {/* Exit Door Cutout effect */}
                           <div className="absolute right-0 top-0 bottom-0 w-3 bg-white z-10" />
                           <motion.div 
                             initial={{ x: -2 }}
                             animate={{ x: 2 }}
                             transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                             className="text-[#1ea08a] relative z-20 flex items-center"
                           >
                              <LogOut size={24} strokeWidth={4} />
                           </motion.div>
                        </div>
                     </div>
                  </div>

                  <h3 className="text-[22px] font-black text-slate-800 leading-tight mb-6">
                     로그아웃이 완료되<br/>었습니다
                  </h3>

                  <p className="text-[14px] font-bold text-[#8c746b] leading-relaxed mb-10">
                     안전하게 로그아웃되었습니<br/>다.<br/>다음에 또 만나요!
                  </p>

                  <button 
                    onClick={handleActualLogout}
                    className="w-full bg-[#1e293b] py-5 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-xl shadow-lg active:scale-95 transition-all"
                  >
                     <div className="w-6 h-6 rounded-full border-[3px] border-[#1ea08a] flex items-center justify-center bg-[#1ea08a]/10">
                        <motion.div 
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          className="w-2.5 h-1.5 border-b-[3px] border-l-[3px] border-[#1ea08a] -rotate-45 -translate-y-0.5"
                        />
                     </div>
                     <span>확인</span>
                  </button>
               </motion.div>
            </div>
          )}

          {state.modal === 'login_success' && (
            <div className="absolute inset-0 z-[600] flex items-center justify-center p-8">
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 onClick={() => setModal('none')}
                 className="absolute inset-0 bg-black/5 backdrop-blur-sm"
               />
               <motion.div 
                 initial={{ scale: 0.9, opacity: 0, y: 20 }}
                 animate={{ scale: 1, opacity: 1, y: 0 }}
                 exit={{ scale: 0.9, opacity: 0, y: 20 }}
                 className="bg-white w-[300px] rounded-[3rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] relative z-10 flex flex-col items-center pt-10 pb-8 px-6 text-center"
               >
                  {/* Close Button X */}
                  <button onClick={() => setModal('none')} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} strokeWidth={2} />
                  </button>
                  
                  {/* Icon Area */}
                  <div className="mb-6 relative">
                     <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#00d2ff] to-[#0190a6] flex items-center justify-center shadow-lg relative border-[6px] border-[#effcfd]">
                        <div className="text-white">
                            <Droplet size={40} strokeWidth={3} fill="currentColor" />
                        </div>
                        <div className="absolute top-0 right-1 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-sm">
                          <Check size={16} strokeWidth={4} className="text-[#0190a6]" />
                        </div>
                     </div>
                  </div>

                  <h3 className="text-[22px] font-semibold tracking-tight text-[#1a202c] mb-4">
                     로그인 완료
                  </h3>

                  <p className="text-[14px] text-slate-500 font-medium leading-snug mb-10 text-center">
                     로그인이 완료되었습니다.<br/>
                     세차의 정석과 함께해 주셔서 감사합니다.
                  </p>

                  <button 
                    onClick={() => setModal('none')}
                    className="w-full bg-black py-4 rounded-xl flex items-center justify-center gap-2 text-white font-medium text-[16px] active:scale-95 transition-all mb-8 shadow-md"
                  >
                     <span>시작하기</span>
                     <ArrowRight size={18} strokeWidth={2} />
                  </button>
                  
                  <div className="text-[10px] font-bold tracking-[0.25em] text-[#d1d5db] uppercase">
                    Precision Standard
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>


      {/* Main Container */}
      </div>
    </div>
  );
}


function NavTab({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-emerald-600' : 'text-slate-500'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

// --- Screens ---

function LoadingScreen() { // Replaced by SplashScreen
  return null;
}

function VehicleConfigModal({ user, onClose, onSave, onAuthRequired }: { user: UserProfile | null, onClose: () => void, onSave: (u: UserProfile) => void, onAuthRequired?: () => void }) {
  const [brand, setBrand] = useState(user?.carModel?.split(' ')[0] || '');
  const [model, setModel] = useState(user?.carModel?.split(' ').slice(1).join(' ') || '');
  const [size, setSize] = useState(user?.carSize || '승용차');
  const [photoUrl, setPhotoUrl] = useState(user?.carPhotoUrl || '');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("사진 용량이 너무 큽니다. (2MB 이하 권장)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) {
      alert("차량 설정을 저장하려면 먼저 로그인이 필요합니다!");
      if (onAuthRequired) onAuthRequired();
      return;
    }
    setLoading(true);
    try {
      const fullModel = `${brand} ${model}`.trim();
      const updatedUser = { ...user, carModel: fullModel, carSize: size, carPhotoUrl: photoUrl };
      await setDoc(doc(db, 'users', user.uid), updatedUser, { merge: true }).catch(e => {
        handleFirestoreError(e, 'update', `users/${user.uid}`);
        throw e;
      });
      onSave(updatedUser);
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다. 권한이 없거나 네트워크 오류일 수 있습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[300] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-white w-full rounded-[2.5rem] overflow-hidden shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="p-7 pb-2 flex justify-between items-center">
          <h3 className="text-lg font-black text-slate-800">내 차량 설정</h3>
          <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-7 space-y-5">
          {/* Photo Upload Area */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 ml-1">나의 차량 사진</label>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-40 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-all overflow-hidden relative group"
            >
              {photoUrl ? (
                <>
                  <img src={photoUrl} alt="차량 사진" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="text-white" size={32} />
                  </div>
                </>
              ) : (
                <>
                  <Camera size={32} className="text-slate-300 mb-2" />
                  <span className="text-[11px] font-bold text-slate-400">사진을 등록하거나 촬영하세요</span>
                </>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              className="hidden" 
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1">1. 브랜드</label>
              <input 
                type="text" 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="예: 현대, 기아, 테슬라"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-[#1ea08a] transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1">2. 차량 크기</label>
              <div className="grid grid-cols-2 gap-2">
                {['경차', '승용차', 'SUV', '대형 SUV'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`py-3 rounded-2xl text-[11px] font-black border-2 transition-all ${
                      size === s 
                        ? 'bg-[#1ea08a] text-white border-transparent' 
                        : 'bg-white text-slate-400 border-slate-100'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 ml-1">3. 차량 이름 (모델명)</label>
              <input 
                type="text" 
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="예: 그랜저, 쏘렌토, 모델3"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none focus:border-[#1ea08a] transition-all"
              />
            </div>
          </div>

          <button 
            disabled={loading}
            onClick={handleSave}
            className="w-full bg-[#1ea08a] text-white py-4 rounded-2xl font-black text-base shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? "저장 중..." : "설정 완료"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function SplashScreen({ onDismiss }: { onDismiss?: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 5000;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(nextProgress);
      
      if (nextProgress >= 100) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-white relative px-8">
      {/* Close Button */}
      <button 
        onClick={onDismiss}
        className="absolute top-10 right-8 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={28} />
      </button>

      {/* Animation Circle */}
      <div className="relative mb-16">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-56 h-56 rounded-full border border-blue-50 flex items-center justify-center relative bg-gradient-to-b from-blue-50/10 to-transparent"
        >
          {/* Animated Ripples */}
          {[1, 2, 3].map((i) => (
             <motion.div 
               key={i}
               initial={{ scale: 0.8, opacity: 1 }}
               animate={{ scale: 1.5, opacity: 0 }}
               transition={{ repeat: Infinity, duration: 3, delay: i * 1 }}
               className="absolute inset-0 border border-blue-200 rounded-full"
             />
          ))}
          
          <div className="bg-white p-8 rounded-full shadow-2xl relative z-10 flex flex-col items-center gap-1">
             <div className="flex gap-1.5 mb-2">
                <div className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-bounce" />
                <div className="w-2.5 h-2.5 bg-blue-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2.5 h-2.5 bg-blue-200 rounded-full animate-bounce [animation-delay:0.4s]" />
             </div>
             <Car size={64} className="text-[#152e4d]" strokeWidth={2.5} />
          </div>
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-4 text-center max-w-[280px]">
        <h2 className="text-[#1a3a5f] font-black text-2xl tracking-tight">내 주변 세차장을 찾는 중...</h2>
        <p className="text-slate-400 text-[13px] font-medium leading-relaxed">
          가장 깨끗하고 가까운 세차 시설을<br/>탐색하고 있습니다.
        </p>
      </div>

      {/* Progress Bar Area */}
      <div className="mt-16 w-full max-w-[280px]">
         <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
            <motion.div 
              style={{ width: `${progress}%` }}
              className="h-full bg-blue-400"
            />
         </div>
         <div className="flex justify-between items-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
            <span>실시간 위치 확인</span>
            <span className="text-blue-500">{Math.floor(progress)}%</span>
         </div>
      </div>

      {/* Bottom Info Chips (Aesthetic) */}
      <div className="absolute bottom-20 w-full px-12 flex justify-center gap-4">
         <div className="bg-slate-50/80 px-4 py-3 rounded-2xl flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-300">
               <RefreshCw size={16} />
            </div>
            <div className="h-1.5 w-12 bg-slate-200 rounded-full" />
         </div>
         <div className="bg-slate-50/80 px-4 py-3 rounded-2xl flex items-center gap-3 flex-1">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-300">
               <MapPin size={16} />
            </div>
            <div className="h-1.5 w-12 bg-slate-200 rounded-full" />
         </div>
      </div>
    </div>
  );
}

function AuthScreen({ onLogin }: { onLogin: (u: UserProfile) => void }) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    birthDate: '',
    phoneNumber: '',
    carModel: '',
  });

  const handleGoogleLogin = async () => {
    if (loading) return;
    
    if (!isFirebaseEnabled) {
      alert("Firebase가 설정되지 않았습니다. 앱 설정에서 Firebase 환경 변수를 입력하거나 Firebase 설정을 완료해주세요.");
      return;
    }

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      console.log("[Auth] Starting Firebase Google Login Popup");
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      console.log("[Auth] Firebase Google Login Success:", user.email);
      
      // 즉시 onLogin 호출하여 부모 컴포넌트의 상태 전이 유도
      if (onLogin) {
        onLogin({
          uid: user.uid,
          name: user.displayName || '사용자',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          provider: 'google',
          createdAt: new Date()
        });
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        alert("팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.");
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log("[Auth] Popup closed by user");
      } else if (error.code === 'auth/operation-not-allowed') {
        alert("구글 로그인이 활성화되지 않았습니다. Firebase 콘솔에서 Google 인증을 활성화해야 합니다.");
      } else if (error.code === 'auth/unauthorized-domain') {
        alert("이 도메인은 승인된 도메인이 아닙니다. Firebase 콘솔에서 현재 도메인을 승인된 도메인에 추가해야 합니다.");
      } else {
        console.error("Firebase Google login error:", error.code, error.message);
        alert(`구글 로그인 실패: ${error.message} (${error.code})`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNaverLogin = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/naver/url');
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "네이버 로그인 초기화에 실패했습니다.");
      }
      
      const { url } = data;
      console.log("[Auth] Opening Naver login popup:", url);
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(url, 'naver_oauth_popup', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (err: any) {
      console.error("[Auth] Naver URL error:", err);
      if (err.message.includes("설정되지 않았습니다")) {
        alert("네이버 로그인이 활성화되지 않았습니다.\n\n앱 설정(Settings) 메뉴에서 VITE_NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET을 설정해주세요.");
      } else {
        alert("네이버 로그인 실패: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/kakao/url');
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "카카오 로그인 초기화에 실패했습니다.");
      }
      
      const { url } = data;
      console.log("[Auth] Opening Kakao login popup:", url);
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(url, 'kakao_oauth_popup', `width=${width},height=${height},left=${left},top=${top}`);
    } catch (err: any) {
      console.error("[Auth] Kakao URL error:", err);
      if (err.message.includes("설정되지 않았습니다")) {
        alert("카카오 로그인이 활성화되지 않았습니다.\n\n앱 설정(Settings) 메뉴에서 VITE_KAKAO_CLIENT_ID와 KAKAO_CLIENT_SECRET을 설정해주세요.");
      } else {
        alert("카카오 로그인 실패: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const user = event.data.user;
        onLogin({
          uid: `${user.provider}-${user.id}`,
          name: user.name || user.email?.split('@')[0] || '사용자',
          email: user.email || '',
          photoURL: user.photoURL,
          provider: user.provider,
          createdAt: new Date(),
        });
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        alert("소셜 로그인 실패: " + event.data.error);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!isFirebaseEnabled) {
      setLoading(true);
      setTimeout(() => {
        const demoProfile: UserProfile = {
          uid: 'demo-user',
          name: formData.name || '데모 사용자',
          email: formData.email,
          birthDate: formData.birthDate,
          phoneNumber: formData.phoneNumber,
          carModel: formData.carModel || '기아 EV6',
          createdAt: new Date(),
        };
        localStorage.setItem('demo_user', JSON.stringify(demoProfile));
        onLogin(demoProfile);
        setLoading(false);
      }, 800);
      return;
    }

    setLoading(true);
    if (mode === 'signup') {
      try {
        const result = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        
        const profile: UserProfile = {
          uid: result.user.uid,
          name: formData.name,
          email: formData.email,
          birthDate: formData.birthDate,
          phoneNumber: formData.phoneNumber,
          carModel: formData.carModel,
          createdAt: new Date().toISOString(),
        };

        // UI 즉시 업데이트
        onLogin(profile);

        if (db) {
          setDoc(doc(db, 'users', result.user.uid), {
            ...profile,
            createdAt: serverTimestamp()
          }).catch(e => {
            console.error("[Auth] User doc creation error:", e);
          });
        }
      } catch (error: any) {
         alert("회원가입 실패: " + error.message);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const result = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        
        const fallbackProfile: UserProfile = {
          uid: result.user.uid,
          name: result.user.displayName || '사용자',
          email: result.user.email || '',
          createdAt: new Date().toISOString(),
        };

        // UI 즉시 업데이트
        onLogin(fallbackProfile);

        if (db) {
          getDoc(doc(db, 'users', result.user.uid)).then(userDoc => {
            if (userDoc.exists()) {
              onLogin(userDoc.data() as UserProfile);
            }
          }).catch(e => {
            console.warn("[Auth] Background profile fetch failed:", e);
          });
        }
      } catch (error: any) {
        alert("로그인 실패: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col p-8 bg-white pt-safe-16 overflow-y-auto">
      <style dangerouslySetInnerHTML={{ __html: `.pt-safe-16 { padding-top: calc(env(safe-area-inset-top, 0px) + 4rem); }` }} />
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-800 whitespace-pre-line leading-snug">
          {mode === 'login' ? '반가워요!\n다시 돌아오셨네요' : '세차의 정석\n우리 함께 시작해요'}
        </h2>
        <p className="text-slate-400 text-sm mt-3 font-semibold">로그인을 통하여 더 많은 서비스를 만나보세요</p>
      </div>

      <motion.form 
        key={mode}
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        {mode === 'signup' && (
           <AuthInput 
             label="성명" 
             placeholder="예 : 홍길동" 
             value={formData.name}
             onChange={v => setFormData(prev => ({...prev, name: v}))}
           />
        )}
        
        <AuthInput 
          label="이메일 주소" 
          placeholder="name@example.com" 
          type="email"
          value={formData.email}
          onChange={v => setFormData(prev => ({...prev, email: v}))}
        />

        {mode === 'signup' && (
          <>
            <AuthInput 
              label="생년월일" 
              placeholder="예 : 030303" 
              value={formData.birthDate}
              onChange={v => setFormData(prev => ({...prev, birthDate: v}))}
            />
            <AuthInput 
              label="전화번호" 
              placeholder="예 : 01012345678" 
              value={formData.phoneNumber}
              onChange={v => setFormData(prev => ({...prev, phoneNumber: v}))}
            />
            <AuthInput 
              label="차종" 
              placeholder="예 : bmw3시리즈2015" 
              value={formData.carModel}
              onChange={v => setFormData(prev => ({...prev, carModel: v}))}
            />
          </>
        )}

        <AuthInput 
          label="비밀번호" 
          placeholder="비밀번호를 입력하세요" 
          type="password"
          value={formData.password}
          onChange={v => setFormData(prev => ({...prev, password: v}))}
        />

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#1ea08a] text-white font-black py-4 rounded-2xl text-lg shadow-xl shadow-emerald-100 hover:bg-[#1a8e7a] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중...' : (mode === 'login' ? '로그인' : '회원가입 완료')}
        </button>

        {mode === 'login' && (
          <div className="mt-8 flex flex-col gap-5">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
              <span className="relative bg-white px-4 text-[10px] text-slate-300 font-bold uppercase tracking-widest">Or Continue With</span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                type="button" onClick={handleGoogleLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 border border-slate-100 p-3.5 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  className="w-5 h-5" 
                  referrerPolicy="no-referrer" 
                />
                <span className="text-xs font-bold text-slate-600">Google Login</span>
              </button>

              <button 
                type="button"
                onClick={handleNaverLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[#03C75A] p-3.5 rounded-2xl hover:opacity-90 transition-opacity shadow-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-5 h-5 flex items-center justify-center bg-white rounded-sm">
                   <span className="text-[#03C75A] font-black text-[10px]">N</span>
                </div>
                <span className="text-xs font-bold text-white">Naver Login</span>
              </button>

              <button 
                type="button"
                onClick={handleKakaoLogin}
                disabled={loading}
                className="flex items-center justify-center gap-2 bg-[#FEE500] p-3.5 rounded-2xl hover:opacity-90 transition-opacity shadow-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-5 h-5 flex items-center justify-center text-[#3c1e1e]">
                   <MessageCircle size={14} fill="currentColor" />
                </div>
                <span className="text-xs font-bold text-[#3c1e1e]">Kakao Login</span>
              </button>
            </div>
          </div>
        )}

        <button 
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="mt-6 text-emerald-600 font-black text-sm underline underline-offset-4 decoration-emerald-200"
        >
          {mode === 'login' ? '아직 회원이 아니신가요? 회원가입' : '이미 계정이 있으신가요? 로그인'}
        </button>
      </motion.form>
    </div>
  );
}

function AuthInput({ label, placeholder, value, onChange, type = 'text' }: { label: string, placeholder: string, value: string, onChange: (v: string) => void, type?: string }) {
  return (
    <div className="flex flex-col gap-1.5 relative">
       <input 
         type={type}
         placeholder={placeholder}
         value={value}
         onChange={e => onChange(e.target.value)}
         className="w-full border border-slate-200 rounded-2xl py-4 px-5 text-sm font-bold focus:outline-none focus:border-emerald-400 focus:bg-emerald-50/10 transition-all placeholder:text-slate-300"
       />
       <span className="absolute left-4 -top-2 bg-white px-1 text-[10px] font-black text-slate-400">{label}</span>
    </div>
  );
}

function HomeScreen({ user, setView, onOpenService, setState, state }: { user: UserProfile | null, setView: (v: string) => void, onOpenService: () => void, setState: any, state: any }) {
  const [washIndex, setWashIndex] = useState(85);
  const [weatherData, setWeatherData] = useState<{ temp: number; icon: string; condition: string } | null>(null);
  const [forecastData, setForecastData] = useState<{ date: string; icon: string; maxTemp: number; minTemp: number }[]>([]);
  const [airQuality, setAirQuality] = useState<{ value: number; status: string } | null>(null);
  const [latestBadge, setLatestBadge] = useState<any>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [loadingBadge, setLoadingBadge] = useState(true);

  useEffect(() => {
    if (user && db) {
      const q = query(
        collection(db, 'reviews'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const latestReview = snapshot.docs[0].data();
          setLatestBadge(latestReview.badge || null);
        } else {
          setLatestBadge(null);
        }
        setLoadingBadge(false);
      }, (err) => {
        console.error("Badge fetch error:", err);
        setLoadingBadge(false);
      });
      
      return () => unsubscribe();
    } else {
      setLatestBadge(null);
      setLoadingBadge(false);
    }
  }, [user]);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        // Fetch weather with daily forecast
        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const weatherJson = await weatherRes.json();
        
        // Fetch air quality
        const airRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5`);
        const airJson = await airRes.json();

        const current = weatherJson?.current_weather;
        const pm25 = airJson?.current?.pm2_5 ?? 15;

        if (current) {
          setWeatherData({
            temp: Math.round(current.temperature),
            icon: current.weathercode <= 3 ? '☀️' : (current.weathercode <= 48 ? '☁️' : '🌧️'),
            condition: current.weathercode <= 3 ? '맑음' : (current.weathercode <= 48 ? '흐림' : '비/눈')
          });
        }

        // Parse daily forecast (next 5 days including today)
        if (weatherJson?.daily) {
          const days = weatherJson.daily.time.slice(0, 5).map((dateStr: string, idx: number) => {
            const code = weatherJson.daily.weathercode[idx];
            const date = new Date(dateStr);
            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            return {
              date: `${date.getMonth() + 1}/${date.getDate()}(${dayNames[date.getDay()]})`,
              icon: code <= 3 ? '☀️' : (code <= 48 ? '☁️' : '🌧️'),
              maxTemp: Math.round(weatherJson.daily.temperature_2m_max[idx]),
              minTemp: Math.round(weatherJson.daily.temperature_2m_min[idx])
            };
          });
          setForecastData(days);
        }
        
        // Air quality calculation (approximate PM2.5 status)
        let status = '좋음';
        if (pm25 > 75) status = '매우나쁨';
        else if (pm25 > 35) status = '나쁨';
        else if (pm25 > 15) status = '보통';
        
        setAirQuality({ value: Math.round(pm25), status });

        // Wash index calculation based on condition, forecast, and dust
        let index = 90; // Maximum possible is now 90%
        
        // 1. Current condition check
        if (current) {
          if (current.weathercode > 48) {
            index -= 70; // Rain / Snow / Storm right now
          } else if (current.weathercode > 3) {
            index -= 20; // Cloudy or Fog
          }
        }

        // 2. Forecast check (If it rains tomorrow or the day after, it's not a good day to wash)
        if (weatherJson?.daily?.weathercode) {
          const tomorrowCode = weatherJson.daily.weathercode[1];
          const dayAfterCode = weatherJson.daily.weathercode[2];
          
          if (tomorrowCode > 48) {
            index -= 50; // Rain expected tomorrow
          } else if (dayAfterCode > 48) {
            index -= 30; // Rain expected day after
          }
        }

        // 3. Air quality check
        if (pm25 > 75) {
          index -= 30; // Very bad air
        } else if (pm25 > 35) {
          index -= 15; // Bad air
        }
        
        setWashIndex(Math.min(90, Math.max(10, index)));
        setLoadingWeather(false);
      } catch (error) {
        console.warn("Weather fetch error - using fallback data", error);
        setWeatherData({
          temp: 26,
          icon: '☀️',
          condition: '맑음'
        });
        setAirQuality({
          value: 36,
          status: '나쁨'
        });
        setWashIndex(60); // Neutral fallback
        setLoadingWeather(false);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(37.5665, 126.9780), // Fallback to Seoul
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
      );
    } else {
      fetchWeather(37.5665, 126.9780);
    }

    // Refresh every 30 minutes
    const interval = setInterval(() => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
          () => fetchWeather(37.5665, 126.9780),
          { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
        );
      } else {
        fetchWeather(37.5665, 126.9780);
      }
    }, 1000 * 60 * 30);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#d1dada] overflow-hidden">
      {/* Top Navigation Header */}
      <div className="bg-[#1e293b] text-white px-6 py-4 pt-safe-4 flex items-center justify-between shadow-md z-10 shrink-0">
        <style dangerouslySetInnerHTML={{ __html: `
          .pt-safe-4 { padding-top: calc(env(safe-area-inset-top, 0px) + 1rem); }
        ` }} />
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl border-[1.5px] border-white flex flex-col items-center justify-center bg-[#1e293b] p-1.5 shadow-md">
            {/* Drops */}
            <div className="flex gap-0.5 mb-0.5 items-end">
              <div className="w-0.5 h-1.5 bg-[#3b82f6] rounded-full" />
              <div className="w-0.5 h-1.5 bg-[#3b82f6] rounded-full" />
              <div className="w-0.5 h-1.5 bg-[#3b82f6] rounded-full" />
            </div>
            {/* Car Shape */}
            <div className="relative w-6 h-4 flex flex-col items-center">
              {/* Roof */}
              <div className="w-3.5 h-2 bg-[#60a5fa] rounded-t-md" />
              {/* Body */}
              <div className="w-6 h-2.5 bg-[#ef4444] rounded-sm relative -mt-0.5">
                {/* Headlights */}
                <div className="absolute left-0.5 top-0.5 w-0.5 h-0.5 bg-[#fbbf24] rounded-full" />
                <div className="absolute right-0.5 top-0.5 w-0.5 h-0.5 bg-[#fbbf24] rounded-full" />
              </div>
              {/* Wheels */}
              <div className="flex justify-between w-4.5 -mt-0.5">
                <div className="w-1 h-0.5 bg-[#64748b] rounded-b-sm" />
                <div className="w-1 h-0.5 bg-[#64748b] rounded-b-sm" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2">
          <h1 className="text-xl font-bold leading-none">
            세차의 정석
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${state.isOffline ? 'bg-orange-400' : 'bg-[#1ea08a] shadow-[0_0_8px_rgba(30,160,138,0.5)] animate-pulse'}`} />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
              {state.isOffline ? "서버 오프라인" : "DB 연결됨"}
            </span>
          </div>
        </div>
        
        {user && (
          <button 
            onClick={() => {
              setState((prev: any) => ({ ...prev, modal: 'logout_confirm' }));
            }} 
            className="flex flex-col items-center justify-center hover:opacity-80 active:scale-95 transition-all absolute right-6"
          >
            <LogOut size={22} strokeWidth={2.5} />
            <span className="text-[10px] font-medium mt-0.5">Log out</span>
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto flex flex-col p-6 gap-6 [&>*]:shrink-0"
      >
        {/* User Summary Card (Main Page) */}
        {user && (
          <motion.div 
            variants={item}
            className="bg-[#f0f9ff] border-2 border-[#bae6fd] rounded-[2rem] p-5 flex items-center gap-5 shadow-sm"
          >
            {/* Left: Car Photo */}
            <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white border border-slate-100 shrink-0 shadow-sm flex items-center justify-center p-4">
              {user.carPhotoUrl ? (
                <img src={user.carPhotoUrl} alt="차량 사진" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300 rounded-xl">
                  <Car size={36} />
                </div>
              )}
            </div>

            {/* Right: Info */}
            <div className="flex flex-col gap-1 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xl">🏆</span>
                <span className="font-extrabold text-slate-800 text-lg tracking-tight">
                  {latestBadge ? latestBadge.label : "명예 대기 중"}
                </span>
              </div>
              <p className="text-[15px] font-black text-slate-700 leading-tight">
                {user.carModel || "차량"} 고객님 오신 걸<br/>
                환영합니다
              </p>
            </div>
          </motion.div>
        )}

        {/* Weather & Info */}
        <motion.div variants={item} className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-md border border-white/50 mb-10 overflow-hidden">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Bell size={24} className="text-slate-800" strokeWidth={2.5}/>
            <h4 className="font-black text-[#3d5a55] text-lg">공지사항 및 미세먼지 농도</h4>
          </div>
          
          <div className="flex flex-col gap-8">
            <div className="flex justify-between items-center bg-slate-50/50 p-2 rounded-full pr-4">
              <span className="text-slate-500 font-black text-sm ml-2">오늘의 미세먼지</span>
              {loadingWeather ? (
                <span className="text-slate-300 text-xs animate-pulse">정보를 불러오는 중...</span>
              ) : (
                <span className={`px-5 py-2 rounded-full text-xs font-black shadow-sm ${
                  airQuality?.status === '매우나쁨' ? 'bg-red-100 text-red-600' : 
                  airQuality?.status === '나쁨' ? 'bg-orange-100 text-orange-600' :
                  airQuality?.status === '보통' ? 'bg-[#fef2e2] text-[#d68910]' :
                  'bg-emerald-100 text-emerald-600'
                }`}>
                  {airQuality?.status} ({airQuality?.value}µg/㎥)
                </span>
              )}
            </div>

            <div className="bg-orange-50 rounded-[10px] p-5 border border-orange-100/50 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-orange-600">
                <ShieldCheck size={18} strokeWidth={3} />
                <span className="text-[11px] font-black uppercase tracking-wider">이용 꿀팁 & 주의사항</span>
              </div>
              <p className="text-[13px] text-slate-700 leading-relaxed font-bold">
                셀프세차 시 <span className="text-orange-600 underline underline-offset-2">공용솔</span>을 사용하시면 차량에 미세 기스가 날 수 있어요. 기스에 민감하신 분들은 개인용 브러쉬나 미트 사용을 추천합니다!
              </p>
            </div>
            
            <div className="flex items-start justify-between gap-6">
              <div className="flex flex-col gap-3">
                <span className="text-slate-500 font-black text-xs">추천 세차 지수</span>
                <div className="w-28 h-28 shrink-0 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-50">
                  <img 
                    src="https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=200&h=200&fit=crop" 
                    alt="Car wash" 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="flex-1 pt-4">
                <span className={`text-2xl font-black block mb-3 leading-tight tracking-tight ${washIndex > 70 ? 'text-[#1ea08a]' : washIndex > 40 ? 'text-orange-500' : 'text-red-500'}`}>
                  {washIndex}% - {washIndex > 70 ? '세차하기 좋은 날!' : washIndex > 40 ? '세차를 고려해보세요' : '오늘은 세차를 참아주세요'}
                </span>
                <p className="text-[12px] text-slate-500 leading-relaxed font-bold">
                  {loadingWeather ? '기상 정보를 분석하고 있습니다...' : 
                   washIndex > 70 ? '미세먼지와 날씨가 최적입니다. 바로 세차해보세요.' :
                   washIndex > 40 ? '구름이 많거나 미세먼지가 있을 수 있습니다.' :
                   '비 예보가 있거나 대기질이 좋지 않습니다.'}
                </p>
              </div>
            </div>

            {/* 5-day Forecast */}
            {!loadingWeather && forecastData.length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-slate-500 font-black text-xs">주간 날씨 예보 (5일)</span>
                  <div className="h-1 flex-1 mx-4 bg-slate-50 rounded-full" />
                </div>
                <div className="flex justify-between gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {forecastData.map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-1.5 min-w-[60px] bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                      <span className="text-[10px] font-black text-slate-400">{i === 0 ? '오늘' : day.date}</span>
                      <span className="text-xl">{day.icon}</span>
                      <div className="flex flex-col items-center leading-none">
                        <span className="text-[12px] font-black text-slate-700">{day.maxTemp}°</span>
                        <span className="text-[10px] font-bold text-slate-400">{day.minTemp}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Auth Buttons (Only if not logged in) */}
        {!user && (
          <motion.div variants={item} className="flex flex-col gap-3">
            <button 
              onClick={() => setView('auth')} 
              className="w-full bg-[#e6f4f2] h-[58px] rounded-xl text-[#3d5a55] font-black shadow-sm active:scale-[0.98] border border-white/60 transition-all hover:bg-white flex items-center justify-center"
            >
              로그인
            </button>
            <button 
              onClick={() => setView('auth')} 
              className="w-full bg-[#e6f4f2] h-[58px] rounded-xl text-[#3d5a55] font-black shadow-sm active:scale-[0.98] border border-white/60 transition-all hover:bg-white flex items-center justify-center"
            >
              회원가입
            </button>
          </motion.div>
        )}

        {/* Main Services - Responsive Grid */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ServiceCard 
            icon={<div className="bg-[#e6f4f2] p-3.5 rounded-full text-[#1ea08a]"><Navigation size={22} fill="currentColor" strokeWidth={1.5}/></div>}
            label="빠른위치서비스"
            onClick={onOpenService}
          />
          <ServiceCard 
            icon={<div className="bg-[#f0f9ff] p-3.5 rounded-full text-[#3b82f6]"><Star size={22} fill="currentColor" strokeWidth={1.5}/></div>}
            label="매트릭스 리뷰"
            onClick={() => setView('review_matrix')}
          />
          <ServiceCard 
            icon={user?.carPhotoUrl ? (
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#fff7ed] shadow-sm">
                <img src={user.carPhotoUrl} alt="내 차량" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="bg-[#fff7ed] p-3.5 rounded-full text-[#f97316]"><Car size={22} fill="currentColor" strokeWidth={1.5}/></div>
            )}
            label="내 차량 설정"
            onClick={() => {
              if (!user) {
                alert("차량 설정을 하시려면 먼저 로그인해주세요!");
                setView('auth');
              } else {
                setState((prev: any) => ({ ...prev, modal: 'vehicle_config' }));
              }
            }}
          />
          <ServiceCard 
            icon={<div className="bg-[#fefce8] p-3.5 rounded-full text-[#ca8a04]"><Lightbulb size={22} fill="currentColor" strokeWidth={1.5}/></div>}
            label="전문가 노하우"
            onClick={() => setView('guide')}
          />
        </motion.div>

        {/* AI Ask Button */}
        <motion.button 
          variants={item}
          onClick={() => {
            if (!user) {
              alert("AI 전문가와 상담하시려면 먼저 로그인해주세요!");
              setView('auth');
            } else {
              setState((prev: any) => ({ ...prev, view: 'chat' })); // Force chat view for AI
            }
          }}
          className="w-full relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white p-7 md:p-9 flex flex-col justify-between shadow-lg transition-all active:scale-[0.98] group mt-2"
        >
          {/* Futuristic background touches */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#1ea08a] rounded-full blur-[80px] opacity-40 group-hover:opacity-60 transition-opacity pointer-events-none"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-[#0ea5e9] rounded-full blur-[60px] opacity-30 pointer-events-none"></div>
          
          <div className="flex items-center justify-between w-full z-10">
             <div className="flex flex-col items-start gap-1 text-left">
               <div className="flex items-center gap-2 mb-2">
                 <Sparkles size={16} className="text-[#34d399] animate-pulse" />
                 <span className="text-[11px] font-black tracking-[0.15em] text-[#34d399] uppercase">AI Assistant</span>
               </div>
               <span className="font-black text-white text-[22px] tracking-tight text-left leading-tight break-keep">AI세차전문가한테<br/>물어보세요!!</span>
             </div>

             <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-white/20 transition-all shadow-lg shrink-0">
               <Search size={28} className="text-white group-hover:scale-110 transition-transform" strokeWidth={2.5} />
             </div>
          </div>
        </motion.button>

        {user?.email === OWNER_EMAIL && (
          <motion.button 
            variants={item}
            onClick={() => setView('admin_dashboard')}
            className="w-full relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#c2410c] to-[#9a3412] text-white p-7 flex items-center justify-between shadow-xl transition-all active:scale-[0.98] group border border-orange-500/30 mt-2"
          >
            <div className="absolute right-0 top-0 w-32 h-32 bg-white opacity-10 rounded-full blur-[40px] transform translate-x-1/2 -translate-y-1/4 pointer-events-none"></div>
            
            <div className="flex items-center gap-5 z-10 relative">
               <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl shadow-inner border border-white/20 shrink-0">
                 <ShieldCheck size={32} className="text-white group-hover:scale-110 transition-transform" strokeWidth={2} />
               </div>
               <div className="flex flex-col items-start gap-1 text-left">
                 <span className="font-black text-[20px] tracking-tight text-white leading-tight">실무자 대시보드</span>
                 <span className="text-[12px] text-orange-200 font-bold tracking-wide">고객 문의 집중 관리</span>
               </div>
            </div>
            
            <ChevronRight size={28} className="text-orange-200 group-hover:translate-x-2 transition-transform z-10 shrink-0" />
          </motion.button>
        )}

      </motion.div>
    </div>
  );
}

function ServiceCard({ icon, label, onClick }: { icon: any, label: string, onClick?: () => void }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.05, borderColor: "#1ea08a" }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="bg-white p-6 rounded-[2rem] flex flex-col items-center gap-3 shadow-sm border border-slate-100 transition-all cursor-pointer group"
    >
      <div className="group-hover:scale-110 transition-transform">{icon}</div>
      <span className="text-slate-700 text-[13px] font-black">{label}</span>
    </motion.div>
  );
}
function ChatScreen({ user, onBack, onPhoto, onPhotoSelect, title = "궁금하신점은 무엇입니까~", placeholder = "궁금한 내용을 입력하세요", allowAutoAI = false, chatType = "general", overrideSessionId, onNavigateToGuide }: { user: UserProfile | null, onBack: () => void, onPhoto: () => void, onPhotoSelect?: (file: File) => void, title?: string, placeholder?: string, allowAutoAI?: boolean, chatType?: "ai" | "expert" | "general", overrideSessionId?: string, onNavigateToGuide?: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'user' | 'model'>(overrideSessionId && user?.email === 'wlsgns9607@gmail.com' && chatType === 'expert' ? 'model' : 'user'); 
  
  // Create a unique session ID for guests to avoid sharing 'anonymous' session
  const [guestSessionId] = useState(() => {
    if (user?.uid) return user.uid;
    if (overrideSessionId) return overrideSessionId;
    const saved = localStorage.getItem('guest_session_id');
    if (saved) return saved;
    const newId = 'guest_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('guest_session_id', newId);
    return newId;
  });

  const sessionId = guestSessionId;
  const subCol = chatType === "ai" ? "ai_messages" : chatType === "expert" ? "expert_messages" : "messages";

  // Load messages
  useEffect(() => {
    if (!db || !sessionId) {
      setLocalMessages([{ role: 'model', content: "반갑습니다! 무엇이든 물어보세요. 세차 관련 궁금증을 해결해 드립니다.", timestamp: new Date().toISOString(), roleLabel: '실무자의 답변' }]);
      return;
    }

    const messagesRef = collection(db, 'chatSessions', sessionId, subCol);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      if (msgs.length === 0) {
        setMessages([{ role: 'model', content: "반갑습니다! 무엇이든 물어보세요. 세차 관련 궁금증을 해결해 드립니다.", timestamp: new Date().toISOString(), roleLabel: '실무자의 답변' }]);
      } else {
        setMessages(msgs);
      }
    }, (error) => {
      console.error("Chat fetch error:", error);
    });

    return () => unsubscribe();
  }, [user, sessionId, subCol]);

  // Combined messages
  const displayMessages = db ? messages : localMessages;

  const deleteMessage = async (msgId?: string) => {
    if (!msgId || !user || sessionId === 'anonymous') return;
    try {
      const msgRef = doc(db, 'chatSessions', sessionId, subCol, msgId);
      await deleteDoc(msgRef);
    } catch (error) {
      console.error("메시지 삭제 오류:", error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const content = input.trim();
    if (!content) return;
    
    setInput(''); // Clear input immediately for responsiveness
    setIsLoading(true);

    const tempId = 'temp-' + Date.now().toString();
    const newUserMsg: ChatMessage = {
      id: tempId,
      role: mode,
      content: content,
      timestamp: new Date().toISOString(),
      roleLabel: mode === 'user' ? '궁금한점' : '실무자의 답변'
    };

    // Optimistically update UI
    setLocalMessages(prev => [...prev, newUserMsg]);

    try {
      // 1. Save Message to Firestore in background
      if (db) {
        const messagesRef = collection(db, 'chatSessions', sessionId, subCol);
        addDoc(messagesRef, {
          role: newUserMsg.role,
          content: newUserMsg.content,
          timestamp: serverTimestamp(),
          roleLabel: newUserMsg.roleLabel
        }).catch(err => console.error("Firestore save error:", err));

        if (chatType === 'expert') {
          const sessionRef = doc(db, 'chatSessions', sessionId);
          setDoc(sessionRef, {
            hasExpertQuery: true,
            lastExpertQueryAt: serverTimestamp(),
            userId: sessionId,
            userEmail: user?.email || 'guest',
            userName: user?.name || '사용자'
          }, { merge: true }).catch(err => console.error("Firestore session update error:", err));
        }
      }

      // 2. Trigger AI response if applicable
      if (mode === 'user' && allowAutoAI) {
        const history = displayMessages.slice(-10).map(m => ({ 
          role: m.role, 
          parts: [{ text: m.content }] 
        }));
        
        const carInfo = user?.carModel || user?.carSize 
          ? `(사용자 차량 정보: ${user.carSize || ''} ${user.carModel || ''})` 
          : "(차량 정보 없음)";

        try {
          const response = await callAI(
            [...history, { role: 'user', parts: [{ text: content }] }],
            `당신은 '세차의 정석' 앱의 AI 세차 전문가입니다. 당신은 오직 '세차'와 관련된 주제(세차 방법, 주기, 용품, 차량 관리 등)에 대해서만 답변해야 합니다. 세차와 관련 없는 질문에 대해서는 "죄송합니다. 저는 세차 전문가로서 세차와 관련된 궁금증만 해결해 드릴 수 있습니다."라고 정중하게 거절하십시오. ${carInfo} 사용자에게 전문적이고 친절하게 상담해주세요. 답변은 반드시 한국어로 작성하십시오.`
          );

          if (response.text) {
            const aiMsg: any = {
              role: 'model',
              content: response.text,
              timestamp: new Date().toISOString(),
              roleLabel: 'AI세차전문가'
            };

            if (db) {
              const messagesRef = collection(db, 'chatSessions', sessionId, subCol);
              await addDoc(messagesRef, {
                ...aiMsg,
                timestamp: serverTimestamp()
              });
            } else {
              setLocalMessages(prev => [...prev, { ...aiMsg, id: 'ai-' + Date.now() }]);
            }
          }
        } catch (aiErr: any) {
          console.error("AI Response Error:", aiErr);
          const errorMsg = aiErr.message?.includes('503') || aiErr.message?.includes('demand')
            ? "현재 인공지능 서버의 부하가 많아 답변이 지연되고 있습니다. 잠시 후 다시 시도해주시거나, '실무자 상담' 메뉴를 이용해주세요."
            : "AI 답변을 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
            
          setLocalMessages(prev => [...prev, { 
            id: 'err-' + Date.now(), 
            role: 'model', 
            content: errorMsg, 
            timestamp: new Date().toISOString(), 
            roleLabel: '알림' 
          }]);
        }
      } 
    } catch (error: any) {
      console.error("Main Chat Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayMessages]);

  return (
    <div className="h-full flex flex-col bg-[#ebf5f3]">
      {/* Header matching provided image */}
      <div className="bg-white px-6 py-5 pt-safe-5 flex items-center justify-center border-b border-slate-100 sticky top-0 z-20">
        <style dangerouslySetInnerHTML={{ __html: `.pt-safe-5 { padding-top: calc(env(safe-area-inset-top, 0px) + 1.25rem); }` }} />
        <h2 className="text-[17px] font-black text-slate-800 pointer-events-none whitespace-nowrap">
           {title}
        </h2>
        {chatType !== 'ai' && user?.email !== 'wlsgns9607@gmail.com' && (
          <button 
            onClick={onPhoto}
            className="absolute right-6 w-10 h-10 bg-[#002f6c] rounded-full flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform"
          >
             <Plus size={20} strokeWidth={4} />
          </button>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Notice for Experts */}
        {chatType === 'expert' && (
          <div className="bg-amber-50 border-b border-amber-100 px-6 py-3">
            <p className="text-[11px] font-black text-amber-800 leading-relaxed text-center">
              🔔 실무자가 일하는 중일 수도 있습니다. 바로바로 답변 못 해드리니 급하신 고객님께서는 [AI세차박사]를 이용해 주세요!! (평일 18~23시, 점심시간 가능합니다)
            </p>
          </div>
        )}

        {/* The Beige Card Container */}
        <div 
          ref={scrollRef}
          className="flex-1 bg-[#f5f2e8] rounded-[3rem] overflow-y-auto p-6 flex flex-col gap-8 pt-8 shadow-sm"
        >
          {displayMessages.map((m, i) => (
            <motion.div 
              key={m.id || i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col max-w-[90%] ${m.role === 'user' ? 'self-start' : 'self-end'}`}
            >
              <div className={`p-6 rounded-[2.5rem] shadow-xl relative border-[3px] transition-all ${
                m.role === 'user' 
                  ? 'bg-[#1e293b] text-white border-transparent' 
                  : 'bg-white/80 text-slate-900 border-black'
              }`}>
                 {/* Speaker Icon at Top Right */}
                 <div className="absolute top-4 right-6">
                    <button 
                      onClick={() => speak(m.content)}
                      className="p-1 hover:bg-black/10 rounded-full transition-colors"
                    >
                      <Volume2 size={32} className={m.role === 'user' ? 'text-white' : 'text-slate-900'} />
                    </button>
                 </div>

                 <div className="mb-2 pr-12">
                   <p className="text-[17px] font-black tracking-tighter">
                     {m.role === 'user' ? (m.roleLabel || '궁금한점') : (m.roleLabel || '실무자의 답변')}
                   </p>
                 </div>

                 <div className="text-[16px] leading-relaxed font-bold mt-2">
                   {m.photoUrl && (
                     <div className="mb-4 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-50">
                       <img src={m.photoUrl} alt="첨부 사진" className="w-full object-cover max-h-80" referrerPolicy="no-referrer" />
                     </div>
                   )}
                   <Markdown>{m.content}</Markdown>
                 </div>

                 {/* X Icon at Bottom Right */}
                 <div className="absolute right-6 bottom-4 flex items-center gap-2">
                    {m.role === 'user' && user?.email === 'wlsgns9607@gmail.com' && chatType === 'expert' && (
                       <button 
                         onClick={onPhoto}
                         className="px-3 py-1 bg-[#1ea08a] text-white text-xs font-black rounded-full hover:bg-[#15806c] transition-colors"
                       >
                         답변하기
                       </button>
                    )}
                    <X 
                      size={24} 
                      className="cursor-pointer opacity-40 hover:opacity-100 transition-opacity" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(m.id);
                      }}
                    />
                 </div>
              </div>
            </motion.div>
          ))}
          {isLoading && <div className="self-start text-[11px] font-black text-slate-400 bg-white/50 px-4 py-2 rounded-full animate-pulse ml-4">기록중...</div>}
        </div>
      </div>

      {/* Input area */}
      <div className="px-6 pb-safe-12 pt-4 bg-[#ebf5f3]">
        <style dangerouslySetInnerHTML={{ __html: `.pb-safe-12 { padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 3rem); }` }} />
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            {mode === 'user' && (
              <label 
                className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-800 hover:text-slate-600 transition-colors active:scale-95 cursor-pointer"
              >
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file && onPhotoSelect) {
                        onPhotoSelect(file);
                     } else {
                        onPhoto();
                     }
                  }}
                />
                <Camera size={30} strokeWidth={2.5} />
              </label>
            )}
            <input 
              type="text" 
              placeholder={chatType === 'expert' && mode === 'model' ? "실무자 답변란" : placeholder}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  if (e.nativeEvent.isComposing) return;
                  e.preventDefault();
                  sendMessage();
                }
              }}
              className={`w-full bg-${chatType !== 'ai' ? 'white' : '[#f1f1f1]'} border-[3px] border-slate-900 rounded-[2.5rem] py-6 pr-10 ${mode === 'user' ? 'pl-16' : 'px-10'} font-black text-[18px] text-center focus:outline-none shadow-xl placeholder:text-slate-500`}
            />
          </div>
          <button 
            onClick={sendMessage}
            disabled={isLoading}
            className={`w-16 h-16 shrink-0 rounded-full bg-[#1ea08a] flex items-center justify-center text-white shadow-2xl active:scale-95 transition-all border-4 border-white ${isLoading ? 'opacity-50' : ''}`}
          >
            {isLoading ? (
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              chatType === 'ai' ? <Send size={30} strokeWidth={2.5} className="ml-1" /> : <Navigation size={30} strokeWidth={2.5} className="-ml-1 mr-1 rotate-45" fill="currentColor" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function PhotoUploadScreen({ user, onBack, title = "사진과 함께 기록하기", disableAI = false, chatType = "general", overrideSessionId, initialFile }: { user: UserProfile | null, onBack: () => void, title?: string, disableAI?: boolean, chatType?: "ai" | "expert" | "general", overrideSessionId?: string | null, initialFile?: File | null }) {
  const [file, setFile] = useState<File | null>(initialFile || null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [mode] = useState<'user' | 'model'>(overrideSessionId && user?.email === 'wlsgns9607@gmail.com' && chatType === 'expert' ? 'model' : 'user');

  // If initial file exists, generate preview for it
  useEffect(() => {
    if (initialFile) {
       const reader = new FileReader();
       reader.onloadend = () => setPreview(reader.result as string);
       reader.readAsDataURL(initialFile);
    }
  }, [initialFile]);

  const subCol = chatType === "ai" ? "ai_messages" : chatType === "expert" ? "expert_messages" : "messages";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const handleSend = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    
    if (!description.trim() && !preview) {
      alert("내용을 입력하거나 사진을 선택해주세요.");
      return;
    }
    
    // Fallback messages
    const defaultMsg = preview 
      ? (mode === 'model' ? "사진 첨부 파일입니다." : "[사진 공유] 상담 부탁드립니다!") 
      : "";
    const userMessage = description.trim() || defaultMsg;

    // Restriction: Only wlsgns9607@gmail.com can answer as 'model' in expert chat
    if (chatType === "expert" && mode === 'model' && user?.email !== 'wlsgns9607@gmail.com') {
      alert("세차 실무자 권한이 없습니다.");
      return;
    }

    setIsSending(true);
    
    try {
      const sessionId = overrideSessionId || user.uid;
      const messagesPath = `chatSessions/${sessionId}/${subCol}`;
      const recordsPath = `records/${sessionId}/userRecords`; // Save to the session owner's records
      
    if (!db) {
      alert("데이터베이스 연결 대기 중입니다. 잠시 후 다시 시도해주세요.");
      setIsSending(false);
      return;
    }
    const messagesRef = collection(db, 'chatSessions', sessionId, subCol);
    const recordsRef = collection(db, 'records', sessionId, 'userRecords');
      
      // 1. Save to Chat Messages
      const chatDoc = await addDoc(messagesRef, {
        role: mode,
        content: userMessage,
        timestamp: serverTimestamp(),
        hasPhoto: !!preview,
        photoUrl: preview || null,
        roleLabel: mode === 'model' ? '실무자의 답변' : '전달 메시지'
      }).catch(err => {
        handleFirestoreError(err, 'write' as any, messagesPath);
        throw err;
      });

      // Mark session for admin dashboard if expert chat
      if (chatType === 'expert') {
        const sessionRef = doc(db, 'chatSessions', sessionId);
        const sessionUpdate: any = {
          hasExpertQuery: true,
          lastExpertQueryAt: serverTimestamp(),
          userId: sessionId,
          userEmail: user?.email || 'anonymous',
          userName: user?.name || '사용자'
        };
        await setDoc(sessionRef, sessionUpdate, { merge: true });
      }

      // 2. Save to Records
      await addDoc(recordsRef, {
        role: mode,
        content: userMessage,
        timestamp: serverTimestamp(),
        hasPhoto: !!preview,
        photoUrl: preview || null,
        chatMessageId: chatDoc.id
      }).catch(err => {
        handleFirestoreError(err, 'write' as any, recordsPath);
        throw err;
      });

      // 3. Trigger AI only if in 'user' mode AND AI is not disabled
      if (mode === 'user' && !disableAI) {
        const aiContents: any[] = [];
        
        // If there's an image, send it as inlineData
        if (preview && preview.includes('base64,')) {
           const [header, data] = preview.split('base64,');
           const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg';
           aiContents.push({
             role: 'user',
             parts: [
               { inlineData: { mimeType, data } },
               { text: `사용자가 세차 사진과 함께 문의했습니다: "${userMessage}". 사진 내용을 분석하고 도움을 주는 답변을 작성해주세요.` }
             ]
           });
        } else {
           aiContents.push({ 
             role: 'user', 
             parts: [{ text: `사용자가 세차 사진과 함께 문의했습니다: "${userMessage}". 사진 내용을 분석하고 도움을 주는 답변을 작성해주세요.` }] 
           });
        }

        callAI(
          aiContents,
          "당신은 '세차의 정석' 앱의 AI 세차 전문가입니다. 오직 '세차'와 관련된 주제에 대해서만 답변하십시오. 사진 분석 시에도 세차와 관련된 정보(오염도, 흠집, 재질 등)만 다루고, 세차와 무관한 사진에 대해서는 정중히 답변을 거절하십시오. 모든 답변은 한국어로 전문적이고 친절하게 작성해야 합니다."
        ).then(async (response) => {
          if (response.text) {
            await addDoc(messagesRef, {
              role: 'model',
              content: response.text,
              timestamp: serverTimestamp()
            });
          }
        }).catch(err => {
          console.error("AI background error:", err);
          if (err.message?.includes('API_KEY')) {
            alert("AI 서비스 API 키 인식이 안 됩니다. 관리자 설정을 확인해주세요.");
          } else {
            alert("AI 분석 중 오류가 발생했습니다: " + err.message);
          }
        });
      }

      alert("성공적으로 기록되었습니다!");
      onBack();
    } catch (error) {
       console.error("Photo Send Error:", error);
       alert("전송 중 오류가 발생했습니다.");
    } finally {
       setIsSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#ebf5f3] p-6 lg:p-8">
       {/* Custom Navy Header */}
       <div className="py-5 rounded-2xl flex items-center justify-center shadow-sm bg-[#1e2a3b] mb-6 mt-4">
          <h2 className="font-black text-white text-[19px] px-4 text-center leading-tight">
             {title}
          </h2>
       </div>

       {/* Input Box */}
       <div className="flex-1 bg-[#ebf5f3] rounded-xl border-[2px] border-[#1ea08a] mb-6 flex flex-col overflow-hidden relative shadow-sm">
          {preview && (
            <div className="h-40 border-b border-[#1ea08a]/30 relative bg-white/50 shrink-0 p-2">
               <img src={preview} alt="preview" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
               <button onClick={() => { setFile(null); setPreview(null); }} className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors">
                 <X size={20} />
               </button>
            </div>
          )}
          <textarea 
             value={description}
             onChange={e => setDescription(e.target.value)}
             placeholder={!preview ? "이곳에 내용을 작성해주세요." : ""}
             className="flex-1 w-full bg-transparent resize-none focus:outline-none p-5 text-slate-700 font-bold text-[16px] placeholder:text-slate-400"
          />
          {!preview && (
            <div className="absolute bottom-4 right-4">
               <label className="cursor-pointer group flex items-center justify-center w-12 h-12 bg-white rounded-full shadow-md border-2 border-[#1ea08a] text-[#1ea08a] hover:bg-[#1ea08a] hover:text-white transition-colors">
                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                  <Camera size={24} strokeWidth={2.5} />
               </label>
            </div>
          )}
       </div>

       {/* Bottom Buttons */}
       <div className="mt-auto flex gap-4 pb-4">
          <button 
             onClick={onBack}
             className="flex-1 bg-[#cbede5] text-slate-800 font-black py-4 rounded-[1.5rem] shadow-sm active:scale-95 transition-all text-[18px]"
          >
             취소하기
          </button>
          <button 
             onClick={handleSend}
             disabled={isSending}
             className="flex-1 bg-[#1ea08a] text-white font-black py-4 rounded-[1.5rem] shadow-md active:scale-95 transition-all disabled:opacity-50 text-[18px]"
          >
             {isSending ? '전송중...' : '전송하기'}
          </button>
       </div>
    </div>
  );
}

function ExpertAdminDashboard({ user, onBack, onSelectSession }: { user: UserProfile | null, onBack: () => void, onSelectSession: (uid: string) => void }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'queries' | 'reviews'>('queries');

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const qSessions = query(
      collection(db, 'chatSessions'),
      where('hasExpertQuery', '==', true),
      orderBy('lastExpertQueryAt', 'desc')
    );

    const qReviews = query(
      collection(db, 'reviews'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeSessions = onSnapshot(qSessions, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSessions(data);
      if (activeTab === 'queries') setLoading(false);
    }, (err) => {
      console.error("Admin dashboard sessions fetch error:", err);
      setLoading(false);
    });

    const unsubscribeReviews = onSnapshot(qReviews, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReviews(data);
      if (activeTab === 'reviews') setLoading(false);
    }, (err) => {
      console.error("Admin dashboard reviews fetch error:", err);
      setLoading(false);
    });

    return () => {
      unsubscribeSessions();
      unsubscribeReviews();
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#ebf5f3]">
      <div className="bg-white px-6 py-5 pt-safe-5 flex items-center justify-center border-b border-slate-100 sticky top-0 z-20">
        <style dangerouslySetInnerHTML={{ __html: `.pt-safe-5 { padding-top: calc(env(safe-area-inset-top, 0px) + 1.25rem); }` }} />
        <button onClick={onBack} className="absolute left-6 text-[#002f6c] hover:opacity-80 transition-opacity mt-safe">
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <h2 className="text-[17px] font-black text-slate-800 pointer-events-none whitespace-nowrap">
           실무자 대시보드
        </h2>
      </div>

      {/* Tabs */}
      <div className="bg-white px-4 border-b border-slate-100 flex gap-4 sticky top-[67px] z-10">
        <button 
          onClick={() => setActiveTab('queries')}
          className={`flex-1 py-4 text-sm font-black transition-colors border-b-4 ${activeTab === 'queries' ? 'border-[#1ea08a] text-[#1ea08a]' : 'border-transparent text-slate-400'}`}
        >
          고객 문의 ({sessions.length})
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 py-4 text-sm font-black transition-colors border-b-4 ${activeTab === 'reviews' ? 'border-indigo-500 text-indigo-500' : 'border-transparent text-slate-400'}`}
        >
          매트릭스 리포트 ({reviews.length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-8">
        <div className="px-4 mb-4">
           <h3 className="text-[14px] font-black text-slate-400 uppercase tracking-widest">
             {activeTab === 'queries' ? '실무자 마스터 대시보드' : '정량적 세차 리포트 수집'}
           </h3>
           <p className="text-[12px] text-slate-400 font-bold mt-1">
             {activeTab === 'queries' ? '문의가 들어온 고객 리스트입니다.' : '고객이 제출한 2축 매트릭스 리포트입니다.'}
           </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-8 h-8 border-4 border-[#1ea08a] border-t-transparent rounded-full" />
          </div>
        ) : activeTab === 'queries' ? (
          sessions.length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-[2.5rem] mx-2 border-2 border-dashed border-slate-200">
              <p className="text-slate-500 font-black">새로운 문의가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sessions.map((session) => (
                <motion.div
                  key={session.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => onSelectSession(session.id)}
                  className="bg-white p-6 rounded-[2.5rem] border-[3px] border-slate-900 flex items-center justify-between group cursor-pointer shadow-xl h-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#f5f2e8] rounded-[1.2rem] border-2 border-black flex items-center justify-center text-slate-800 font-black text-xl shrink-0">
                      {session.userName?.[0] || 'U'}
                    </div>
                    <div className="min-w-0">
                       <h3 className="font-black text-slate-800 text-[16px] mb-0.5 truncate">{session.userName || '익명 사용자'}</h3>
                       <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full truncate max-w-[120px]">{session.userEmail}</span>
                       </div>
                       <p className="text-[10px] text-[#1ea08a] font-black mt-2 bg-[#1ea08a]/10 inline-block px-2 py-0.5 rounded-md">
                         {session.lastExpertQueryAt?.toDate()?.toLocaleString('ko-KR') || ''}
                       </p>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-[#1ea08a] shrink-0" />
                </motion.div>
              ))}
            </div>
          )
        ) : (
          reviews.length === 0 ? (
            <div className="text-center py-20 bg-white/50 rounded-[2.5rem] mx-2 border-2 border-dashed border-slate-200">
              <p className="text-slate-500 font-black">제출된 리포트가 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.map((review) => (
                <motion.div
                  key={review.id}
                  className="bg-white p-7 rounded-[2.5rem] border-2 border-slate-200 shadow-lg space-y-5 h-full flex flex-col"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black border border-indigo-100">
                        {review.userName?.[0] || 'U'}
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800 text-[15px]">{review.userName}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{review.carModel} • {review.createdAt?.toDate()?.toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">전문가 평가 점수</span>
                      <span className="text-[18px] font-black text-slate-900">{review.qualityIndex}<span className="text-[12px] text-slate-300 ml-0.5">pt</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">시간 준수 성과</span>
                        <div className="flex items-end gap-2">
                          <span className={`text-[15px] font-black ${review.actualTime <= review.plannedTime ? 'text-emerald-600' : 'text-orange-500'}`}>
                            {review.actualTime}분
                          </span>
                          <span className="text-[10px] text-slate-300 font-bold mb-0.5">/ {review.plannedTime}분</span>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">매트릭스 좌표 (X, Y)</span>
                        <div className="flex items-center gap-2">
                          <Target size={14} className="text-indigo-400" />
                          <span className="text-[13px] font-black text-slate-700">X:{Math.round(review.pin.x)} Y:{Math.round(review.pin.y)}</span>
                        </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 p-5 rounded-[1.8rem] relative overflow-hidden group mb-2 flex-1">
                    <Sparkles className="absolute -right-2 -top-2 text-white/5 group-hover:text-white/10 transition-colors" size={60} />
                    <p className="text-white text-[13px] font-bold leading-relaxed relative z-10">
                        "{review.aiSummary}"
                    </p>
                  </div>

                  {review.expertComment && (
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen size={14} className="text-emerald-600" />
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">전문가 상세 의견</span>
                        </div>
                        <p className="text-slate-700 text-[12px] font-medium leading-relaxed">
                          {review.expertComment}
                        </p>
                    </div>
                  )}

                  {review.detailedScores && (
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {Object.entries(review.detailedScores).map(([key, val]: [string, any]) => (
                        <div key={key} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                          <span className="text-[10px] font-bold text-slate-500">{key}</span>
                          <span className="text-[12px]">{val === 1 ? '🙁' : val === 2 ? '😐' : '😊'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ExpertGuideScreen({ onBack }: { onBack: () => void }) {
  // ==========================================
  // [이미지 교체 가이드]
  // 아래 두 줄의 따옴표("") 안에 원하는 이미지 주소(URL)를 복사해서 붙여넣으세요.
  // 1. MAIN_CAR_IMAGE: 화면 상단의 큰 메인 이미지입니다.
  // 2. SUB_TOOL_IMAGE: 우측 하단에 떠 있는 작은 서브 이미지입니다.
  // ==========================================
  const MAIN_CAR_IMAGE = "https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=1000&auto=format&fit=crop"; 
  const SUB_TOOL_IMAGE = "https://images.unsplash.com/photo-1607860108855-64acf2078ed9?q=80&w=1000&auto=format&fit=crop";

  return (
    <div className="h-full flex flex-col bg-[#ebf5f3] overflow-y-auto">
      {/* Header */}
      <div className="bg-white px-6 py-5 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-[17px] font-black text-slate-800 absolute left-1/2 -translate-x-1/2">세차실무자의 노하우</h2>
        <div className="w-10" />
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="p-5 flex flex-col gap-6 bg-[#ced7d6] pb-12"
      >
        {/* Main Banner / Images Section */}
        <motion.div variants={item} className="relative pb-4">
          <div className="overflow-hidden rounded-2xl shadow-lg aspect-[16/9] bg-slate-200">
            <img 
              src={MAIN_CAR_IMAGE} 
              alt="Main Car Wash" 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          </div>
          
          {/* Sub Image overlay */}
          <div className="absolute -bottom-2 right-2 w-36 h-24 rounded-2xl border-4 border-white overflow-hidden shadow-2xl z-20 bg-slate-100">
            <img 
              src={SUB_TOOL_IMAGE} 
              className="w-full h-full object-cover" 
              alt="Sub Tool"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* Guide Content Sections */}
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div className="bg-white/80 backdrop-blur p-7 rounded-3xl relative shadow-md border border-white md:row-span-2">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-black text-slate-800 text-[15px] leading-tight">
                세차 고수의 '효율 200%' 순서 가이드<br/>
                1단계: 실내 세차 (본넷 온도 낮추기)
              </h4>
            </div>
            
            <ul className="text-[14px] text-slate-700 font-bold space-y-2 leading-relaxed">
              <li>• 준비: 운전석 뒷좌석을 제외한 문 다 열고, 앞 좌석 시트 최대한 밀기.</li>
              <li>• 에어 건: 앞 → 뒤 순서로 먼지 날려 보내기.</li>
              <li>• 청소기 순서: 조수석(문 닫기!) → 뒷좌석 → 운전석 → 트렁크.</li>
              <li>• 마무리: 무조건 유리부터 닦고, 실내 세정제(이너클리너)로 내부 닦기.</li>
            </ul>

            <h4 className="font-black text-slate-800 text-[15px] mt-4 mb-2">2단계: 외부 세차 (위에서 아래로)</h4>
            <ul className="text-[14px] text-slate-700 font-bold space-y-2 leading-relaxed">
              <li>• 고압수 & 폼건: 위에서 아래로 물 뿌린 뒤 폼건 살포 (벌레/새똥은 버그클리너 필수).</li>
              <li>• 휠 미트질: 폼건 상태에서 휠 먼저 닦기 (특히 외제차는 분진 때문에 꼭 하세요!).</li>
              <li>• 헹굼: 고압수로 거품 없이 꼼꼼하게 헹구기.</li>
            </ul>

            <h4 className="font-black text-slate-800 text-[15px] mt-4 mb-2">3단계: 드라이 & 마무리</h4>
            <ul className="text-[14px] text-slate-700 font-bold space-y-2 leading-relaxed">
              <li>• 물기 제거: 에어 건으로 틈새(그릴, 문틈) 물기 날리기.</li>
              <li>• 타월 사용법: 유리 전용 타월로 유리부터! (외부 닦던 타월 쓰면 유리 더러워짐).</li>
              <li>• 외관 닦기: 깨끗한 타월로 도장면 닦고, 원하면 왁스 칠하기.</li>
              <li>• 디테일: 문틈과 트렁크 물기까지 닦아야 나중에 이끼가 안 껴요.</li>
              <li className="mt-2">"세차는 유리부터 닦는 디테일과 위에서 아래로, 꼬임없는 동선이 생명입니다!"</li>
            </ul>
          </motion.div>

          {/* Pro Tip Section */}
          <div className="space-y-4">
            <motion.div variants={item} className="bg-[#e2e8f0]/80 backdrop-blur p-7 rounded-3xl relative shadow-md border border-white">
              <button 
                onClick={() => speak("전문가 꿀팁입니다. 벌레제거는 버그클리너, 묵은 때는 프리워시를 사용하세요. 세차 용품 브랜드는 bubble mate나 소낙스를 추천합니다.")}
                className="absolute top-4 right-4 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <Volume2 size={24} className="text-slate-900" />
              </button>
              <div className="text-center font-bold text-slate-800 text-[15px] leading-relaxed">
                벌레제거: 버그클리너, 묵은때 :프리워시<br/>
                철분제거하시려면 철분제거제 쓰세요<br/>
                세차 용품 브랜드는 bubble mate, 소낙스꺼 쓰세요<br/>
                가격대에 비해 bubble mate꺼 정말 괜찮습니다.
              </div>
            </motion.div>
            
            <motion.div 
              whileHover={{ scale: 1.02 }}
              onClick={() => window.open('https://bubblemate.vercel.app/', '_blank')}
              className="bg-[#1e293b] text-white p-7 rounded-3xl shadow-xl border border-white/10 cursor-pointer group"
            >
              <h4 className="font-black text-emerald-400 text-sm mb-2 uppercase tracking-widest">Recommended Brand</h4>
              <p className="text-lg font-bold leading-tight mb-4 text-white">가성비와 품질을 모두 잡은 bubble mate 세차용품 구경하기</p>
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs group-hover:gap-4 transition-all">
                <span>공식몰 바로가기</span>
                <ChevronRight size={14} />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
