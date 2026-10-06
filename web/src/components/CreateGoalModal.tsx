import React, { useState } from 'react';
import { parseEther, isAddress } from 'viem';
import { CHARITIES, getContractAddress, ABI, calculateWtcBonus, WTC_REWARD_RATE } from '@/lib/contract';
import { setPendingGoalCreation } from '@/lib/storage';
import { X, Sparkles, AlertCircle, Heart, Lock, Calendar, Coins, ArrowUpRight, Loader2, Gift, Zap } from 'lucide-react';
import { useAccount, useWriteContract, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTransactionInitiated: (txHash: `0x${string}`) => void;
}

const MIN_DEPOSIT = 0.001;
const MAX_DEPOSIT = 10.0;

export const CreateGoalModal: React.FC<Props> = ({ isOpen, onClose, onTransactionInitiated }) => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const { data: balanceData } = useBalance({
    address,
    chainId: sepolia.id,
  });

  const userBalanceEth = balanceData ? parseFloat(balanceData.formatted) : null;

  const [title, setTitle] = useState('');
  const [days, setDays] = useState('7');
  const [amount, setAmount] = useState('0.01');
  const [selectedCharity, setSelectedCharity] = useState(CHARITIES[0]?.address || '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [demoMode, setDemoMode] = useState<'none' | 'instant' | 'expired'>('none');

  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const isBusy = isWritePending || isSubmitting;

  if (!isOpen) return null;

  const previewBonusWtc = calculateWtcBonus(amount);

  const handleQuickDays = (d: number) => {
    setDays(String(d));
    setError('');
  };

  const handleQuickAmount = (val: number) => {
    setAmount(val.toString());
    setError('');
  };

  const handleSetMax = () => {
    if (userBalanceEth !== null && userBalanceEth > 0) {
      const maxSpendable = Math.max(MIN_DEPOSIT, parseFloat((userBalanceEth - 0.001).toFixed(4)));
      const clamped = Math.min(MAX_DEPOSIT, maxSpendable);
      setAmount(clamped.toString());
    } else {
      setAmount('0.01');
    }
    setError('');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const isInstantDemo = demoMode === 'instant';
    const isExpiredDemo = demoMode === 'expired';

    let targetTitle = title.trim();
    if (!targetTitle) {
      if (isExpiredDemo) {
        targetTitle = '[Demo] เป้าหมายหมดอายุ (ทดสอบบริจาค)';
      } else if (isInstantDemo) {
        targetTitle = '[Demo] สาธิตต่อหน้าอาจารย์ (Instant Claim)';
      } else {
        return setError('กรุณาระบุชื่อเป้าหมายที่คุณต้องการทำให้สำเร็จ');
      }
    } else if (isExpiredDemo && !targetTitle.includes('[Demo]')) {
      targetTitle = `[Demo] ${targetTitle}`;
    } else if (isInstantDemo && !targetTitle.includes('[Demo]')) {
      targetTitle = `[Demo] ${targetTitle}`;
    }

    let durationInDays = 7n;
    if (demoMode === 'none') {
      const daysNum = parseInt(days, 10);
      if (isNaN(daysNum) || daysNum < 1) {
        return setError('ระยะเวลาต้องอย่างน้อย 1 วันขึ้นไป (ตามเงื่อนไขของ Smart Contract)');
      }
      durationInDays = BigInt(daysNum);
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return setError('กรุณาระบุจำนวนเงินมัดจำที่ถูกต้อง');
    }

    if (amountNum < MIN_DEPOSIT) {
      return setError(`จำนวนเงินมัดจำขั้นต่ำคือ ${MIN_DEPOSIT} ETH`);
    }

    if (amountNum > MAX_DEPOSIT) {
      return setError(`จำนวนเงินมัดจำต้องไม่เกิน ${MAX_DEPOSIT} ETH`);
    }

    if (!address) {
      return setError('กรุณาเชื่อมต่อกระเป๋า MetaMask ก่อนทำรายการ');
    }

    // ดึง Contract Address ที่ตั้งไว้สดๆ ทันทีที่กดส่ง
    const currentContract = getContractAddress();
    if (!currentContract || currentContract === '0x0000000000000000000000000000000000000000') {
      return setError('ยังไม่ได้ระบุ Contract Address ของ DoOrDonate (กรุณาตั้งค่าที่ปุ่ม ⚙️ ด้านบนขวา)');
    }

    const charityAddress = selectedCharity;
    if (!charityAddress || !isAddress(charityAddress)) {
      return setError('กรุณาเลือกมูลนิธิหรือกองทุนที่ถูกต้อง');
    }

    if (charityAddress.toLowerCase() === address.toLowerCase()) {
      return setError('กระเป๋าผู้รับบริจาคต้องไม่ใช่กระเป๋าของตัวคุณเอง');
    }

    if (userBalanceEth !== null && userBalanceEth > 0 && amountNum > userBalanceEth) {
      return setError(`ยอดเงิน Sepolia ETH ในกระเป๋าไม่เพียงพอ (คุณมี ${userBalanceEth.toFixed(4)} ETH แต่ต้องการมัดจำ ${amountNum} ETH)`);
    }

    try {
      setIsSubmitting(true);

      if (chainId !== sepolia.id && switchChainAsync) {
        try {
          await switchChainAsync({ chainId: sepolia.id });
        } catch {
          setIsSubmitting(false);
          return setError('กรุณาสลับเครือข่ายเป็น Sepolia Testnet ใน MetaMask ก่อนดำเนินการ');
        }
      }

      const nowSec = Math.floor(Date.now() / 1000);
      const createdAtSec = isExpiredDemo ? nowSec - 86400 : nowSec;
      const deadlineSec = isExpiredDemo ? nowSec - 1 : (isInstantDemo ? nowSec + 300 : nowSec + Number(durationInDays) * 86400);

      setPendingGoalCreation({
        title: targetTitle,
        createdAt: createdAtSec,
        deadline: deadlineSec,
        charityWallet: charityAddress,
        isDemo: isInstantDemo,
        isExpiredDemo: isExpiredDemo,
      });

      let hash: `0x${string}` | undefined;

      // ปล่อยให้ wagmi/viem และ MetaMask ประมาณค่า Gas จริงตามระบบอัตโนมัติ (ไม่ฟิกซ์ gas: 600000n)
      if (isExpiredDemo) {
        try {
          hash = await writeContractAsync({
            address: currentContract as `0x${string}`,
            abi: ABI,
            functionName: 'createExpiredDemoGoal',
            args: [charityAddress as `0x${string}`],
            value: parseEther(amountNum.toString()),
          });
        } catch (eExp: any) {
          console.warn('createExpiredDemoGoal failed, fallback to createGoal:', eExp);
          hash = await writeContractAsync({
            address: currentContract as `0x${string}`,
            abi: ABI,
            functionName: 'createGoal',
            args: [1n, charityAddress as `0x${string}`],
            value: parseEther(amountNum.toString()),
          });
        }
      } else if (isInstantDemo) {
        try {
          hash = await writeContractAsync({
            address: currentContract as `0x${string}`,
            abi: ABI,
            functionName: 'createDemoGoal',
            args: [charityAddress as `0x${string}`],
            value: parseEther(amountNum.toString()),
          });
        } catch (eDemo: any) {
          console.warn('createDemoGoal failed, fallback to createGoal:', eDemo);
          hash = await writeContractAsync({
            address: currentContract as `0x${string}`,
            abi: ABI,
            functionName: 'createGoal',
            args: [1n, charityAddress as `0x${string}`],
            value: parseEther(amountNum.toString()),
          });
        }
      } else {
        hash = await writeContractAsync({
          address: currentContract as `0x${string}`,
          abi: ABI,
          functionName: 'createGoal',
          args: [durationInDays, charityAddress as `0x${string}`],
          value: parseEther(amountNum.toString()),
        });
      }

      if (hash) {
        onTransactionInitiated(hash);
        onClose();
        setTitle('');
        setDays('7');
        setAmount('0.01');
        setDemoMode('none');
      }
    } catch (err: any) {
      console.error('Create goal error:', err);
      const msg = err.shortMessage || err.message || 'เกิดข้อผิดพลาดในการทำรายการบน MetaMask';
      if (msg.includes('User rejected') || msg.includes('user rejected') || err?.code === 4001) {
        setError('คุณได้ยกเลิกรายการบน MetaMask');
      } else if (msg.includes('insufficient funds')) {
        setError('ยอดเงิน Sepolia ETH ในกระเป๋าไม่พอจ่ายเงินมัดจำหรือค่า Gas');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">สร้างเป้าหมายใหม่ (Commitment)</h2>
              <p className="text-xs text-slate-400">ล็อคเงินมัดจำด้วย Smart Contract เพื่อสร้างวินัยและรับโบนัส WTC</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  ระยะเวลา (วัน) <span className="text-emerald-400">*</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (demoMode === 'instant') {
                        setDemoMode('none');
                        setDays('7');
                        if (title === '⚡ สาธิตระบบต่อหน้าอาจารย์ (Instant Claim Demo)') setTitle('');
                      } else {
                        setDemoMode('instant');
                        setDays('1');
                        if (!title.trim() || title === '[Demo] เป้าหมายที่หมดเวลา (ทดสอบบริจาค)') {
                          setTitle('⚡ สาธิตระบบต่อหน้าอาจารย์ (Instant Claim Demo)');
                        }
                      }
                      setError('');
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                      demoMode === 'instant'
                        ? 'bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm'
                        : 'bg-purple-950/40 text-purple-400 border border-purple-500/30 hover:bg-purple-900/50'
                    }`}
                    title="โหมดพิเศษสำหรับแสดงให้อาจารย์ดู สามารถกดเคลมเงินคืนและโบนัส WTC ได้ทันที"
                  >
                    <Zap className="h-3 w-3 text-purple-400" />
                    <span>⚡ Demo เคลมทันที</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (demoMode === 'expired') {
                        setDemoMode('none');
                        setDays('7');
                        if (title === '[Demo] เป้าหมายที่หมดเวลา (ทดสอบบริจาค)') setTitle('');
                      } else {
                        setDemoMode('expired');
                        setDays('1');
                        if (!title.trim() || title === '⚡ สาธิตระบบต่อหน้าอาจารย์ (Instant Claim Demo)') {
                          setTitle('[Demo] เป้าหมายที่หมดเวลา (ทดสอบบริจาค)');
                        }
                      }
                      setError('');
                    }}
                    className={`flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold transition ${
                      demoMode === 'expired'
                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/50 shadow-sm'
                        : 'bg-rose-950/40 text-rose-400 border border-rose-500/30 hover:bg-rose-900/50'
                    }`}
                    title="โหมดทดสอบทำไม่สำเร็จ: สร้างเป้าหมายที่หมดเวลาทันที เพื่อสาธิตปุ่มส่งมอบเงินบริจาคเข้ามูลนิธิ"
                  >
                    <Heart className="h-3 w-3 text-rose-400" />
                    <span>💔 Demo บริจาคทันที</span>
                  </button>
                </div>
              </div>

              {demoMode === 'instant' ? (
                <div className="mt-1.5 rounded-xl border border-purple-500/40 bg-purple-950/30 p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
                    <Zap className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
                    <span>เปิดใช้งาน: โหมดนำเสนออาจารย์ (Instant Unlock)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-purple-200/80 leading-relaxed">
                    เป้าหมายนี้จะถูกตั้งเป็น <strong>Instant Unlock</strong> เพื่อให้คุณสามารถทดลองกดรับเงินมัดจำคืน 100% + เหรียญ WTC ได้ทันทีโดยไม่ต้องรอ 80% Time-Lock
                  </p>
                </div>
              ) : demoMode === 'expired' ? (
                <div className="mt-1.5 rounded-xl border border-rose-500/40 bg-rose-950/30 p-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                    <Heart className="h-3.5 w-3.5 text-rose-400 animate-pulse" />
                    <span>เปิดใช้งาน: โหมดทดสอบทำไม่สำเร็จ (Demo บริจาคทันที)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-rose-200/80 leading-relaxed">
                    เป้าหมายนี้จะถูกสร้างให้ <strong>หมดเวลาทันที (Expired)</strong> เพื่อใช้สาธิตปุ่มส่งมอบเงินบริจาคเข้ามูลนิธิ หรือสมทบเข้ากองทุนผู้ทำสำเร็จให้อาจารย์ดูได้ทันที
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  เงินมัดจำ (ETH) <span className="text-emerald-400">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {userBalanceEth !== null ? (
                    <>กระเป๋า: <span className="text-emerald-400 font-semibold">{userBalanceEth.toFixed(4)}</span> ETH</>
                  ) : (
                    `ขั้นต่ำ ${MIN_DEPOSIT} ETH`
                  )}
                </span>
              </div>

              <div className="relative mt-1.5">
                <input
                  type="number"
                  step="0.001"
                  min={MIN_DEPOSIT}
                  max={MAX_DEPOSIT}
                  required
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder={`ขั้นต่ำ ${MIN_DEPOSIT}`}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 pr-16 text-sm font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSetMax}
                  className="absolute right-1.5 top-1.5 rounded-lg bg-emerald-500/20 px-2 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/30"
                  title="ใส่ยอดสูงสุดในกระเป๋า"
                >
                  MAX
                </button>
              </div>

              <div className="mt-1.5 flex items-center justify-between gap-1">
                {[0.005, 0.01, 0.05, 0.1].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleQuickAmount(val)}
                    className={`flex-1 rounded-lg py-0.5 text-[11px] font-medium transition ${
                      amount === String(val)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <p className="mt-1 text-[10px] text-slate-500">
                มัดจำขั้นต่ำ {MIN_DEPOSIT} ETH (ได้เงินคืนเต็ม 100% เมื่อทำสำเร็จ)
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-950/20 to-transparent p-3.5 backdrop-blur-sm shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 shadow-md">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-300">คาดการณ์โบนัสที่จะได้รับ:</span>
                    <span className="font-mono text-base font-extrabold text-amber-300 drop-shadow-sm">
                      +{previewBonusWtc > 0 ? previewBonusWtc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '0.00'} WTC
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    คำนวณตามอัตราส่วนมัดจำ <strong className="text-amber-300/90">1 ETH = {WTC_REWARD_RATE} WTC</strong> (โอนเข้ากระเป๋าคุณอัตโนมัติเมื่อทำสำเร็จ)
                  </p>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                  {WTC_REWARD_RATE}x Bonus
                </span>
                <span className="mt-1 text-[10px] text-slate-500">ERC-20 Reward</span>
              </div>
            </div>
          </div>

          {userBalanceEth !== null && userBalanceEth < MIN_DEPOSIT && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
              <p className="font-semibold">⚠️ ยอดเงิน Sepolia ETH ในกระเป๋าเหลือน้อย ({userBalanceEth.toFixed(4)} ETH)</p>
              <p className="mt-0.5 text-slate-300">
                คุณอาจต้องการ Sepolia ETH เพิ่มเติมเพื่อชำระเงินมัดจำและค่าธรรมเนียม Gas
              </p>
              <a
                href="https://cloud.google.com/application/web3/faucet/ethereum/sepolia"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 font-semibold text-emerald-400 underline hover:text-emerald-300"
              >
                <span>กดรับ Sepolia ETH ฟรีจาก Google Cloud Faucet</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Heart className="h-3.5 w-3.5 text-rose-400" />
              มูลนิธิ หรือ กองทุนที่จะได้รับเงินมัดจำ หากคุณทำไม่สำเร็จก่อนกำหนด
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
                        ? c.isPool
                          ? 'border-amber-500/80 bg-amber-950/30 ring-1 ring-amber-500/40 shadow-sm'
                          : 'border-emerald-500/60 bg-emerald-950/20 ring-1 ring-emerald-500/30'
                        : c.isPool
                        ? 'border-amber-900/40 bg-amber-950/10 hover:border-amber-700/60'
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
                        <span className={`font-semibold ${c.isPool ? 'text-amber-200' : 'text-slate-200'}`}>
                          {c.name}
                        </span>
                        <span className={`text-[10px] ${c.isPool ? 'text-amber-300 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded' : 'text-slate-400'}`}>
                          {c.category}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-slate-400">{c.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3.5 text-xs text-slate-300">
            <h4 className="flex items-center gap-1.5 font-semibold text-slate-200">
              <Lock className="h-3.5 w-3.5 text-emerald-400" />
              กลไกความปลอดภัยและผลตอบแทนของ Smart Contract:
            </h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[11px] text-slate-400">
              <li>เงินมัดจำจะถูกล็อคไว้ใน Smart Contract ปลอดภัย ไม่มีใครสามารถดึงเงินออกไปก่อนกำหนดได้</li>
              <li>
                หากคุณทำสำเร็จก่อนหมดเวลา: กด &quot;ขอรับเงินคืน&quot; เพื่อรับเงินมัดจำคืน 100% เต็ม{' '}
                <strong className="text-amber-300">พร้อมรับโบนัสเหรียญ WTC ฟรีโอนเข้ากระเป๋าทันที</strong>
              </li>
              <li>หากหมดเวลาก่อน: สัญญาจะอนุญาตให้โอนเงินมัดจำไปยังมูลนิธิที่ระบุไว้เท่านั้น</li>
            </ul>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

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
              disabled={isBusy || !title.trim() || !amount || parseFloat(amount) <= 0}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-glow transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50"
            >
              {isBusy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>กำลังยืนยันใน MetaMask...</span>
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" />
                  <span>ล็อคเงินมัดจำและเริ่มเป้าหมาย</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};