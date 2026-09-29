import React, { useState } from 'react';
import { formatEther } from 'viem';
import {
  shortenAddress,
  formatSecondsLeft,
  calculateTimeProgress,
} from '@/lib/formatters';
import { getGoalMeta, saveGoalMeta } from '@/lib/storage';
import { CHARITIES, ETHERSCAN_TX, ETHERSCAN_ADDRESS, calculateWtcBonus } from '@/lib/contract';
import {
  Clock,
  Coins,
  Heart,
  Paperclip,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Award,
  ArrowUpRight,
  Gift,
  Trophy,
  Lock,
  Sparkles,
  Pencil,
  Zap,
} from 'lucide-react';

export interface Goal {
  id: bigint;
  user?: string;
  creator?: string;
  amount?: bigint;
  depositAmount?: bigint;
  createdAt?: bigint;
  deadline: bigint;
  charityWallet: string;
  isCompleted?: boolean;
  isClaimed?: boolean;
  status?: number | string; // 0: Active, 1: Completed, 2: Failed
  title?: string;
}

interface Props {
  goal: Goal;
  now: number;
  isOwner: boolean;
  onOpenProofModal: (goalId: bigint, title: string) => void;
  onRefund: (goalId: bigint) => void;
  onDonate: (goalId: bigint) => void;
  isBusy: boolean;
}

export const GoalCard: React.FC<Props> = ({
  goal,
  now,
  isOwner,
  onOpenProofModal,
  onRefund,
  onDonate,
  isBusy,
}) => {
  const meta = getGoalMeta(goal.id);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(meta.title || goal.title || '');
  const [currentTitle, setCurrentTitle] = useState(meta.title || goal.title || '');

  // 1. Fallback รองรับทั้งสองแบบเสมอ: user/creator, amount/depositAmount, status
  const userAddress = goal.user || goal.creator || '';
  const rawAmount = goal.amount ?? goal.depositAmount ?? 0n;
  const statusNum = Number(goal.status !== undefined && goal.status !== null ? goal.status : (meta.status ?? 0));
  const isActive = statusNum === 0;
  const isCompleted = statusNum === 1;
  const isFailed = statusNum === 2;

  // กำหนด Fallback Title เสมอ ห้ามแสดงค่าว่าง หรือ return null เด็ดขาด
  const fallbackTitle = isCompleted
    ? `[Demo] ทำสำเร็จ #${goal.id.toString()}`
    : isFailed
    ? `[Demo] บริจาคให้สังคม #${goal.id.toString()}`
    : `[Demo] เป้าหมาย #${goal.id.toString()}`;

  const displayTitle = goal.title || currentTitle || meta.title || fallbackTitle;
  const title = displayTitle;

  const handleSaveTitle = () => {
    const trimmed = titleInput.trim();
    if (trimmed) {
      saveGoalMeta(goal.id, { title: trimmed });
      setCurrentTitle(trimmed);
    }
    setEditingTitle(false);
  };

  // คำนวณเวลาที่สร้างและกำหนดส่ง
  const hasOnChainCreatedAt = Number(goal.createdAt || 0n) > 0;
  const createdAtNum = hasOnChainCreatedAt
    ? Number(goal.createdAt)
    : (meta.createdAt || (Number(goal.deadline) - 3 * 86400));
  const deadlineNum = Number(goal.deadline);
  const totalDuration = Math.max(1, deadlineNum - createdAtNum);

  // สถานะโหมดเดโม (รองรับทั้งจาก metadata และการกดสลับโหมดสดบนหน้าจอเพื่อสาธิต)
  const [demoState, setDemoState] = useState<boolean | null>(null);
  const isDemoGoal = demoState !== null
    ? demoState
    : Boolean(meta.isDemo || (totalDuration <= 3600 && totalDuration > 0));

  // สถานะโหมดเดโมหมดอายุ (Demo Expired สำหรับสาธิตส่งมอบเงินบริจาค)
  const [expiredDemoState, setExpiredDemoState] = useState<boolean | null>(null);
  const isExpiredDemo = expiredDemoState !== null
    ? expiredDemoState
    : Boolean(meta.isExpiredDemo);

  const secondsLeft = deadlineNum - now;
  const timeInfo = formatSecondsLeft(secondsLeft);
  const isGoalExpired = Boolean(isExpiredDemo || timeInfo.isExpired);
  const isEffectiveDemoGoal = isDemoGoal && !isGoalExpired;

  const handleToggleDemo = () => {
    const nextVal = !isEffectiveDemoGoal;
    setDemoState(nextVal);
    saveGoalMeta(goal.id, { isDemo: nextVal });
    if (nextVal && isExpiredDemo) {
      setExpiredDemoState(false);
      saveGoalMeta(goal.id, { isExpiredDemo: false });
    }
  };

  const handleToggleExpiredDemo = () => {
    const nextVal = !isExpiredDemo;
    setExpiredDemoState(nextVal);
    saveGoalMeta(goal.id, { isExpiredDemo: nextVal });
    if (nextVal && isEffectiveDemoGoal) {
      setDemoState(false);
      saveGoalMeta(goal.id, { isDemo: false });
    }
  };

  // คำนวณเวลาปลดล็อก Time-Lock (ต้องผ่านอย่างน้อย 80% ของระยะเวลาทั้งหมด)
  // หากเป็นโหมดเดโม (isEffectiveDemoGoal) ปลดล็อกทันที (Instant Unlock) เพื่อสาธิตให้อาจารย์ดู
  // หากเป็นสัญญาเดิม V1 บนเชนที่ไม่มี on-chain createdAt จะปลดล็อกทันทีเพื่อไม่ให้เงินติดค้าง
  // หากเป็นสัญญา V2 และเป้าหมายปกติ จะบังคับ Time-Lock 80%
  const unlockTimestamp = isEffectiveDemoGoal
    ? createdAtNum
    : (createdAtNum + Math.floor(totalDuration * 0.8));
  const isTimeLocked = isEffectiveDemoGoal || isGoalExpired
    ? false
    : (hasOnChainCreatedAt ? (now < unlockTimestamp) : false);
  const timeUntilUnlock = Math.max(0, unlockTimestamp - now);
  const unlockTimeInfo = formatSecondsLeft(timeUntilUnlock);

  // คำนวณความคืบหน้าของเวลา
  const elapsed = Math.max(0, now - createdAtNum);
  const totalProgressPercent = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
  const unlockDuration = totalDuration * 0.8;
  const progressTo80 = unlockDuration > 0
    ? Math.min(100, Math.max(0, Math.round((elapsed / unlockDuration) * 100)))
    : 100;

  const [copiedCharity, setCopiedCharity] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);
  const [confirmDonate, setConfirmDonate] = useState(false);

  // คำนวณโบนัส WTC ที่จะได้รับ (1 ETH = 10 WTC)
  const goalAmountWei = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount || 0);
  const ethAmountStr = formatEther(goalAmountWei);
  const bonusWtc = calculateWtcBonus(ethAmountStr);

  // หาชื่อมูลนิธิจาก list
  const matchedCharity = CHARITIES.find(
    (c) => c.address.toLowerCase() === goal.charityWallet.toLowerCase()
  );
  const charityName = matchedCharity ? matchedCharity.name : 'กระเป๋ามูลนิธิภายนอก';

  const handleCopyCharity = () => {
    navigator.clipboard.writeText(goal.charityWallet);
    setCopiedCharity(true);
    setTimeout(() => setCopiedCharity(false), 2000);
  };

  // ตรวจสอบสถานะการจบเป้าหมาย (Settled / Claimed / Failed / Completed)
  const isSettled = isCompleted || isFailed || Boolean(goal.isClaimed || meta.isClaimed);

  // สถานะของเป้าหมาย
  let statusBadge = null;
  if (!isSettled) {
    if (isGoalExpired) {
      statusBadge = (
        <span className="flex items-center gap-1.5 rounded-full border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300 shadow-sm animate-pulse">
          <Clock className="h-3.5 w-3.5 text-rose-400" />
          <span>⌛ หมดเวลาแล้ว (Expired)</span>
        </span>
      );
    } else if (isEffectiveDemoGoal) {
      statusBadge = (
        <span className="flex items-center gap-1.5 rounded-full border border-purple-500/40 bg-purple-500/15 px-2.5 py-1 text-xs font-bold text-purple-300 shadow-sm animate-pulse">
          <Zap className="h-3 w-3 text-purple-400" />
          <span>⚡ Presentation Demo (Instant Unlock)</span>
        </span>
      );
    } else {
      if (isTimeLocked) {
        statusBadge = (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
            <Lock className="h-3 w-3" />
            <span>Time-Lock (รอครบ 80%)</span>
          </span>
        );
      } else {
        statusBadge = (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ปลดล็อกแล้ว (พร้อมคืนเงิน)
          </span>
        );
      }
    }
  } else {
    if (isCompleted) {
      statusBadge = (
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>✅ สำเร็จ: คืนเงิน + โบนัสแล้ว</span>
        </span>
      );
    } else {
      statusBadge = (
        <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
          matchedCharity?.isPool
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
            : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
        }`}>
          {matchedCharity?.isPool ? (
            <>
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span>🏆 สมทบเข้ากองทุนผู้ทำสำเร็จแล้ว</span>
            </>
          ) : (
            <>
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              <span>❤️ บริจาคให้สังคมแล้ว</span>
            </>
          )}
        </span>
      );
    }
  }

  const txHash = meta.txHashAction || meta.txHashCreate;

  const cardBorderClass = isFailed
    ? 'border-rose-500/50 bg-gradient-to-b from-rose-950/30 via-slate-900/90 to-slate-950/80 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/20'
    : isCompleted
    ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 via-slate-900/90 to-slate-950/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/20'
    : isEffectiveDemoGoal
    ? 'border-purple-500/40 bg-slate-900/90'
    : isGoalExpired
    ? 'border-rose-500/40 bg-slate-900/90'
    : 'border-slate-800 bg-slate-900/80 hover:border-slate-700/80';

  return (
    <div className={`glass-card flex flex-col justify-between rounded-2xl p-5 transition-all ${cardBorderClass}`}>
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-500">#{goal.id.toString()}</span>
              {statusBadge}
              {!isSettled && isOwner && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleToggleDemo}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                      isEffectiveDemoGoal
                        ? 'border-purple-500/40 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-purple-300 hover:border-purple-500/40'
                    }`}
                    title={isEffectiveDemoGoal ? 'คลิกเพื่อสลับกลับเป็นเป้าหมายปกติ' : 'คลิกเพื่อเปิดโหมดสาธิตนำเสนออาจารย์ (ปลดล็อกทันที)'}
                  >
                    {isEffectiveDemoGoal ? '✓ โหมดเดโมเคลม' : '⚡ สลับเป็นเคลมทันที'}
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleExpiredDemo}
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg border transition ${
                      isExpiredDemo
                        ? 'border-rose-500/40 bg-rose-950/40 text-rose-300 hover:bg-rose-900/50'
                        : 'border-slate-700 bg-slate-800/80 text-slate-400 hover:text-rose-300 hover:border-rose-500/40'
                    }`}
                    title={isExpiredDemo ? 'คลิกเพื่อสลับกลับเป็นเป้าหมายปกติ' : 'คลิกเพื่อจำลองสถานะหมดเวลา เพื่อสาธิตปุ่มส่งมอบเงินบริจาค'}
                  >
                    {isExpiredDemo ? '✓ โหมดหมดเวลา' : '💔 สลับเป็นหมดอายุ'}
                  </button>
                </div>
              )}
            </div>
            {editingTitle ? (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="ระบุชื่อเป้าหมาย..."
                  className="w-full max-w-xs rounded-xl border border-emerald-500/50 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveTitle}
                  className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTitle(false)}
                  className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="group mt-2 flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-100 sm:text-lg">{title}</h3>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => {
                      setTitleInput(meta.title || currentTitle || title);
                      setEditingTitle(true);
                    }}
                    title="แก้ไขชื่อเป้าหมาย"
                    className="opacity-0 group-hover:opacity-100 transition rounded-lg p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>เงินมัดจำ</span>
            </div>
            <div className="text-base font-bold text-emerald-400 sm:text-lg font-mono">
              {parseFloat(ethAmountStr).toFixed(3)}{' '}
              <span className="text-xs font-normal text-slate-400">ETH</span>
            </div>
            {/* ป้ายแสดงโบนัส WTC ที่จะได้รับ */}
            <div
              className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 font-mono shadow-sm"
              title={`โบนัส ${bonusWtc} WTC คำนวณจากยอดมัดจำ (1 ETH = 10 WTC)`}
            >
              <span>🪙</span>
              <span>+{bonusWtc} WTC</span>
            </div>
          </div>
        </div>

        {/* ข้อมูลมูลนิธิ หรือ กองทุน */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            {matchedCharity?.isPool ? (
              <Trophy className="h-4 w-4 shrink-0 text-amber-400" />
            ) : (
              <Heart className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <div className="truncate">
              <span className={matchedCharity?.isPool ? 'text-amber-200 font-semibold' : 'text-slate-300 font-medium'}>
                {charityName}
              </span>
              <span className="hidden sm:inline font-mono text-[11px] text-slate-500 ml-1.5">
                ({shortenAddress(goal.charityWallet)})
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyCharity}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
            title="คัดลอก Address ผู้รับเงิน"
          >
            {copiedCharity ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-[11px]">{copiedCharity ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
          </button>
        </div>

        {/* ตัวนับเวลาถอยหลัง & Progress Bar */}
        {!isSettled && (
          <div className="mt-4 space-y-2 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-emerald-400" />
                <span>เวลาที่เหลือสิ้นสุดเป้าหมาย:</span>
              </div>
              <span
                className={`font-mono font-bold ${
                  isGoalExpired ? 'text-rose-400' : secondsLeft < 86400 ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {isGoalExpired ? 'หมดเวลาแล้ว (Expired)' : timeInfo.text}
              </span>
            </div>

            {/* แถบ Progress Bar ของระยะเวลาทั้งหมด */}
            <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  isGoalExpired
                    ? 'bg-rose-500'
                    : isTimeLocked
                    ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${isGoalExpired ? 100 : totalProgressPercent}%` }}
              />
              {/* เส้นขีด 80% Anti-Farming Marker */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-yellow-300/80 shadow-glow"
                style={{ left: '80%' }}
                title="จุดปลดล็อก Anti-Farming (80%)"
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>เริ่ม ({isGoalExpired ? 100 : totalProgressPercent}%)</span>
              <span className="text-amber-400/90 font-semibold">🔒 ปลดล็อกที่ 80%</span>
              <span>ครบกำหนด (100%)</span>
            </div>
          </div>
        )}

        {/* แจ้งเตือนสถานะ: หมดเวลา / Time-Lock 80% / Demo Presentation */}
        {!isSettled && (
          <div className="mt-3">
            {isGoalExpired ? (
              <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-2.5 text-xs text-rose-200">
                <div className="flex items-center justify-between font-bold text-rose-300">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                    เป้าหมายหมดเวลาแล้ว (Expired Goal)
                  </span>
                  <span className="rounded-full bg-rose-500/25 px-2 py-0.5 text-[10px] font-bold text-rose-300 border border-rose-500/40">
                    พร้อมส่งมอบเงิน
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-rose-200/80 leading-relaxed">
                  เนื่องจากเป้าหมายนี้หมดเวลาก่อนทำสำเร็จ เงินมัดจำจำนวน{' '}
                  <strong className="text-white font-mono">{parseFloat(ethAmountStr).toFixed(3)} ETH</strong>{' '}
                  จะถูกส่งมอบให้แก่{' '}
                  <strong className={matchedCharity?.isPool ? 'text-amber-300' : 'text-rose-300'}>
                    {charityName}
                  </strong>{' '}
                  ตามเจตจำนงที่บันทึกไว้ใน Smart Contract
                </p>
              </div>
            ) : isEffectiveDemoGoal ? (
              <div className="rounded-xl border border-purple-500/40 bg-purple-950/25 p-2.5 text-xs text-purple-200">
                <div className="flex items-center justify-between font-bold text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                    โหมดสาธิตนำเสนออาจารย์ (Instant Unlock Active)
                  </span>
                  <span className="rounded-full bg-purple-500/25 px-2 py-0.5 text-[10px] font-bold text-purple-300 border border-purple-500/40">
                    พร้อมเคลมทันที
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-purple-200/80 leading-relaxed">
                  เป้าหมายนี้สร้างในโหมดสาธิต ได้รับการยกเว้น Time-Lock 80% เพื่อให้สามารถทดลองกดรับเงินมัดจำคืน 100% + โบนัสเหรียญ WTC แสดงให้อาจารย์ดูได้ทันที
                </p>
              </div>
            ) : isTimeLocked ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5 text-xs">
                <div className="flex items-center justify-between text-amber-300">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    Anti-Farming Time-Lock:
                  </span>
                  <span className="font-mono font-bold text-amber-200">
                    ปลดล็อกในอีก {unlockTimeInfo.text}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                    <span>ความคืบหน้าสู่การปลดล็อก (เป้าหมาย 80%)</span>
                    <span className="font-mono text-amber-300 font-bold">{progressTo80}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                      style={{ width: `${progressTo80}%` }}
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  🛡️ ต้องทำตามเป้าหมายผ่านไปแล้วอย่างน้อย 80% ของระยะเวลาทั้งหมด เพื่อป้องกันการปั๊มเหรียญรางวัล
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-2 text-xs flex items-center justify-between text-emerald-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  ผ่านเกณฑ์ 80% แล้ว ({totalProgressPercent}% ของเวลา)
                </span>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  พร้อมรับเงินคืน + โบนัส WTC
                </span>
              </div>
            )}
          </div>
        )}

        {/* ส่วนแสดงหลักฐาน (Proof) */}
        <div className="mt-4">
          {meta.proof ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1.5 font-medium text-slate-300">
                  <Paperclip className="h-3.5 w-3.5 text-emerald-400" />
                  หลักฐานความสำเร็จ:
                </span>
                {!goal.isClaimed && isOwner && !isGoalExpired && (
                  <button
                    onClick={() => onOpenProofModal(goal.id, title)}
                    className="text-[11px] underline hover:text-emerald-300"
                  >
                    แก้ไข
                  </button>
                )}
              </div>
              <p className="mt-1 text-slate-300 break-words font-mono text-[11px]">
                {meta.proof.startsWith('http') ? (
                  <a
                    href={meta.proof}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 underline hover:text-blue-300 flex items-center gap-1"
                  >
                    <span>{meta.proof}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                ) : (
                  meta.proof
                )}
              </p>
            </div>
          ) : (
            !isSettled &&
            !isGoalExpired &&
            isOwner && (
              <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-800 p-2.5 text-xs text-slate-400">
                <span>ยังไม่ได้แนบหลักฐานความสำเร็จ</span>
                <button
                  onClick={() => onOpenProofModal(goal.id, title)}
                  className="flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700"
                >
                  <Paperclip className="h-3 w-3" />
                  แนบหลักฐาน
                </button>
              </div>
            )
          )}
        </div>
      </div>

      {/* Card Actions */}
      <div className="mt-5 border-t border-slate-800/80 pt-4">
        {/* กรณี: กำลังทำอยู่ และยังไม่หมดเวลา */}
        {!isSettled && !isGoalExpired && isOwner && (
          <div className="space-y-2">
            {isTimeLocked ? (
              /* ถ้ายังไม่ถึง 80%: ปุ่มถูก Disable และแจ้งข้อความรอผ่าน 80% */
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenProofModal(goal.id, title)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  📎 {meta.proof ? 'แก้ไขหลักฐาน' : 'แนบหลักฐาน'}
                </button>
                <button
                  disabled={true}
                  className="flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl border border-amber-500/30 bg-slate-900/90 py-2.5 text-xs font-bold text-slate-400 cursor-not-allowed opacity-75 shadow-inner"
                  title={`ปลดล็อกเมื่อผ่าน 80% ของระยะเวลา (รออีก ${unlockTimeInfo.text})`}
                >
                  <Lock className="h-3.5 w-3.5 text-amber-400" />
                  <span>ยังไม่ครบกำหนด (รอผ่าน 80% ของระยะเวลา)</span>
                </button>
              </div>
            ) : !confirmRefund ? (
              /* เมื่อผ่าน 80% ขึ้นไป หรือ Demo Instant: เปิดปุ่มทำสำเร็จให้กดได้ตามปกติ */
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenProofModal(goal.id, title)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2.5 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  📎 {meta.proof ? 'แก้ไขหลักฐาน' : 'แนบหลักฐาน'}
                </button>
                <button
                  onClick={() => setConfirmRefund(true)}
                  disabled={isBusy}
                  className={`flex flex-[1.4] items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-slate-950 shadow-glow transition active:scale-95 disabled:opacity-50 ${
                    isEffectiveDemoGoal
                      ? 'bg-gradient-to-r from-purple-400 via-emerald-400 to-teal-300 hover:opacity-95'
                      : 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400'
                  }`}
                >
                  {isEffectiveDemoGoal ? (
                    <Zap className="h-3.5 w-3.5 text-slate-950" />
                  ) : (
                    <Award className="h-3.5 w-3.5 text-slate-950" />
                  )}
                  <span>{isEffectiveDemoGoal ? '⚡ ทำสำเร็จทันที (สาธิตคืน 100% + WTC)' : 'ทำสำเร็จ (รับเงินคืน 100% + WTC)'}</span>
                </button>
              </div>
            ) : (
              /* Pop-up ยืนยันการขอรับเงินคืน */
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-3 text-center">
                <p className="text-xs text-emerald-300 font-bold">
                  ยืนยันว่าทำเป้าหมายสำเร็จแล้ว?
                </p>
                <p className="mt-1 text-[11px] text-slate-300">
                  คุณจะได้รับเงินมัดจำคืน <strong className="text-emerald-400">{parseFloat(ethAmountStr).toFixed(3)} ETH</strong> เต็มจำนวน 100% พร้อมโบนัส <strong className="text-amber-300">+{bonusWtc} WTC</strong> โอนเข้ากระเป๋าทันที
                </p>
                <div className="mt-2.5 flex justify-center gap-2">
                  <button
                    onClick={() => setConfirmRefund(false)}
                    className="rounded-lg border border-slate-700 px-3.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      onRefund(goal.id);
                      setConfirmRefund(false);
                    }}
                    disabled={isBusy}
                    className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-1 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 shadow-glow"
                  >
                    <Gift className="h-3.5 w-3.5" />
                    <span>ยืนยันขอรับเงินคืน 100% + โบนัส WTC</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* กรณี: หมดเวลาแล้ว และยังไม่ได้ Claim (ใครก็กดบริจาค/ส่งเข้า Pool ได้) */}
        {!isSettled && isGoalExpired && (
          <div className="space-y-2">
            {!confirmDonate ? (
              <button
                onClick={() => setConfirmDonate(true)}
                disabled={isBusy}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold shadow-lg transition active:scale-95 disabled:opacity-50 ${
                  matchedCharity?.isPool
                    ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-extrabold shadow-amber-500/20'
                    : 'bg-gradient-to-r from-rose-600 via-rose-500 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white shadow-rose-600/20'
                }`}
              >
                {matchedCharity?.isPool ? (
                  <>
                    <Trophy className="h-4 w-4" />
                    <span>🏆 ส่งมอบเงินเข้ากองทุนผู้ทำสำเร็จ (Achiever Pool)</span>
                  </>
                ) : (
                  <>
                    <Heart className="h-4 w-4" />
                    <span>💔 ส่งมอบเงินบริจาคเข้ามูลนิธิ (Donate to Charity)</span>
                  </>
                )}
              </button>
            ) : (
              <div className={`rounded-xl border p-3 text-center ${
                matchedCharity?.isPool
                  ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                  : 'border-rose-500/40 bg-rose-950/30 text-rose-200'
              }`}>
                <p className="text-xs font-bold">
                  {matchedCharity?.isPool
                    ? 'ยืนยันส่งมอบเงินมัดจำเข้ากองทุนผู้ทำสำเร็จ?'
                    : 'ยืนยันการส่งมอบเงินมัดจำบริจาคแก่มูลนิธิ?'}
                </p>
                <p className="mt-1 text-[11px] text-slate-300">
                  เงินมัดจำจำนวน <strong className="text-white font-mono">{parseFloat(ethAmountStr).toFixed(3)} ETH</strong> จะถูกโอนออกจาก Smart Contract ไปยัง {charityName}
                </p>
                <div className="mt-2.5 flex justify-center gap-2">
                  <button
                    onClick={() => setConfirmDonate(false)}
                    className="rounded-lg border border-slate-700 px-3.5 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      onDonate(goal.id);
                      setConfirmDonate(false);
                    }}
                    disabled={isBusy}
                    className={`flex items-center gap-1.5 rounded-lg px-4 py-1 text-xs font-bold shadow-md ${
                      matchedCharity?.isPool
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 hover:from-amber-400 hover:to-yellow-400'
                        : 'bg-gradient-to-r from-rose-600 to-pink-600 text-white hover:from-rose-500 hover:to-pink-500'
                    }`}
                  >
                    {matchedCharity?.isPool ? <Trophy className="h-3.5 w-3.5" /> : <Heart className="h-3.5 w-3.5" />}
                    <span>ยืนยันทำรายการบน MetaMask</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* กรณี: Settled / Claimed แล้ว หรือ status === 1, 2 (ประวัติ) */}
        {isSettled && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              {isCompleted ? (
                <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>🎉 ได้รับเงินมัดจำคืน {parseFloat(ethAmountStr).toFixed(3)} ETH + โบนัส {bonusWtc} WTC</span>
                </span>
              ) : matchedCharity?.isPool ? (
                <span className="text-amber-400 font-medium flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                  <span>ส่งมอบเงินมัดจำ {parseFloat(ethAmountStr).toFixed(3)} ETH เข้ากองทุนผู้ทำสำเร็จเรียบร้อยแล้ว</span>
                </span>
              ) : (
                <span className="text-rose-400 font-medium flex items-center gap-1.5">
                  <Heart className="h-4 w-4 text-rose-400 shrink-0" />
                  <span>ส่งมอบเงินบริจาค {parseFloat(ethAmountStr).toFixed(3)} ETH ให้แก่ {charityName} เรียบร้อยแล้ว</span>
                </span>
              )}
            </div>

            <a
              href={txHash ? `${ETHERSCAN_TX}${txHash}` : `${ETHERSCAN_ADDRESS}${goal.charityWallet}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-blue-400 hover:text-blue-300 hover:border-slate-600 font-medium whitespace-nowrap self-start sm:self-auto text-xs transition"
            >
              <span>ดู Etherscan</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

export { HistoryCard } from './HistoryCard';
