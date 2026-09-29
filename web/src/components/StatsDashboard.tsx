import React from 'react';
import { formatEther } from 'viem';
import { Target, Lock, CheckCircle2, HeartHandshake } from 'lucide-react';

interface Goal {
  id: bigint;
  user: string;
  amount: bigint;
  deadline: bigint;
  charityWallet: string;
  isCompleted: boolean;
  isClaimed: boolean;
}

interface Props {
  goals: Goal[];
  now: number;
}

export const StatsDashboard: React.FC<Props> = ({ goals }) => {
  const activeGoals = goals.filter((g) => !g.isClaimed);
  const completedGoals = goals.filter((g) => g.isClaimed && g.isCompleted);
  const failedGoals = goals.filter((g) => g.isClaimed && !g.isCompleted);

  const activeLockedWei = activeGoals.reduce((sum, g) => sum + g.amount, 0n);
  const refundedWei = completedGoals.reduce((sum, g) => sum + g.amount, 0n);
  const donatedWei = failedGoals.reduce((sum, g) => sum + g.amount, 0n);

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
            {parseFloat(formatEther(activeLockedWei)).toFixed(3)}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">ETH</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">ใน {activeGoals.length} เป้าหมายที่ทำอยู่</p>
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
          <p className="mt-0.5 text-[11px] text-slate-500">นับถอยหลังตามกำหนด</p>
        </div>
      </div>

      {/* สำเร็จและได้รับเงินคืน */}
      <div className="glass-card flex flex-col justify-between rounded-2xl p-4 transition-all hover:translate-y-[-2px]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">สำเร็จ / ได้คืนเงิน</span>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-lg font-bold text-teal-300 sm:text-2xl font-mono">
            {completedGoals.length}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">
              ({parseFloat(formatEther(refundedWei)).toFixed(2)} ETH)
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">ทำสำเร็จตามสัญญา</p>
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
            {parseFloat(formatEther(donatedWei)).toFixed(3)}{' '}
            <span className="text-xs font-sans font-normal text-slate-400">ETH</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">{failedGoals.length} รายการที่ส่งต่อบุญ</p>
        </div>
      </div>
    </div>
  );
};
