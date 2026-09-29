import React, { useState } from 'react';
import { parseEther, isAddress } from 'viem';
import { CHARITIES, getContractAddress, ABI } from '@/lib/contract';
import { setPendingGoalCreation } from '@/lib/storage';
import { X, Sparkles, AlertCircle, Heart, Lock, Calendar, Coins } from 'lucide-react';
import { useAccount, useWriteContract } from 'wagmi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTransactionInitiated: (txHash: `0x${string}`) => void;
}

export const CreateGoalModal: React.FC<Props> = ({ isOpen, onClose, onTransactionInitiated }) => {
  const { address } = useAccount();
  const contractAddress = getContractAddress();

  const [title, setTitle] = useState('');
  const [days, setDays] = useState('7');
  const [amount, setAmount] = useState('0.01');
  const [selectedCharity, setSelectedCharity] = useState(CHARITIES[0].address);
  const [customCharityAddress, setCustomCharityAddress] = useState('');
  const [error, setError] = useState('');

  const { writeContractAsync, isPending } = useWriteContract();

  if (!isOpen) return null;

  const handleQuickDays = (d: number) => {
    setDays(String(d));
    setError('');
  };

  const handleQuickAmount = (a: string) => {
    setAmount(a);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return setError('กรุณาระบุชื่อเป้าหมายที่คุณต้องการทำให้สำเร็จ');
    }

    const daysNum = parseInt(days, 10);
    if (isNaN(daysNum) || daysNum < 1) {
      return setError('ระยะเวลาต้องอย่างน้อย 1 วันขึ้นไป (ตามเงื่อนไขของ Smart Contract)');
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return setError('จำนวนเงินมัดจำต้องมากกว่า 0 ETH');
    }

    const charityAddress = selectedCharity === 'custom' ? customCharityAddress.trim() : selectedCharity;

    if (!isAddress(charityAddress)) {
      return setError('Wallet Address ของมูลนิธิไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
    }

    // Smart contract check: require(_charityWallet != msg.sender, "Charity cannot be yourself");
    if (address && charityAddress.toLowerCase() === address.toLowerCase()) {
      return setError('กระเป๋าผู้รับบริจาคต้องไม่ใช่กระเป๋าของตัวคุณเอง');
    }

    setError('');

    try {
      // บันทึกเป้าหมายไว้ใน pending state อย่างปลอดภัย
      setPendingGoalCreation({
        title: trimmedTitle,
        createdAt: Math.floor(Date.now() / 1000),
      });

      const hash = await writeContractAsync({
        address: contractAddress,
        abi: ABI,
        functionName: 'createGoal',
        args: [BigInt(daysNum), charityAddress as `0x${string}`],
        value: parseEther(amount),
      });

      if (hash) {
        onTransactionInitiated(hash);
        onClose();
        // Reset form
        setTitle('');
        setDays('7');
        setAmount('0.01');
      }
    } catch (err: any) {
      console.error('Create goal error:', err);
      const msg = err.shortMessage || err.message || 'เกิดข้อผิดพลาดในการทำรายการบน MetaMask';
      if (msg.includes('User rejected')) {
        setError('คุณได้ยกเลิกรายการบน MetaMask');
      } else {
        setError(msg);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">สร้างเป้าหมายใหม่ (Commitment)</h2>
              <p className="text-xs text-slate-400">ล็อคเงินมัดจำด้วย Smart Contract เพื่อสร้างวินัย</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* ชื่อเป้าหมาย */}
          <div>
            <label className="block text-xs font-semibold text-slate-300">
              ชื่อเป้าหมายที่คุณสัญญาว่าจะทำให้สำเร็จ <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError('');
              }}
              placeholder="เช่น ตื่นนอนตี 5 วิ่งออกกำลังกาย 5 กม. ทุกวัน, ทำโปรเจกต์ให้เสร็จ..."
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* ระยะเวลา & จำนวนเงิน */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* ระยะเวลา */}
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  ระยะเวลา (วัน) <span className="text-emerald-400">*</span>
                </label>
              </div>
              <input
                type="number"
                min="1"
                required
                value={days}
                onChange={(e) => {
                  setDays(e.target.value);
                  setError('');
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <div className="mt-1.5 flex gap-1.5">
                {[3, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleQuickDays(d)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition ${
                      days === String(d)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    +{d} วัน
                  </button>
                ))}
              </div>
            </div>

            {/* เงินมัดจำ */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                เงินมัดจำ (Sepolia ETH) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="number"
                step="0.001"
                min="0.0001"
                required
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError('');
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <div className="mt-1.5 flex gap-1.5">
                {['0.005', '0.01', '0.05', '0.1'].map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => handleQuickAmount(a)}
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-medium transition font-mono ${
                      amount === a
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* เลือกมูลนิธิ */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              มูลนิธิที่จะได้รับเงินมัดจำ หากคุณทำไม่สำเร็จก่อนกำหนด
            </label>
            <div className="mt-2 space-y-2">
              {CHARITIES.map((c) => {
                const isSelected = selectedCharity === c.address;
                return (
                  <label
                    key={c.address}
                    onClick={() => setSelectedCharity(c.address)}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      isSelected
                        ? 'border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="charity"
                      checked={isSelected}
                      onChange={() => setSelectedCharity(c.address)}
                      className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{c.name}</span>
                        <span className="text-[10px] text-slate-400">{c.category}</span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{c.description}</p>
                    </div>
                  </label>
                );
              })}

              {/* ตัวเลือกกำหนด Address เอง */}
              <label
                onClick={() => setSelectedCharity('custom')}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                  selectedCharity === 'custom'
                    ? 'border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                    : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="charity"
                  checked={selectedCharity === 'custom'}
                  onChange={() => setSelectedCharity('custom')}
                  className="mt-0.5 text-emerald-500 focus:ring-emerald-500"
                />
                <div className="flex-1 text-xs">
                  <span className="font-semibold text-slate-200">ระบุ Wallet Address ของมูลนิธิเอง</span>
                  <p className="mt-0.5 text-[11px] text-slate-400">กรอกเลขกระเป๋า Ethereum ของมูลนิธิที่คุณต้องการ</p>
                </div>
              </label>
            </div>

            {selectedCharity === 'custom' && (
              <input
                type="text"
                value={customCharityAddress}
                onChange={(e) => {
                  setCustomCharityAddress(e.target.value);
                  setError('');
                }}
                placeholder="0x..."
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
              />
            )}
          </div>

          {/* สรุปเงื่อนไข Smart Contract */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs text-slate-300">
            <h4 className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              กลไกความปลอดภัยของ Smart Contract:
            </h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-slate-400">
              <li>เงินมัดจำจะถูกล็อคไว้ใน Smart Contract ปลอดภัย ไม่มีใครสามารถดึงเงินออกไปก่อนกำหนดได้</li>
              <li>หากคุณทำสำเร็จก่อนหมดเวลา: กด &quot;ขอรับเงินคืน&quot; เพื่อรับเงินมัดจำคืน 100% เต็ม</li>
              <li>หากหมดเวลาก่อน: สัญญาจะอนุญาตให้โอนเงินไปยังมูลนิธิที่ระบุไว้เท่านั้น</li>
            </ul>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* ปุ่มบันทึกและส่งธุรกรรม */}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-glow transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{isPending ? 'กำลังยืนยันใน MetaMask...' : 'ล็อคเงินมัดจำและเริ่มเป้าหมาย'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
