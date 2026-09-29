'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';
import { CONTRACT_ADDRESS, ABI, CHARITIES, ETHERSCAN_TX } from '@/lib/contract';

// หน้ารูปแบบข้อมูลของเป้าหมาย (ตรงกับ struct Goal ใน contract)
type Goal = {
  id: bigint;
  user: string;
  amount: bigint;
  deadline: bigint;
  charityWallet: string;
  isCompleted: boolean;
  isClaimed: boolean;
};

// ชื่อเป้าหมาย / หลักฐาน / ลิงก์ tx เก็บไว้ในเบราว์เซอร์ (localStorage)
function getSaved(key: string) {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}
function save(key: string, value: string) {
  localStorage.setItem(key, value);
}

// แปลงวินาทีที่เหลือเป็นข้อความ
function timeLeftText(seconds: number) {
  if (seconds <= 0) return 'หมดเวลาแล้ว';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return d + ' วัน ' + h + ' ชม. ' + m + ' นาที ' + s + ' วิ';
}

export default function Home() {
  const { address, isConnected } = useAccount();

  // ค่าในฟอร์ม
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('7');
  const [amount, setAmount] = useState('0.01');
  const [charity, setCharity] = useState(CHARITIES[0].address);
  const [customCharity, setCustomCharity] = useState('');
  const [error, setError] = useState('');

  // แท็บที่เปิดอยู่
  const [tab, setTab] = useState('active');

  // เวลาปัจจุบัน (อัปเดตทุก 1 วินาที เอาไว้ทำ countdown)
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  // จำว่ากำลังทำรายการกับเป้าหมายเลขที่เท่าไหร่ (ไว้เก็บลิงก์ tx)
  const [workingGoalId, setWorkingGoalId] = useState<string | null>(null);

  // อ่านเป้าหมายทั้งหมดจาก Smart Contract
  const { data, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'getAllGoals',
  });
  const allGoals = (data ?? []) as Goal[];

  // เอาเฉพาะเป้าหมายของกระเป๋าที่เชื่อมอยู่ (ใหม่สุดขึ้นก่อน)
  const myGoals = allGoals
    .filter((g) => address && g.user.toLowerCase() === address.toLowerCase())
    .reverse();
  const activeGoals = myGoals.filter((g) => !g.isClaimed);
  const historyGoals = myGoals.filter((g) => g.isClaimed);

  // ส่งธุรกรรม และรอให้ยืนยัน
  const { writeContract, data: txHash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || isConfirming;

  // เมื่อธุรกรรมสำเร็จ: เก็บลิงก์ tx แล้วโหลดข้อมูลใหม่
  useEffect(() => {
    if (isSuccess && txHash) {
      if (workingGoalId !== null) {
        save('tx-' + workingGoalId, txHash);
      }
      refetch();
    }
  }, [isSuccess]);

  // กดปุ่มสร้างเป้าหมาย
  function handleCreate() {
    const charityAddress = charity === 'custom' ? customCharity.trim() : charity;

    if (title.trim() === '') return setError('กรุณากรอกชื่อเป้าหมาย');
    if (!(Number(days) >= 1)) return setError('ระยะเวลาต้องอย่างน้อย 1 วัน');
    if (!(Number(amount) > 0)) return setError('เงินมัดจำต้องมากกว่า 0');
    if (!isAddress(charityAddress)) return setError('Wallet address ของมูลนิธิไม่ถูกต้อง');
    setError('');

    // id ของเป้าหมายใหม่ = จำนวนเป้าหมายทั้งหมดตอนนี้ จึงเก็บชื่อไว้ล่วงหน้าได้
    save('title-' + allGoals.length, title.trim());
    setWorkingGoalId(null);

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'createGoal',
      args: [BigInt(Math.floor(Number(days))), charityAddress as `0x${string}`],
      value: parseEther(amount),
    });
  }

  // กดปุ่มส่งหลักฐาน
  function handleProof(goalId: bigint) {
    const text = window.prompt('ใส่ลิงก์หรือคำอธิบายหลักฐานว่าทำสำเร็จแล้ว');
    if (text && text.trim() !== '') {
      save('proof-' + goalId, text.trim());
      setNow(Math.floor(Date.now() / 1000)); // สั่งให้หน้าจออัปเดต
    }
  }

  // กดปุ่มขอรับเงินคืน
  function handleRefund(goalId: bigint) {
    setWorkingGoalId(String(goalId));
    writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'completeAndRefund', args: [goalId] });
  }

  // กดปุ่มโอนเงินให้มูลนิธิ (หลังหมดเวลา)
  function handleDonate(goalId: bigint) {
    setWorkingGoalId(String(goalId));
    writeContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'failAndDonate', args: [goalId] });
  }

  return (
    <main className="mx-auto max-w-3xl p-4">
      {/* ส่วนหัว + ปุ่มเชื่อมกระเป๋า */}
      <header className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">DoOrDonate</h1>
        <ConnectButton />
      </header>

      {!isConnected && (
        <p className="rounded-lg border border-dashed p-8 text-center text-gray-500">
          กรุณาเชื่อมต่อกระเป๋า (เครือข่าย Sepolia) เพื่อเริ่มใช้งาน
        </p>
      )}

      {isConnected && (
        <div>
          {/* ฟอร์มสร้างเป้าหมาย */}
          <section className="mb-6 rounded-lg bg-white p-4 shadow">
            <h2 className="mb-3 text-lg font-semibold">สร้างเป้าหมายใหม่</h2>

            <label className="block text-sm">ชื่อเป้าหมาย</label>
            <input className="mb-3 w-full rounded border p-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น อ่านหนังสือวันละ 1 ชั่วโมง" />

            <label className="block text-sm">ระยะเวลา (วัน)</label>
            <input className="mb-3 w-full rounded border p-2" type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} />

            <label className="block text-sm">เงินมัดจำ (ETH)</label>
            <input className="mb-3 w-full rounded border p-2" type="number" min="0" step="0.001" value={amount} onChange={(e) => setAmount(e.target.value)} />

            <label className="block text-sm">มูลนิธิที่จะบริจาคหากทำไม่สำเร็จ</label>
            <select className="mb-3 w-full rounded border p-2" value={charity} onChange={(e) => setCharity(e.target.value)}>
              {CHARITIES.map((c) => (
                <option key={c.address} value={c.address}>
                  {c.name}
                </option>
              ))}
              <option value="custom">กรอก Wallet Address เอง</option>
            </select>

            {charity === 'custom' && (
              <input className="mb-3 w-full rounded border p-2" placeholder="0x..." value={customCharity} onChange={(e) => setCustomCharity(e.target.value)} />
            )}

            {error !== '' && <p className="mb-2 text-sm text-red-600">{error}</p>}
            {writeError && <p className="mb-2 text-sm text-red-600">เกิดข้อผิดพลาด: {(writeError as any).shortMessage || writeError.message}</p>}
            {busy && <p className="mb-2 text-sm text-orange-600">กำลังทำรายการ กรุณารอสักครู่...</p>}

            <button className="rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50" onClick={handleCreate} disabled={busy}>
              ล็อคเงินมัดจำและเริ่มเป้าหมาย
            </button>
          </section>

          {/* ปุ่มสลับแท็บ */}
          <div className="mb-4 flex gap-2 border-b">
            <button className={'px-4 py-2 ' + (tab === 'active' ? 'border-b-2 border-green-600 font-semibold text-green-700' : 'text-gray-500')} onClick={() => setTab('active')}>
              เป้าหมายที่กำลังทำ ({activeGoals.length})
            </button>
            <button className={'px-4 py-2 ' + (tab === 'history' ? 'border-b-2 border-green-600 font-semibold text-green-700' : 'text-gray-500')} onClick={() => setTab('history')}>
              ประวัติ ({historyGoals.length})
            </button>
          </div>

          {/* แท็บเป้าหมายที่กำลังทำ */}
          {tab === 'active' && (
            <div>
              {activeGoals.length === 0 && <p className="text-gray-500">ยังไม่มีเป้าหมายที่กำลังทำ</p>}

              {activeGoals.map((g) => {
                const secondsLeft = Number(g.deadline) - now;
                const expired = secondsLeft <= 0;
                const proof = getSaved('proof-' + g.id);

                return (
                  <div key={String(g.id)} className="mb-3 rounded-lg bg-white p-4 shadow">
                    <h3 className="font-semibold">{getSaved('title-' + g.id) || 'เป้าหมาย #' + g.id}</h3>
                    <p className="text-sm text-gray-600">เงินมัดจำ {formatEther(g.amount)} ETH</p>
                    <p className="text-sm text-gray-600">มูลนิธิ: {g.charityWallet.slice(0, 8)}...{g.charityWallet.slice(-4)}</p>
                    <p className="text-sm">สถานะ: {expired ? 'หมดเวลา รอโอนเงินให้มูลนิธิ' : 'กำลังดำเนินการ'}</p>
                    <p className={'my-2 font-mono text-lg ' + (expired ? 'text-red-600' : '')}>⏳ {timeLeftText(secondsLeft)}</p>
                    {proof && <p className="mb-2 text-xs text-gray-500">หลักฐาน: {proof}</p>}

                    {!expired && (
                      <div className="flex gap-2">
                        <button className="rounded border px-3 py-2 text-sm" onClick={() => handleProof(g.id)}>
                          ส่งหลักฐาน
                        </button>
                        <button className="rounded bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-40" onClick={() => handleRefund(g.id)} disabled={busy || !proof}>
                          ขอรับเงินคืน
                        </button>
                      </div>
                    )}

                    {expired && (
                      <button className="rounded bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-40" onClick={() => handleDonate(g.id)} disabled={busy}>
                        โอนเงินให้มูลนิธิ
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* แท็บประวัติ */}
          {tab === 'history' && (
            <div>
              {historyGoals.length === 0 && <p className="text-gray-500">ยังไม่มีประวัติ</p>}

              {historyGoals.map((g) => {
                const tx = getSaved('tx-' + g.id);

                return (
                  <div key={String(g.id)} className="mb-3 rounded-lg bg-white p-4 shadow">
                    <h3 className="font-semibold">{getSaved('title-' + g.id) || 'เป้าหมาย #' + g.id}</h3>
                    <p className="text-sm text-gray-600">{formatEther(g.amount)} ETH</p>
                    <p className={'text-sm font-medium ' + (g.isCompleted ? 'text-green-700' : 'text-red-700')}>
                      {g.isCompleted ? 'สำเร็จ: คืนเงินแล้ว' : 'ไม่สำเร็จ: บริจาคให้มูลนิธิแล้ว'}
                    </p>
                    {tx && (
                      <a className="text-sm text-blue-600 underline" href={ETHERSCAN_TX + tx} target="_blank" rel="noreferrer">
                        ดู Transaction บน Etherscan
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
