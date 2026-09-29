import React, { useState, useEffect } from 'react';
import { X, Check, Paperclip, Link2, FileText } from 'lucide-react';
import { saveGoalMeta, getGoalMeta } from '@/lib/storage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  goalId: bigint | null;
  goalTitle: string;
  onSaved: () => void;
}

export const ProofModal: React.FC<Props> = ({ isOpen, onClose, goalId, goalTitle, onSaved }) => {
  const [proofText, setProofText] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (goalId !== null) {
      const meta = getGoalMeta(goalId);
      setProofText(meta.proof || '');
    }
  }, [goalId, isOpen]);

  if (!isOpen || goalId === null) return null;

  const handleSave = () => {
    saveGoalMeta(goalId, {
      proof: proofText.trim(),
      proofSubmittedAt: Math.floor(Date.now() / 1000),
    });
    setSaved(true);
    setTimeout(() => {
      onSaved();
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Paperclip className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">แนบหลักฐานความสำเร็จ</h3>
              <p className="text-xs text-slate-400 truncate max-w-xs">{goalTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300">
              รายละเอียดหรือลิงก์หลักฐาน
            </label>
            <textarea
              rows={4}
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="เช่น https://strava.com/... หรือ https://github.com/... หรือ อธิบายความก้าวหน้าที่คุณทำสำเร็จ..."
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
              <Link2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>ลิงก์รูป / โพสต์ / Drive</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-950/40 p-2">
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>บันทึกความสำเร็จส่วนตัว</span>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              onClick={onClose}
              type="button"
              className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-glow hover:bg-emerald-500 active:scale-95"
            >
              {saved ? <Check className="h-4 w-4" /> : null}
              {saved ? 'บันทึกเรียบร้อย' : 'บันทึกหลักฐาน'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
