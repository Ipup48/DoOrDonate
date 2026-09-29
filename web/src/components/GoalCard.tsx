import React, { useState } from 'react';
import { formatEther } from 'viem';
import {
  shortenAddress,
  formatSecondsLeft,
  calculateTimeProgress,
} from '@/lib/formatters';
import { getGoalMeta, saveGoalMeta } from '@/lib/storage';
import { CHARITIES, ETHERSCAN_TX } from '@/lib/contract';
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
} from 'lucide-react';

export interface Goal {
  id: bigint;
  user: string;
  amount: bigint;
  deadline: bigint;
  charityWallet: string;
  isCompleted: boolean;
  isClaimed: boolean;
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
  const title = meta.title || `เป้าหมาย #${goal.id.toString()}`;

  const secondsLeft = Number(goal.deadline) - now;
  const timeInfo = formatSecondsLeft(secondsLeft);
  const progress = calculateTimeProgress(meta.createdAt, Number(goal.deadline), now);

  const [copiedCharity, setCopiedCharity] = useState(false);
  const [confirmRefund, setConfirmRefund] = useState(false);

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

  // สถานะของเป้าหมาย
  let statusBadge = null;
  if (!goal.isClaimed) {
    if (!timeInfo.isExpired) {
      statusBadge = (
        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          กำลังดำเนินการ
        </span>
      );
    } else {
      statusBadge = (
        <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300">
          <Clock className="h-3.5 w-3.5" />
          หมดเวลาแล้ว - รอส่งมอบเงิน
        </span>
      );
    }
  } else {
    if (goal.isCompleted) {
      statusBadge = (
        <span className="flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-2.5 py-1 text-xs font-semibold text-teal-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          สำเร็จ: คืนเงินแล้ว
        </span>
      );
    } else {
      statusBadge = (
        <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300">
          <Heart className="h-3.5 w-3.5" />
          ไม่สำเร็จ: บริจาคให้มูลนิธิแล้ว
        </span>
      );
    }
  }

  const txHash = meta.txHashAction || meta.txHashCreate;

  return (
    <div className="glass-card flex flex-col justify-between rounded-2xl p-5 transition-all hover:border-slate-700/80">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-slate-500">#{goal.id.toString()}</span>
              {statusBadge}
            </div>
            <h3 className="mt-2 text-base font-bold text-slate-100 sm:text-lg">{title}</h3>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>เงินมัดจำ</span>
            </div>
            <div className="text-base font-bold text-emerald-400 sm:text-lg font-mono">
              {parseFloat(formatEther(goal.amount)).toFixed(3)}{' '}
              <span className="text-xs font-normal text-slate-400">ETH</span>
            </div>
          </div>
        </div>

        {/* ข้อมูลมูลนิธิ */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 p-2.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 min-w-0">
            <Heart className="h-4 w-4 shrink-0 text-rose-400" />
            <div className="truncate">
              <span className="text-slate-300 font-medium">{charityName}</span>
              <span className="hidden sm:inline font-mono text-[11px] text-slate-500 ml-1.5">
                ({shortenAddress(goal.charityWallet)})
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyCharity}
            className="flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-[11px] text-slate-300 hover:bg-slate-700"
            title="คัดลอก Wallet Address มูลนิธิ"
          >
            {copiedCharity ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-slate-400" />}
            <span>{copiedCharity ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
          </button>
        </div>

        {/* ตัวนับถอยหลัง & Progress Bar (เฉพาะเป้าหมายที่ยังไม่จบ) */}
        {!goal.isClaimed && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {timeInfo.isExpired ? 'สถานะเวลา' : 'เวลาที่เหลืออยู่'}
              </span>
              <span
                className={`font-semibold font-mono ${
                  timeInfo.isExpired ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {timeInfo.text}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  timeInfo.isExpired ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
                style={{ width: `${timeInfo.isExpired ? 100 : progress}%` }}
              />
            </div>
          </div>
        )}

        {/* ส่วนแสดงหลักฐาน (Proof) */}
        <div className="mt-3">
          {meta.proof ? (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-2.5 text-xs text-slate-300">
              <div className="flex items-center justify-between font-semibold text-emerald-400">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  หลักฐานความสำเร็จ:
                </span>
                {!goal.isClaimed && isOwner && (
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
            !goal.isClaimed &&
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
        {!goal.isClaimed && !timeInfo.isExpired && isOwner && (
          <div className="space-y-2">
            {!confirmRefund ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenProofModal(goal.id, title)}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800/60 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"
                >
                  📎 {meta.proof ? 'แก้ไขหลักฐาน' : 'แนบหลักฐาน'}
                </button>
                <button
                  onClick={() => setConfirmRefund(true)}
                  disabled={isBusy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-glow transition hover:bg-emerald-500 active:scale-95 disabled:opacity-50"
                >
                  <Award className="h-3.5 w-3.5" />
                  <span>ทำสำเร็จแล้ว (ขอเงินคืน)</span>
                </button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-2.5 text-center">
                <p className="text-xs text-emerald-300 font-medium">
                  ยืนยันว่าทำเป้าหมายสำเร็จแล้ว และต้องการรับเงินมัดจำคืน?
                </p>
                <div className="mt-2 flex justify-center gap-2">
                  <button
                    onClick={() => setConfirmRefund(false)}
                    className="rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    ยกเลิก
                  </button>
                  <button
                    onClick={() => {
                      onRefund(goal.id);
                      setConfirmRefund(false);
                    }}
                    disabled={isBusy}
                    className="rounded-lg bg-emerald-500 px-3.5 py-1 text-xs font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    ยืนยันขอรับเงินคืน
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* กรณี: หมดเวลาแล้ว และยังไม่ได้ Claim (ใครก็กดบริจาคได้) */}
        {!goal.isClaimed && timeInfo.isExpired && (
          <button
            onClick={() => onDonate(goal.id)}
            disabled={isBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 py-2.5 text-xs font-bold text-white shadow-lg transition hover:from-rose-500 hover:to-rose-400 disabled:opacity-50"
          >
            <Heart className="h-3.5 w-3.5" />
            <span>โอนเงินมัดจำให้มูลนิธิ (หมดเวลาแล้ว)</span>
          </button>
        )}

        {/* กรณี: Claimed แล้ว (ประวัติ) */}
        {goal.isClaimed && (
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              {goal.isCompleted ? (
                <span className="text-emerald-400">🎉 ได้รับเงินมัดจำคืนเรียบร้อย</span>
              ) : (
                <span className="text-rose-400">❤️ ส่งมอบเงินบริจาคเรียบร้อย</span>
              )}
            </span>

            {txHash && (
              <a
                href={ETHERSCAN_TX + txHash}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
              >
                <span>ดูบน Etherscan</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
