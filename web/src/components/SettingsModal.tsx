import React, { useState } from 'react';
import { getContractAddress, setCustomContractAddress } from '@/lib/contract';
import { isAddress } from 'viem';
import { X, Check, RefreshCw } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onUpdated }) => {
  const currentAddress = getContractAddress();
  const [addressInput, setAddressInput] = useState(
    currentAddress === '0x0000000000000000000000000000000000000000' ? '' : currentAddress
  );
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = addressInput.trim();
    if (trimmed && !isAddress(trimmed)) {
      setError('รูปแบบ Contract Address ไม่ถูกต้อง');
      return;
    }
    setError('');
    setCustomContractAddress(trimmed);
    setSuccess(true);
    setTimeout(() => {
      onUpdated();
      setSuccess(false);
      onClose();
    }, 700);
  };

  const handleReset = () => {
    setCustomContractAddress('');
    setAddressInput(
      (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONTRACT_ADDRESS) ||
      (typeof process !== 'undefined' && process.env?.VITE_CONTRACT_ADDRESS) ||
      ''
    );
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-slate-100">⚙️ ตั้งค่า Contract Address</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">
              DoOrDonate Contract Address (Sepolia)
            </label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => {
                setAddressInput(e.target.value);
                setError('');
              }}
              placeholder="0x..."
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
            <p className="mt-1.5 text-[11px] text-slate-400">
              นำ Address มาจากช่อง Deployed Contracts ใน Remix IDE หลังจากทำการ Deploy เรียบร้อยแล้ว
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={handleReset}
              type="button"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              รีเซ็ตเป็นค่าเริ่มต้น
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                type="button"
                className="rounded-xl border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                type="button"
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-emerald-500 active:scale-95"
              >
                {success ? <Check className="h-3.5 w-3.5" /> : null}
                {success ? 'บันทึกสำเร็จ' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
