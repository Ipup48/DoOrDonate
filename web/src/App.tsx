import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEventLogs } from 'viem';
import { getContractAddress, ABI } from '@/lib/contract';
import {
  saveGoalMeta,
  getPendingGoalCreation,
  clearPendingGoalCreation,
  getAllGoalsMeta,
} from '@/lib/storage';

import { Navbar } from '@/components/Navbar';
import { NetworkBanner } from '@/components/NetworkBanner';
import { ContractAddressBanner } from '@/components/ContractAddressBanner';
import { StatsDashboard } from '@/components/StatsDashboard';
import { GoalCard, Goal } from '@/components/GoalCard';
import { CreateGoalModal } from '@/components/CreateGoalModal';
import { ProofModal } from '@/components/ProofModal';
import { SettingsModal } from '@/components/SettingsModal';
import { MetaMaskInstallModal } from '@/components/MetaMaskInstallModal';
import { ToastContainer, ToastMessage } from '@/components/Toast';

import { Plus, Target, History, RefreshCw, Search, Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  const { address, isConnected } = useAccount();
  const contractAddress = getContractAddress();

  // State
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

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

  // Read goals from contract
  const {
    data: rawGoals,
    refetch,
    isLoading: isReadingGoals,
  } = useReadContract({
    address: contractAddress,
    abi: ABI,
    functionName: 'getAllGoals',
  });

  const allGoals = ((rawGoals as Goal[]) || []).map((g) => ({
    id: BigInt(g.id),
    user: g.user,
    amount: BigInt(g.amount),
    deadline: BigInt(g.deadline),
    charityWallet: g.charityWallet,
    isCompleted: Boolean(g.isCompleted),
    isClaimed: Boolean(g.isClaimed),
  }));

  // Filter goals of connected user
  const userGoals = allGoals.filter(
    (g) => address && g.user.toLowerCase() === address.toLowerCase()
  );

  const activeGoals = userGoals.filter((g) => !g.isClaimed).reverse();
  const historyGoals = userGoals.filter((g) => g.isClaimed).reverse();

  // Filter with search
  const filterBySearch = (list: Goal[]) => {
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    const allMeta = getAllGoalsMeta();
    return list.filter((g) => {
      const meta = allMeta[g.id.toString()];
      const title = meta?.title?.toLowerCase() || '';
      return title.includes(q) || g.id.toString().includes(q);
    });
  };

  const displayedActiveGoals = filterBySearch(activeGoals);
  const displayedHistoryGoals = filterBySearch(historyGoals);

  // Contract Write hook
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();

  // Transaction Receipt Hook
  const { isLoading: isWaitingTx, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: activeTxHash,
  });

  const isBusy = isWritePending || isWaitingTx;

  // Handle Transaction Success
  useEffect(() => {
    if (isTxSuccess && activeTxHash) {
      if (actionType === 'create') {
        const pending = getPendingGoalCreation();
        // หา ID ของเป้าหมายใหม่จากจำนวนเป้าหมายล่าสุด
        const newGoalId = allGoals.length > 0 ? String(allGoals.length) : '0';
        if (pending) {
          saveGoalMeta(newGoalId, {
            title: pending.title,
            createdAt: pending.createdAt,
            txHashCreate: activeTxHash,
          });
          clearPendingGoalCreation();
        }

        addToast({
          type: 'success',
          title: 'สร้างเป้าหมายสำเร็จแล้ว!',
          message: 'เงินมัดจำถูกล็อคไว้ใน Smart Contract เรียบร้อย ขอให้ทำสำเร็จตามที่ตั้งใจ!',
          txHash: activeTxHash,
        });
      } else if (actionType === 'refund' && actionGoalId !== null) {
        saveGoalMeta(actionGoalId, {
          txHashAction: activeTxHash,
        });
        addToast({
          type: 'success',
          title: 'ขอรับเงินมัดจำคืนสำเร็จ!',
          message: 'ยินดีด้วยที่คุณทำตามเป้าหมายได้สำเร็จ เงินมัดจำถูกโอนกลับเข้ากระเป๋าของคุณแล้ว',
          txHash: activeTxHash,
        });
      } else if (actionType === 'donate' && actionGoalId !== null) {
        saveGoalMeta(actionGoalId, {
          txHashAction: activeTxHash,
        });
        addToast({
          type: 'info',
          title: 'โอนเงินบริจาคให้มูลนิธิเรียบร้อย',
          message: 'เงินมัดจำได้ถูกส่งมอบให้กับมูลนิธิเพื่อประโยชน์ต่อสังคมแล้ว',
          txHash: activeTxHash,
        });
      }

      refetch();
      setActiveTxHash(undefined);
      setActionGoalId(null);
      setActionType(null);
    }
  }, [isTxSuccess, activeTxHash]);

  // Action: Refund
  const handleRefund = async (goalId: bigint) => {
    try {
      setActionGoalId(goalId);
      setActionType('refund');

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ABI,
        functionName: 'completeAndRefund',
        args: [goalId],
      });

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

  // Action: Donate
  const handleDonate = async (goalId: bigint) => {
    try {
      setActionGoalId(goalId);
      setActionType('donate');

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ABI,
        functionName: 'failAndDonate',
        args: [goalId],
      });

      if (hash) {
        setActiveTxHash(hash);
        addToast({
          type: 'pending',
          title: 'กำลังส่งมอบเงินให้มูลนิธิ...',
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
          title: 'เกิดข้อผิดพลาดในการส่งมอบเงินบริจาค',
          message: msg,
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Navbar */}
      <Navbar
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenMetaMaskInstallModal={() => setMetaMaskModalOpen(true)}
      />

      {/* Network Alert */}
      <NetworkBanner />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 flex-1">
        {/* Contract Address Missing Warning */}
        <ContractAddressBanner onAddressUpdated={refetch} />

        {/* Hero Section */}
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
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-200 bg-clip-text text-transparent">
                  ทำสำเร็จได้คืน ไม่สำเร็จเงินบริจาคมูลนิธิ
                </span>
              </h2>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                สร้างวินัยให้ตัวเองด้วย Smart Contract บนเครือข่าย Sepolia เมื่อคุณล็อคเงินมัดจำ
                พลังของเงื่อนไขบล็อกเชนจะผลักดันให้คุณทำให้สำเร็จ ถ้าทำสำเร็จรับเงินคืนเต็มจำนวน!
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

          {/* Stats Dashboard */}
          {isConnected && (
            <div className="mt-8 border-t border-slate-800/80 pt-6">
              <StatsDashboard goals={userGoals} now={now} />
            </div>
          )}
        </section>

        {/* Not Connected View */}
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

        {/* Connected Goals Management */}
        {isConnected && (
          <div className="space-y-6">
            {/* Action Bar: Tabs & Search */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
              {/* Tabs */}
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
                    {historyGoals.length}
                  </span>
                </button>
              </div>

              {/* Search & Refresh */}
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
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>🎯 DoOrDonate • Smart Contract Self-Commitment Protocol บนเครือข่าย Ethereum Sepolia</p>
          <p className="font-mono text-[11px] text-slate-600">MetaMask Injected Web3</p>
        </div>
      </footer>

      {/* Modals */}
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

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
