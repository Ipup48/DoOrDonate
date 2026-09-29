'use client';

import React, { useState } from 'react';
import { formatEther } from 'viem';
import { shortenAddress } from '@/lib/formatters';
import { getGoalMeta } from '@/lib/storage';
import { CHARITIES, ETHERSCAN_TX, ETHERSCAN_ADDRESS, calculateWtcBonus } from '@/lib/contract';
import { CheckCircle2, Heart, Trophy, ExternalLink, Copy, Check, Coins } from 'lucide-react';
import { Goal } from './GoalCard';

export interface HistoryCardProps {
  goal: Goal;
  now?: number;
}

export const HistoryCard: React.FC<HistoryCardProps> = ({ goal }) => {
  const meta = getGoalMeta(goal.id);

  // 1. Fallback รองรับทั้งสองแบบเสมอ: user/creator, amount/depositAmount, status
  const userAddress = goal.user || goal.creator || '';
  const rawAmount = goal.amount ?? goal.depositAmount ?? 0n;
  const goalAmountWei = typeof rawAmount === 'bigint' ? rawAmount : BigInt(rawAmount || 0);
  const ethAmountStr = formatEther(goalAmountWei);
  const bonusWtc = calculateWtcBonus(ethAmountStr);

  const statusNum = Number(goal.status !== undefined && goal.status !== null ? goal.status : (meta.status ?? 0));
  const isCompleted = statusNum === 1;
  const isFailed = statusNum === 2;

  // Fallback Title ตามเงื่อนไข: ห้าม return null เด็ดขาด
  const title =
    goal.title ||
    meta.title ||
    (isCompleted
      ? `[Demo] ทำสำเร็จ #${goal.id.toString()}`
      : isFailed
      ? `[Demo] บริจาคให้สังคม #${goal.id.toString()}`
      : `[Demo] เป้าหมาย #${goal.id.toString()}`);

  const matchedCharity = CHARITIES.find(
    (c) => c.address.toLowerCase() === goal.charityWallet.toLowerCase()
  );
  const charityName = matchedCharity ? matchedCharity.name : 'กระเป๋ามูลนิธิภายนอก';

  const [copiedCharity, setCopiedCharity] = useState(false);
  const handleCopyCharity = () => {
    navigator.clipboard.writeText(goal.charityWallet);
    setCopiedCharity(true);
    setTimeout(() => setCopiedCharity(false), 2000);
  };

  const txHash = meta.txHashAction || meta.txHashCreate;

  // การ์ดสีเขียวสำหรับทำสำเร็จ (isCompleted) และการ์ดสีแดง/กุหลาบสำหรับบริจาค (isFailed)
  const cardBorderClass = isFailed
    ? 'border-rose-500/50 bg-gradient-to-b from-rose-950/30 via-slate-900/90 to-slate-950/80 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/20'
    : 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/30 via-slate-900/90 to-slate-950/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/20';

  return (
    <div className={`glass-card flex flex-col justify-between rounded-2xl p-5 transition-all ${cardBorderClass}`}>
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-slate-500">#{goal.id.toString()}</span>
              {isCompleted ? (
                <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>✅ สำเร็จ: คืนเงิน + โบนัสแล้ว</span>
                </span>
              ) : (
                <span
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    matchedCharity?.isPool
                      ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                      : 'border-rose-500/40 bg-rose-500/15 text-rose-300'
                  }`}
                >
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
              )}
            </div>

            <div className="mt-2">
              <h3 className="text-base font-bold text-slate-100 sm:text-lg">{title}</h3>
            </div>
          </div>

          <div className="text-right flex flex-col items-end">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Coins className="h-3.5 w-3.5 text-amber-400" />
              <span>{isCompleted ? 'เงินมัดจำที่ได้รับคืน' : 'ยอดเงินบริจาค'}</span>
            </div>
            <div
              className={`text-base font-bold sm:text-lg font-mono ${
                isCompleted ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {parseFloat(ethAmountStr).toFixed(3)}{' '}
              <span className="text-xs font-normal text-slate-400">ETH</span>
            </div>
            {isCompleted && (
              <div
                className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 font-mono shadow-sm"
                title={`ได้รับโบนัส +${bonusWtc} WTC`}
              >
                <span>🪙</span>
                <span>+{bonusWtc} WTC</span>
              </div>
            )}
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
      </div>

      {/* Card Footer: Summary & Etherscan */}
      <div className="mt-5 border-t border-slate-800/80 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>🎉 ได้รับเงินมัดจำคืน {parseFloat(ethAmountStr).toFixed(3)} ETH + โบนัส {bonusWtc} WTC แล้ว</span>
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
      </div>
    </div>
  );
};
