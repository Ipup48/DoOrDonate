import React, { useState } from 'react';
import { getContractAddress, setCustomContractAddress } from '@/lib/contract';
import { isAddress } from 'viem';
import { Wrench, Check, AlertCircle } from 'lucide-react';

interface Props {
  onAddressUpdated: () => void;
}

export const ContractAddressBanner: React.FC<Props> = ({ onAddressUpdated }) => {
  const currentAddress = getContractAddress();
  const isZeroAddress = !currentAddress || currentAddress === '0x0000000000000000000000000000000000000000';

  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  if (!isZeroAddress) return null;

  const handleSave = () => {
    const trimmed = inputVal.trim();
    if (!isAddress(trimmed)) {
      setError('รูปแบบ Contract Address ไม่ถูกต้อง (ต้องขึ้นต้นด้วย 0x และมีความยาว 42 ตัวอักษร)');
      return;
    }
    setError('');
    setCustomContractAddress(trimmed);
    setSaved(true);
    setTimeout(() => {
      onAddressUpdated();
      setSaved(false);
    }, 1000);
  };

  return (
    <div className="mx-auto my-4 max-w-4xl rounded-2xl border border-blue-500/30 bg-blue-950/40 p-4 shadow-xl backdrop-blur-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400">
          <Wrench className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-200">ยังไม่ได้ระบุ Contract Address สำหรับ DoOrDonate</h3>
          <p className="mt-1 text-xs text-blue-300/80">
            หลังจากที่คุณ Compile และ Deploy สัญญา <code className="rounded bg-blue-900/50 px-1 py-0.5">DoOrDonate.sol</code> ใน Remix IDE แล้ว
            กรุณานำ Contract Address มาใส่ที่นี่เพื่อเริ่มใช้งานหน้าเว็บ
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="วาง Contract Address เช่น 0x123..."
              value={inputVal}
              onChange={(e) => {
                setInputVal(e.target.value);
                setError('');
              }}
              className="flex-1 rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs font-mono text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-500 active:scale-95"
            >
              {saved ? <Check className="h-4 w-4" /> : null}
              {saved ? 'บันทึกแล้ว!' : 'บันทึก Contract Address'}
            </button>
          </div>

          {error && (
            <p className="mt-2 flex items-center gap-1 text-xs text-red-400">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
