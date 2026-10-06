'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useBalance, useWatchContractEvent } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { parseEventLogs } from 'viem';
import { getContractAddress, ABI, ABI_V1, ABI_V2, ABI_STATUS, ABI_EVENTS } from '@/lib/contract';
import {
  saveGoalMeta,
  getGoalMeta,
  updateGoalStatus,
  getPendingGoalCreation,
  clearPendingGoalCreation,
  getAllGoalsMeta,
} from '@/lib/storage';

import { Navbar } from '@/components/Navbar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { ContractAddressBanner } from '@/components/ContractAddressBanner';
import { StatsDashboard } from '@/components/StatsDashboard';
import { GoalCard, Goal } from '@/components/GoalCard';
import { HistoryCard } from '@/components/HistoryCard';
import { CreateGoalModal } from '@/components/CreateGoalModal';
import { ProofModal } from '@/components/ProofModal';
import { SettingsModal } from '@/components/SettingsModal';
import { MetaMaskInstallModal } from '@/components/MetaMaskInstallModal';
import { ToastContainer, ToastMessage } from '@/components/Toast';

import { Plus, Target, History, RefreshCw, Search, Sparkles, ShieldCheck } from 'lucide-react';

export default function Home() {
  const { address, isConnected } = useAccount();
  const contractAddress = getContractAddress();

  // State
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [metaVersion, setMetaVersion] = useState(0);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [metaMaskModalOpen, setMetaMaskModalOpen] = useState(false);
  const [proofModalData, setProofModalData] = useState<{ goalId: bigint; title: string } | null>(null);

  // Active Transaction tracking
  const [activeTxHash, setActiveTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [actionGoalId, setActionGoalId] = useState<bigint | null>(null);
  const [actionType, setActionType] = useState<'create' | 'refund' | 'donate' | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      removeToast(id);
    }, 7000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Timer countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ตรวจสอบความถูกต้องของ Contract Address
  const isContractValid = Boolean(
    contractAddress &&
    contractAddress !== '0x0000000000000000000000000000000000000000'
  );

  // 1. อ่านเป้าหมายด้วย ABI STATUS
  const {
    data: rawGoalsStatus,
    refetch: refetchStatus,
  } = useReadContract({
    address: contractAddress,
    abi: ABI_STATUS,
    functionName: 'getAllGoals',
    query: {
      enabled: isContractValid,
      refetchInterval: 3000,
    },
  });

  // 2. อ่านเป้าหมายด้วย ABI V2
  const {
    data: rawGoalsV2,
    refetch: refetchV2,
    isLoading: isReadingV2,
  } = useReadContract({
    address: contractAddress,
    abi: ABI_V2,
    functionName: 'getAllGoals',
    query: {
      enabled: isContractValid,
      refetchInterval: 3000,
    },
  });

  // 3. อ่านเป้าหมายด้วย ABI V1
  const {
    data: rawGoalsV1,
    refetch: refetchV1,
    isLoading: isReadingV1,
  } = useReadContract({
    address: contractAddress,
    abi: ABI_V1,
    functionName: 'getAllGoals',
    query: {
      enabled: isContractValid,
      refetchInterval: 3000,
    },
  });

  const { refetch: refetchBalance } = useBalance({
    address,
    chainId: sepolia.id,
    query: {
      enabled: Boolean(address),
      refetchInterval: 5000,
    },
  });

  const rawGoals = (rawGoalsStatus as any[]) || (rawGoalsV2 as any[]) || (rawGoalsV1 as any[]) || [];
  const isReadingGoals = Boolean(isContractValid && !rawGoalsStatus && !rawGoalsV2 && !rawGoalsV1 && (isReadingV2 || isReadingV1));

  const refetch = async () => {
    setMetaVersion((v) => v + 1);
    await Promise.allSettled([refetchStatus(), refetchV2(), refetchV1(), refetchBalance()]);
  };

  useWatchContractEvent({
    address: contractAddress,
    abi: ABI,
    eventName: 'GoalCreated',
    enabled: isContractValid,
    onLogs() {
      refetch();
    },
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: ABI,
    eventName: 'GoalCompleted',
    enabled: isContractValid,
    onLogs() {
      refetch();
    },
  });

  useWatchContractEvent({
    address: contractAddress,
    abi: ABI,
    eventName: 'GoalFailed',
    enabled: isContractValid,
    onLogs() {
      refetch();
    },
  });

  const allGoals: Goal[] = useMemo(() => {
    const allMeta = getAllGoalsMeta();
    return rawGoals.map((g: any, index: number) => {
      const id = g.id !== undefined ? BigInt(g.id) : BigInt(index);
      const meta = allMeta[id.toString()] || {};
      const createdAt = (g.createdAt !== undefined && g.createdAt !== null && BigInt(g.createdAt) > 0n)
        ? BigInt(g.createdAt)
        : (meta.createdAt ? BigInt(meta.createdAt) : 0n);

      const userAddress = g.user || g.creator || '';
      const rawAmount = g.amount !== undefined ? g.amount : (g.depositAmount !== undefined ? g.depositAmount : 0n);
      const amount = BigInt(rawAmount);

      // คำนวณ status โดยยึดบล็อกเชนเป็นหลักเสมอ เพื่อไม่ให้แคชเก่ามาทับ
      let status = 0;
      if (g.status !== undefined && g.status !== null) {
        status = Number(g.status);
      } else if (Boolean(g.isClaimed)) {
        status = Boolean(g.isCompleted) ? 1 : 2;
      } else if (meta.status !== undefined && (meta.status === 1 || meta.status === 2)) {
        status = Number(meta.status);
      }

      const isCompleted = status === 1;
      const isClaimed = status === 1 || status === 2;

      // จัดการชื่อเป้าหมาย
      const displayTitle = meta.title || g.title || (status === 2 ? `[บริจาค] เป้าหมาย #${id.toString()}` : `เป้าหมาย #${id.toString()}`);

      return {
        id,
        user: userAddress,
        creator: userAddress,
        amount,
        depositAmount: amount,
        createdAt,
        deadline: BigInt(g.deadline !== undefined ? g.deadline : (meta.deadline || 0)),
        charityWallet: g.charityWallet || meta.charityWallet || '',
        isCompleted,
        isClaimed,
        status,
        title: displayTitle,
      };
    });
  }, [rawGoals, metaVersion]);

  const userGoals = allGoals.filter(
    (g) => address && ((g.user && g.user.toLowerCase() === address.toLowerCase()) || ((g as any).creator && (g as any).creator.toLowerCase() === address.toLowerCase()))
  );

  // เป้าหมายที่กำลังทำ: ต้องมี status = 0 เท่านั้น (Active)
  const activeGoals = (userGoals.length > 0 ? userGoals : allGoals).filter(
    (g) => Number(g.status) === 0
  ).reverse();

  // ประวัติ: ต้องเป็นเป้าหมายที่จบแล้วเท่านั้น (status 1 หรือ 2)
  const historyGoals = allGoals.filter(
    (g) => Number(g.status) === 1 || Number(g.status) === 2
  ).reverse();

  const historyBadgeCount = historyGoals.length;

  const filterBySearch = (list: Goal[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    const allMeta = getAllGoalsMeta();
    return list.filter((g) => {
      const meta = allMeta[g.id.toString()];
      const t = (g.title || meta?.title || `เป้าหมาย #${g.id.toString()}`).toLowerCase();
      return t.includes(q) || g.id.toString().includes(q);
    });
  };

  const displayedActiveGoals = filterBySearch(activeGoals);
  const displayedHistoryGoals = filterBySearch(historyGoals);

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  const { isLoading: isWaitingTx, isSuccess: isTxSuccess, data: receipt } = useWaitForTransactionReceipt({
    hash: activeTxHash,
  });

  const isBusy = isWritePending || isWaitingTx;

  useEffect(() => {
    if (isTxSuccess && activeTxHash) {
      if (actionType === 'create') {
        const pending = getPendingGoalCreation();
        let newGoalId: string | null = null;

        if (receipt) {
          try {
            const logs = parseEventLogs({
              abi: ABI_EVENTS,
              eventName: 'GoalCreated',
              logs: receipt.logs,
            });
            if (logs.length > 0 && (logs[0] as any).args?.goalId !== undefined) {
              newGoalId = (logs[0] as any).args.goalId.toString();
            }
          } catch (e) {
            console.warn('Could not parse GoalCreated event log:', e);
          }
        }

        if (!newGoalId) {
          newGoalId = rawGoals.length > 0 ? String(rawGoals.length) : '0';
        }

        if (pending) {
          saveGoalMeta(newGoalId, {
            title: pending.title,
            createdAt: pending.createdAt,
            deadline: pending.deadline,
            charityWallet: pending.charityWallet,
            txHashCreate: activeTxHash,
            isDemo: pending.isDemo,
            isExpiredDemo: pending.isExpiredDemo,
            status: 0,
            isCompleted: false,
            isClaimed: false,
          });
          clearPendingGoalCreation();
        }

        addToast({
          type: 'success',
          title: 'สร้างเป้าหมายสำเร็จแล้ว!',
          message: 'เงินมัดจำถูกล็อคไว้ใน Smart Contract เรียบร้อย ขอให้ทำสำเร็จตามที่ตั้งใจ!',
          txHash: activeTxHash,
        });

        // บังคับเปิดแท็บ active เพื่อให้เห็นการ์ดที่เพิ่งสร้างทันที
        setTab('active');
        refetch();
        setTimeout(() => refetch(), 1500);
      } else if (actionType === 'refund' && actionGoalId !== null) {
        updateGoalStatus(actionGoalId, 1, activeTxHash);
        const currentMeta = getGoalMeta(actionGoalId);
        saveGoalMeta(actionGoalId, {
          title: currentMeta.title || `ทำสำเร็จ #${actionGoalId.toString()}`,
          status: 1,
          isCompleted: true,
          isClaimed: true,
          txHashAction: activeTxHash,
        });
        setMetaVersion((v) => v + 1);
        addToast({
          type: 'success',
          title: 'ขอรับเงินมัดจำคืนสำเร็จ!',
          message: 'ยินดีด้วยที่คุณทำตามเป้าหมายได้สำเร็จ เงินมัดจำและโบนัสเหรียญ WTC โอนเข้ากระเป๋าเรียบร้อยแล้ว',
          txHash: activeTxHash,
        });
        refetch();
      } else if (actionType === 'donate' && actionGoalId !== null) {
        updateGoalStatus(actionGoalId, 2, activeTxHash);
        const currentMeta = getGoalMeta(actionGoalId);
        saveGoalMeta(actionGoalId, {
          title: currentMeta.title || `บริจาคเข้ามูลนิธิ #${actionGoalId.toString()}`,
          status: 2,
          isCompleted: false,
          isClaimed: true,
          txHashAction: activeTxHash,
        });
        setMetaVersion((v) => v + 1);
        addToast({
          type: 'info',
          title: 'ส่งมอบเงินมัดจำเรียบร้อย',
          message: 'เงินมัดจำได้ถูกส่งมอบให้กับมูลนิธิหรือสมทบเข้ากองทุนเรียบร้อยแล้ว',
          txHash: activeTxHash,
        });
        refetch();
      }

      setActiveTxHash(undefined);
      setActionGoalId(null);
      setActionType(null);
    }
  }, [isTxSuccess, activeTxHash, receipt]);

  const handleRefund = async (goalId: bigint) => {
    try {
      setActionGoalId(goalId);
      setActionType('refund');

      let hash: `0x${string}` | undefined;
      try {
        hash = await writeContractAsync({
          address: contractAddress,
          abi: ABI,
          functionName: 'completeGoal',
          args: [goalId],
        });
      } catch (eComp: any) {
        if (eComp?.message?.includes('User rejected') || eComp?.shortMessage?.includes('User rejected')) {
          throw eComp;
        }
        hash = await writeContractAsync({
          address: contractAddress,
          abi: ABI,
          functionName: 'completeAndRefund',
          args: [goalId],
        });
      }

      if (hash) {
        setActiveTxHash(hash);
        addToast({
          type: 'pending',
          title: 'กำลังประมวลผลการขอคืนเงิน...',
          message: 'กรุณารอสักครู่ กำลังยืนยันธุรกรรมบนเครือข่าย Sepolia',
          txHash: hash,
        });
      }
    } catch (err: any) {
      console.error('Refund error:', err);
      setActionGoalId(null);
      setActionType(null);
      const msg = err.shortMessage || err.message || 'ทำรายการไม่สำเร็จ';
      if (!msg.includes('User rejected')) {
        addToast({
          type: 'error',
          title: 'เกิดข้อผิดพลาดในการขอรับเงินคืน',
          message: msg,
        });
      }
    }
  };

  const handleDonate = async (goalId: bigint) => {
    try {
      setActionGoalId(goalId);
      setActionType('donate');

      let hash: `0x${string}` | undefined;
      try {
        hash = await writeContractAsync({
          address: contractAddress,
          abi: ABI,
          functionName: 'failGoal',
          args: [goalId],
        });
      } catch (eFailGoal: any) {
        if (eFailGoal?.message?.includes('User rejected') || eFailGoal?.shortMessage?.includes('User rejected')) {
          throw eFailGoal;
        }
        hash = await writeContractAsync({
          address: contractAddress,
          abi: ABI,
          functionName: 'failAndDonate',
          args: [goalId],
        });
      }

      if (hash) {
        setActiveTxHash(hash);
        addToast({
          type: 'pending',
          title: 'กำลังส่งมอบเงินมัดจำ...',
          message: 'กรุณารอสักครู่ กำลังยืนยันธุรกรรมบนเครือข่าย Sepolia',
          txHash: hash,
        });
      }
    } catch (err: any) {
      console.error('Donate error:', err);
      setActionGoalId(null);
      setActionType(null);
      const msg = err.shortMessage || err.message || 'ทำรายการไม่สำเร็จ';
      if (!msg.includes('User rejected')) {
        addToast({
          type: 'error',
          title: 'เกิดข้อผิดพลาดในการส่งมอบเงินมัดจำ',
          message: msg,
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      <Navbar
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenMetaMaskInstallModal={() => setMetaMaskModalOpen(true)}
      />

      <NetworkBanner />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 flex-1">
        <ContractAddressBanner onAddressUpdated={refetch} />

        <section className="mb-8 rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-900/90 to-slate-950/80 p-6 sm:p-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Web3 Self-Commitment Protocol</span>
              </div>
              <h2 className="mt-3 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                มัดจำเป้าหมายชีวิตด้วย ETH <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                  ทำสำเร็จได้คืน 100% + รับโบนัสเหรียญ WTC
                </span>
              </h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                สร้างวินัยให้ตัวเองด้วย Smart Contract บนเครือข่าย Sepolia เมื่อคุณล็อคเงินมัดจำ
                พลังของบล็อกเชนจะผลักดันให้คุณทำให้สำเร็จ ถ้าทำสำเร็จรับเงินคืนเต็มจำนวนพร้อมโบนัสเหรียญ WTC (1 ETH = 10 WTC)!
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              {isConnected && (
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-bold text-slate-950 shadow-glow transition hover:from-emerald-400 hover:to-teal-400 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                  <span>สร้างเป้าหมายใหม่</span>
                </button>
              )}
            </div>
          </div>

          {isConnected && (
            <div className="mt-8 border-t border-slate-800/80 pt-6">
              <StatsDashboard goals={allGoals} now={now} />
            </div>
          )}
        </section>

        {!isConnected && (
          <div className="rounded-3xl border border-dashed border-slate-800 bg-slate-900/30 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800/60 text-slate-400">
              <ShieldCheck className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-200">
              กรุณาเชื่อมต่อกระเป๋า MetaMask เพื่อเริ่มต้นใช้งาน
            </h3>
            <p className="mx-auto mt-2 max-w-md text-xs text-slate-400">
              ระบบเชื่อมต่อผ่านส่วนขยาย MetaMask บนเครือข่าย Sepolia Testnet โดยตรง
              เพื่อจัดการเป้าหมายและเงินมัดจำอย่างปลอดภัย
            </p>
          </div>
        )}

        {isConnected && (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTab('active')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    tab === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <Target className="h-4 w-4" />
                  <span>เป้าหมายที่กำลังทำ</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 font-mono">
                    {activeGoals.length}
                  </span>
                </button>

                <button
                  onClick={() => setTab('history')}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    tab === 'history'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                  }`}
                >
                  <History className="h-4 w-4" />
                  <span>ประวัติสำเร็จ & บริจาค</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300 font-mono">
                    {historyBadgeCount}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาเป้าหมาย..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => refetch()}
                  disabled={isReadingGoals}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200 disabled:opacity-50"
                  title="รีเฟรชข้อมูล"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isReadingGoals ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Tab 1: เป้าหมายที่กำลังทำ */}
            {tab === 'active' && (
              <div>
                {displayedActiveGoals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
                    <Target className="mx-auto h-10 w-10 text-slate-600" />
                    <h4 className="mt-3 text-sm font-semibold text-slate-300">
                      {searchQuery ? 'ไม่พบเป้าหมายที่ตรงกับคำค้นหา' : 'ยังไม่มีเป้าหมายที่กำลังทำ'}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      {searchQuery
                        ? 'ลองเปลี่ยนคำค้นหาใหม่อีกครั้ง'
                        : 'เริ่มต้นสร้างเป้าหมายแรกของคุณ ล็อคเงินมัดจำเพื่อความมุ่งมั่น!'}
                    </p>
                    {!searchQuery && (
                      <button
                        onClick={() => setCreateModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-emerald-500"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>สร้างเป้าหมายใหม่</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {displayedActiveGoals.map((g) => (
                      <GoalCard
                        key={g.id.toString()}
                        goal={g}
                        now={now}
                        isOwner={true}
                        onOpenProofModal={(id, title) => setProofModalData({ goalId: id, title })}
                        onRefund={handleRefund}
                        onDonate={handleDonate}
                        isBusy={isBusy}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: ประวัติ */}
            {tab === 'history' && (
              <div>
                {displayedHistoryGoals.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center">
                    <History className="mx-auto h-10 w-10 text-slate-600" />
                    <h4 className="mt-3 text-sm font-semibold text-slate-300">
                      {searchQuery ? 'ไม่พบข้อมูลในประวัติ' : 'ยังไม่มีประวัติเป้าหมายที่สิ้นสุดแล้ว'}
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      เมื่อคุณขอรับเงินคืนหรือเงินถูกบริจาค ประวัติทั้งหมดจะถูกบันทึกไว้อย่างโปร่งใสที่นี่
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {displayedHistoryGoals.map((g) => (
                      <HistoryCard
                        key={g.id.toString()}
                        goal={g}
                        now={now}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>🎯 DoOrDonate • Smart Contract Self-Commitment Protocol บนเครือข่าย Ethereum Sepolia</p>
          <p className="font-mono text-[11px] text-slate-600">MetaMask Injected Web3</p>
        </div>
      </footer>

      <CreateGoalModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onTransactionInitiated={(hash) => {
          setActiveTxHash(hash);
          setActionType('create');
          addToast({
            type: 'pending',
            title: 'กำลังสร้างเป้าหมายและล็อคเงิน...',
            message: 'กรุณารอสักครู่ กำลังยืนยันธุรกรรมบน Sepolia',
            txHash: hash,
          });
        }}
      />

      <ProofModal
        isOpen={proofModalData !== null}
        onClose={() => setProofModalData(null)}
        goalId={proofModalData?.goalId ?? null}
        goalTitle={proofModalData?.title ?? ''}
        onSaved={() => {
          addToast({
            type: 'success',
            title: 'บันทึกหลักฐานเรียบร้อย',
            message: 'ข้อมูลหลักฐานของคุณถูกบันทึกและอัปเดตบนหน้าเว็บแล้ว',
          });
        }}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onUpdated={() => {
          refetch();
          addToast({
            type: 'success',
            title: 'อัปเดต Contract Address เรียบร้อย',
            message: 'ระบบโหลดข้อมูลใหม่จาก Smart Contract แล้ว',
          });
        }}
      />

      <MetaMaskInstallModal
        isOpen={metaMaskModalOpen}
        onClose={() => setMetaMaskModalOpen(false)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}