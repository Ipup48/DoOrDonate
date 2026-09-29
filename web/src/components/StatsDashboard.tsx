import React from 'react';
import { formatEther } from 'viem';
import { Target, Lock, CheckCircle2, HeartHandshake, Gift } from 'lucide-react';
import { WTC_REWARD_RATE } from '@/lib/contract';

interface Goal {
  id: bigint;
  user?: string;
  creator?: string;
  amount?: bigint;
  depositAmount?: bigint;
  deadline: bigint;
  charityWallet: string;
  isCompleted?: boolean;
  isClaimed?: boolean;
  status?: number | string; // 0: Active, 1: Completed, 2: Failed
  title?: string;
}

interface Props {
  goals: Goal[];
  now: number;
}

export const StatsDashboard: React.FC<Props> = ({ goals }) => {
  const activeGoals = goals.filter((g) => Number(g.status) === 0);
  const completedGoals = goals.filter((g) => Number(g.status) === 1);
  const failedGoals = goals.filter((g) => Number(g.status) === 2);

  const getAmountWei = (g: Goal): bigint => {
    const raw = g.amount ?? g.depositAmount ?? 0n;
    return typeof raw === 'bigint' ? raw : BigInt(raw || 0);
  };

  const activeLockedWei = activeGoals.reduce((sum, g) => sum + getAmountWei(g), 0n);
  const refundedWei = completedGoals.reduce((sum, g) => sum + getAmountWei(g), 0n);

  const totalDonatedEth = failedGoals.reduce((sum, g) => {
    const amt = g.amount ?? g.depositAmount ?? 0n;
    return sum + parseFloat(formatEther(BigInt(amt)));
  }, 0);

  const activeEthNum = parseFloat(formatEther(activeLockedWei));
  const refundedEthNum = parseFloat(formatEther(refundedWei));
  const donatedEthNum = totalDonatedEth;

  // คำนวณโบนัส WTC
  const pendingWtcBonus = parseFloat((activeEthNum * WTC_REWARD_RATE).toFixed(3));
  const earnedWtcBonus = parseFloat((refundedEthNum * WTC_REWARD_RATE).toFixed(3));

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {/* มัดจำที่กำลังล็อคอยู่ */}
      <div className="glass-card flex flex-col justify-between rounded-2xl p-4 transition-all hover:translate-y-[-2px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">เงินมัดจำที่ล็อคอยู่</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Lock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-lg font-bold text-emerald-400 sm:text-2xl font-mono">
            {activeEthNum.toFixed(3)}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">ETH</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-300 font-mono">
            <span>🪙</span>
            <span>รอรับ +{pendingWtcBonus} WTC</span>
          </div>
        </div>
      </div>

      {/* เป้าหมายที่กำลังทำ */}
      <div className="glass-card flex flex-col justify-between rounded-2xl p-4 transition-all hover:translate-y-[-2px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">เป้าหมายกำลังทำ</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
            <Target className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-lg font-bold text-blue-400 sm:text-2xl">
            {activeGoals.length}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">รายการ</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">นับถอยหลังตามกำหนดเวลา</p>
        </div>
      </div>

      {/* สำเร็จและได้รับเงินคืน + โบนัส WTC */}
      <div className="glass-card flex flex-col justify-between rounded-2xl p-4 transition-all hover:translate-y-[-2px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">สำเร็จ / ได้รับเงินคืน</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-lg font-bold text-teal-300 sm:text-2xl font-mono">
            {completedGoals.length}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">
              ({refundedEthNum.toFixed(2)} ETH)
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-bold text-amber-300 font-mono">
            <span>🎉</span>
            <span>รับโบนัส +{earnedWtcBonus} WTC แล้ว</span>
          </div>
        </div>
      </div>

      {/* บริจาคมูลนิธิ */}
      <div className="glass-card flex flex-col justify-between rounded-2xl p-4 transition-all hover:translate-y-[-2px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">บริจาคให้สังคม</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400">
            <HeartHandshake className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-lg font-bold text-rose-400 sm:text-2xl font-mono">
            {donatedEthNum.toFixed(3)}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">ETH</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">{failedGoals.length} รายการที่ส่งต่อบุญ</p>
        </div>
      </div>
    </div>
  );
};
