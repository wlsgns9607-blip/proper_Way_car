import { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  ChevronLeft, 
  Sparkles,
  BarChart3,
  Target,
  RefreshCw,
  BookOpen,
  Award
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../App';
import { handleFirestoreError } from '../lib/firebase';
import { UserProfile } from '../types';

interface ReviewMatrixProps {
  onBack: () => void;
  user: UserProfile | null;
}

export function ReviewMatrix({ onBack, user }: ReviewMatrixProps) {
  const [pin, setPin] = useState<{ x: number; y: number } | null>(null);
  const [actualTime, setActualTime] = useState(50);
  const [qualityIndex, setQualityIndex] = useState(80);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expertComment, setExpertComment] = useState('');
  const [detailedScores, setDetailedScores] = useState<Record<string, number>>({
    '휠/타이어': 2,
    '도장면 케어': 2,
    '실내 세정': 2,
    '마무리 코팅': 2
  });
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const plannedTime = 60;

  const vibes = [
    { label: '#광택광', icon: '✨' },
    { label: '#차쟁이', icon: '🚗' },
    { label: '#땀방울', icon: '💧' },
    { label: '#물광지존', icon: '💎' },
    { label: '#주말순삭', icon: '⏳' },
    { label: '#초보의열정', icon: '🐣' },
  ];

  const handleVibeToggle = (vibe: string) => {
    setSelectedVibes(prev => 
      prev.includes(vibe) ? prev.filter(v => v !== vibe) : [...prev, vibe]
    );
  };

  const calculateBadge = () => {
    const isGoodTime = actualTime <= plannedTime;
    const isHighQuality = qualityIndex >= 85;
    const isSuperFast = actualTime <= plannedTime * 0.7;
    const isLongDetail = actualTime > plannedTime * 1.2 && isHighQuality;

    if (isGoodTime && isHighQuality) {
      return { type: 'perfect', label: '퍼펙트 마스터', color: 'bg-indigo-500', icon: '🏆' };
    } else if (isLongDetail) {
      return { type: 'artisan', label: '세차 장인', color: 'bg-amber-500', icon: '🎨' };
    } else if (isSuperFast) {
      return { type: 'ghost', label: '워시 고스트', color: 'bg-[#15DBC3]', icon: '👻' };
    } else if (isHighQuality) {
      return { type: 'detail', label: '디테일 킹', color: 'bg-emerald-500', icon: '🔍' };
    } else if (isGoodTime) {
      return { type: 'speed', label: '스피드 러너', color: 'bg-blue-500', icon: '⚡' };
    }
    return { type: 'rookie', label: '열정 루키', color: 'bg-slate-500', icon: '🌱' };
  };

  const currentBadge = calculateBadge();

  const categories = [
    { key: '휠/타이어', label: '휠/타이어 디테일', color: 'bg-emerald-500' },
    { key: '도장면 케어', label: '도장면 케어', color: 'bg-emerald-400' },
    { key: '실내 세정', label: '실내 정밀 세정', color: 'bg-indigo-400' },
    { key: '마무리 코팅', label: '마무리 및 코팅', color: 'bg-blue-500' },
  ];

  const handleScoreChange = (key: string, score: number) => {
    setDetailedScores(prev => ({ ...prev, [key]: score }));
  };
  
  const matrixRef = useRef<HTMLDivElement>(null);

  const handleMatrixClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (!matrixRef.current || isSubmitting) return;
    const rect = matrixRef.current.getBoundingClientRect();
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    
    setPin({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
    
    const timeRatio = x / 100;
    const qualRatio = 1 - (y / 100);
    
    setActualTime(Math.round(plannedTime * (0.6 + timeRatio * 0.8)));
    setQualityIndex(Math.round(qualRatio * 100));
  };

  const handleSubmit = async () => {
    if (!pin || !user || isSubmitting) return;
    if (!db) {
      alert('세차 데이터베이스가 연결되어 있지 않습니다. 관리자에게 문의해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const badge = currentBadge;

      await addDoc(collection(db, 'reviews'), {
        userId: user.uid,
        userName: user.name || '익명 사용자',
        userEmail: user.email,
        carModel: user.carModel || '정보 없음',
        pin,
        actualTime,
        plannedTime,
        qualityIndex,
        detailedScores,
        expertComment,
        badge,
        vibes: selectedVibes,
        aiSummary: getAISummary(),
        createdAt: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, 'create', 'reviews');
        throw err;
      });
      alert('리뷰가 성공적으로 제출되었습니다! 획득하신 배지는 프로필에 기록됩니다.');
      onBack();
    } catch (error) {
      console.error("리뷰 제출 오류:", error);
      alert(getManualErrorMsg(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getManualErrorMsg = (error: any) => {
    if (error.message?.includes('database')) return '세차 데이터베이스에 연결할 수 없습니다.';
    if (error.message?.includes('permission')) return '권한이 없습니다. 다시 로그인해 주세요.';
    return '제출 중 오류가 발생했습니다. 다시 시도해주세요.';
  };

  const getDataChips = () => {
    if (!pin) return [];
    const chips = [];
    const timeDiff = plannedTime - actualTime;
    
    if (timeDiff > 0) chips.push({ text: `-${timeDiff}분 단축`, color: 'bg-emerald-500' });
    else if (timeDiff < 0) chips.push({ text: `${Math.abs(timeDiff)}분 연장`, color: 'bg-orange-500' });
    else chips.push({ text: '시간 엄수', color: 'bg-blue-500' });

    if (pin.y < 33) chips.push({ text: '디테일 집중', color: 'bg-indigo-500' });
    else if (pin.y > 66) chips.push({ text: '신속 작업', color: 'bg-slate-700' });
    else chips.push({ text: '표준 공정', color: 'bg-slate-400' });

    if (pin.x < 40 && pin.y < 40) chips.push({ text: '최고 가성비', color: 'bg-amber-500' });

    return chips;
  };

  const getAISummary = () => {
    if (!pin) return "그래프에 점을 찍어 세차 만족도를 표현해주세요!";
    
    const timeDiff = plannedTime - actualTime;
    const isFast = timeDiff > 0;
    const isHighQuality = qualityIndex > 70;
    const carModelLabel = user?.carModel || '회원';
    
    if (isFast && isHighQuality) {
      return `${carModelLabel}님의 차량이 예상보다 ${timeDiff}분 빠르게 완료되었음에도 불구하고, 디테일한 품질이 매우 우수하게 측정되었습니다. 정량적으로 매우 만족스러운 결과입니다.`;
    } else if (!isFast && isHighQuality) {
      return `총 ${actualTime}분 동안 꼼꼼하게 작업이 진행되었습니다. 시간은 조율된 범위 내에서 최대한의 디테일을 유지하며 마무리된 리포트입니다.`;
    } else if (isFast && !isHighQuality) {
      return `신속한 완료에 집중한 작업입니다. 예정된 60분 대비 ${timeDiff}분을 아꼈으며, 가벼운 외부 오염 제거에 효과적인 세차였습니다.`;
    } else {
      return `입력된 데이터를 기반으로 전문가가 작업 공정을 재검토 중입니다. 정확한 리포트 환산을 위해 잠시만 기다려주세요.`;
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  } as const;

  const itemFade = {
    hidden: { opacity: 0, y: 30 },
    show: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }
  } as const;

  return (
    <div className="h-full flex flex-col bg-[#D1D9D9] text-slate-900 overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-5 flex items-center justify-between border-b border-slate-100 sticky top-0 z-20">
        <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-[16px] font-black text-slate-800 leading-tight">정량적 세차 리포트 리뷰</h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">정량적 매트릭스 리포트</span>
        </div>
        <div className="w-8" />
      </div>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col gap-8 pb-20 scroll-smooth"
      >
        
        {/* 0. Live Badge Preview */}
        {pin && (
          <motion.section 
            variants={itemFade}
            className="bg-white rounded-[2.5rem] p-6 shadow-xl border-4 border-slate-900 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Award size={80} strokeWidth={1} />
            </div>
            <div className="flex items-center gap-6">
              <div className={`w-20 h-20 ${currentBadge.color} rounded-2xl flex items-center justify-center text-4xl shadow-lg border-2 border-white/20`}>
                {currentBadge.icon}
              </div>
              <div className="flex-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">인증 예정 배지</span>
                <h4 className="text-2xl font-black text-slate-900 mb-1">{currentBadge.label}</h4>
                <p className="text-[12px] font-bold text-slate-500 leading-tight">
                  {currentBadge.type === 'perfect' && "최고의 밸런스와 결과물을 만들어내셨습니다!"}
                  {currentBadge.type === 'artisan' && "시간을 아끼지 않는 장인 정신이 돋보입니다."}
                  {currentBadge.type === 'ghost' && "누구보다 빠른 손놀림으로 완료하셨군요!"}
                  {currentBadge.type === 'detail' && "결과물의 퀄리티가 상당히 뛰어납니다."}
                  {currentBadge.type === 'speed' && "효율적인 시간 관리가 인상적입니다."}
                  {currentBadge.type === 'rookie' && "세차의 정석과 함께 성장하는 과정입니다."}
                </p>
              </div>
            </div>
          </motion.section>
        )}

        {/* 1. Matrix Area */}
        <motion.section variants={itemFade} className="space-y-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                 <Target size={18} strokeWidth={2.5} />
              </div>
              <h3 className="font-black text-slate-800 text-lg">2축 만족도 매트릭스</h3>
            </div>
            
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {getDataChips().map((chip, i) => (
                <motion.span 
                  key={i}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`${chip.color} text-white text-[9px] font-black px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap`}
                >
                  {chip.text}
                </motion.span>
              ))}
            </div>
          </div>
          
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 relative">
            <div className="relative mb-6 text-center">
              <span className="text-[12px] font-black text-slate-700 uppercase tracking-[0.2em] leading-none">품질 (디테일 지수)</span>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="flex flex-col justify-between py-10 h-72 text-[11px] font-black text-slate-500">
                 <span className="text-emerald-600">꼼꼼함/디테일</span>
                 <span className="text-slate-400">보통</span>
                 <span className="text-slate-400">신속함/보통</span>
              </div>
              
              <div 
                ref={matrixRef}
                onClick={handleMatrixClick}
                onTouchStart={handleMatrixClick}
                className="flex-1 aspect-square bg-slate-50/50 rounded-3xl relative overflow-hidden border-2 border-slate-200 cursor-crosshair group shadow-inner"
              >
                {/* Grid Lines */}
                <div className="absolute inset-x-0 top-1/2 border-t-2 border-dashed border-slate-300" />
                <div className="absolute inset-y-0 left-1/2 border-l-2 border-dashed border-slate-300" />
                
                {/* Labels on Grid */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 text-[11px] font-black text-emerald-600/60">최고의 디테일</div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[11px] font-black text-rose-400/60">신속함 집중</div>
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-blue-500/60 rotate-90">조기 종료</div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-orange-500/60 -rotate-90">지연 완료</div>

                {/* The Pin */}
                {pin && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-5 h-5 bg-emerald-500 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.7)] border-2 border-white" />
                    <motion.div 
                      animate={{ scale: [1, 1.8, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="absolute inset-0 bg-emerald-500 rounded-full"
                    />
                  </motion.div>
                )}
                
                {!pin && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 font-black text-center p-12 text-sm leading-relaxed pointer-events-none group-hover:scale-105 transition-transform">
                    화면의 사분면 위를<br/>터치하여 핀을 꽂으세요
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between px-16 text-[12px] font-black text-slate-700 uppercase tracking-[0.2em]">
              <span className="text-blue-600">조기 종료</span>
              <span className="text-slate-400 hidden md:inline">작업 시간 (시간 준수)</span>
              <span className="text-orange-600">지연</span>
            </div>

            {pin && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-6 right-6 bg-slate-900 text-white px-4 py-2 rounded-2xl text-[11px] font-black flex items-center gap-2 shadow-2xl border border-white/10 z-10"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {plannedTime - actualTime > 0 ? `${plannedTime - actualTime}분 단축 완료! ⏰` : `${actualTime - plannedTime}분 추가 소요`}
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* 2. Bar Graphs Section */}
        <motion.section variants={itemFade} className="space-y-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
               <BarChart3 size={18} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">기대값 vs 실제 작업 시각화</h3>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-200 flex flex-col gap-10">
            {/* Overlapping Time Bar Gauge */}
            <div className="space-y-4 text-center md:text-left">
              <div className="flex justify-between items-end">
                <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider">시간 준수 게이지</span>
                <span className="text-[13px] font-black text-slate-900">{actualTime}분 <span className="text-slate-300 mx-1">/</span> {plannedTime}분</span>
              </div>
              <div className="relative h-14 mb-8">
                <div className="relative h-12 bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-50">
                  <div className="absolute inset-0 w-full h-full bg-slate-200/50" />
                  
                  {/* Actual Bar */}
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(actualTime / (Math.max(actualTime, plannedTime) * 1.1)) * 100}%` }}
                    className={`h-full relative ${actualTime <= plannedTime ? 'bg-emerald-500' : 'bg-orange-500'} shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] transition-colors`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <span className="text-[11px] font-black text-white whitespace-nowrap drop-shadow-md">
                        실제: {actualTime}분
                      </span>
                    </div>
                  </motion.div>
                </div>

                {/* Target Marker - Moved Label to Bottom */}
                <div 
                  className="absolute inset-y-0 border-l-4 border-slate-900/30 z-10 pointer-events-none"
                  style={{ left: `${(plannedTime / (Math.max(actualTime, plannedTime) * 1.1)) * 100}%` }}
                >
                  <div className="absolute -bottom-6 -translate-x-1/2 bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded-md shadow-sm border border-slate-200">권장 (60분)</div>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 font-bold ml-1 italic mt-4">
                {actualTime <= plannedTime 
                  ? `✨ 권장 시간(60분) 대비 ${plannedTime - actualTime}분을 절약하며 매우 효율적으로 관리되었습니다.` 
                  : `⚠️ 품질 확보를 위해 권장 시간 대비 ${actualTime - plannedTime}분을 추가로 투입하여 꼼꼼하게 진행했습니다.`}
              </p>
            </div>

            {/* Satisfaction Detail Bar - Now Interactive 4 Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-black text-slate-500 uppercase tracking-wider block">4개 영역 정밀 평가 (체크리스트)</span>
                <span className="text-[10px] font-bold text-slate-400">터치하여 점수를 매기세요</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {categories.map((item, i) => (
                   <div key={i} className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm transition-all hover:bg-white">
                      <div className="flex justify-between items-center mb-4">
                         <span className="text-[11px] font-black text-slate-700">{item.label}</span>
                         <div className="flex gap-1">
                            {[1, 2, 3].map((score) => (
                               <button
                                 key={score}
                                 onClick={() => handleScoreChange(item.key, score)}
                                 className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                                   detailedScores[item.key] === score 
                                     ? `${item.color} text-white shadow-lg scale-110` 
                                     : 'bg-white text-slate-300 border border-slate-100 hover:bg-slate-100'
                                 }`}
                               >
                                 {score === 1 ? '🙁' : score === 2 ? '😐' : '😊'}
                               </button>
                            ))}
                         </div>
                      </div>
                      <div className="h-2.5 bg-white rounded-full overflow-hidden border border-slate-100 shadow-inner">
                         <motion.div 
                           initial={false}
                           animate={{ width: `${(detailedScores[item.key] / 3) * 100}%` }}
                           className={`h-full ${item.color} shadow-sm opacity-80`}
                         />
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* 2.5 Vibe Selector (Gamification) */}
        <motion.section variants={itemFade} className="space-y-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
               <Sparkles size={18} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">나만의 세차 바이브</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-200">
            <div className="flex flex-wrap gap-2">
              {vibes.map((vibe, i) => (
                <button
                  key={i}
                  onClick={() => handleVibeToggle(vibe.label)}
                  className={`px-4 py-2.5 rounded-2xl text-[13px] font-black flex items-center gap-2 transition-all active:scale-95 ${
                    selectedVibes.includes(vibe.label)
                      ? 'bg-slate-900 text-white shadow-xl scale-105'
                      : 'bg-slate-50 text-slate-500 border border-slate-100 hover:bg-slate-100'
                  }`}
                >
                  <span>{vibe.icon}</span>
                  <span>{vibe.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 font-bold mt-4 px-1 italic text-center">
              * 선택하신 태그는 리포트 하단에 스티커처럼 표시됩니다.
            </p>
          </div>
        </motion.section>

        {/* 2.5 Expert Comment Area */}
        <motion.section variants={itemFade} className="space-y-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
               <BookOpen size={18} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">고객님 상세 피드백</h3>
          </div>
          
          <div className="bg-white rounded-[2.5rem] p-6 shadow-xl border border-slate-200">
            <textarea 
              value={expertComment}
              onChange={(e) => setExpertComment(e.target.value)}
              placeholder="차량 상태에 대해 전문가의 상세한 의견을 입력해 주세요. (예: 휠 분진이 심하여 특수 약재를 사용했습니다.)"
              className="w-full h-32 bg-slate-50 border-2 border-slate-100 rounded-3xl p-5 text-sm font-bold focus:outline-none focus:border-emerald-400 transition-all resize-none placeholder:text-slate-300"
            />
          </div>
        </motion.section>

        {/* 3. AI Summary */}
        <motion.section variants={itemFade} className="space-y-4 max-w-3xl mx-auto w-full">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
               <Sparkles size={18} strokeWidth={2.5} />
            </div>
            <h3 className="font-black text-slate-800 text-lg">AI 데이터 기반 리포트 요약</h3>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden group"
          >
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -top-20 -right-20 w-80 h-80 bg-emerald-500/5 rounded-full blur-[90px]" 
            />
            
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-6 opacity-60">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">시스템 지능 분석 결과</span>
              </div>
              
              <p className="text-white font-bold text-[17px] leading-[1.8] mb-10 text-center md:text-left">
                "{getAISummary()}"
              </p>
              
              <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-6">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 group-hover:rotate-12 transition-transform">
                       <CheckCircle2 size={32} />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">리포트 검증 상태</span>
                       <span className="text-white font-black text-[15px]">정량적 분석 검증 완료</span>
                    </div>
                 </div>
                 <button 
                  disabled={!pin || isSubmitting}
                  onClick={handleSubmit}
                  className={`w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 transition-all text-white px-10 py-4 rounded-2xl text-[16px] font-black flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95 group ${(!pin || isSubmitting) ? 'opacity-50 cursor-not-allowed' : ''}`}
                 >
                    {isSubmitting ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <>
                        <span>리뷰 최종 제출</span>
                        <Sparkles size={18} className="group-hover:animate-pulse" />
                      </>
                    )}
                 </button>
              </div>
            </div>
          </motion.div>
        </motion.section>

      </motion.div>
    </div>
  );
}
