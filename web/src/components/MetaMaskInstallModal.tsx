import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const MetaMaskInstallModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/20 text-orange-400">
              <svg className="h-5 w-5" viewBox="0 0 32 32" fill="none">
                <path d="M29.07 1.83a1.5 1.5 0 0 0-1.78.27l-8.52 7.72H13.2L4.7 2.1A1.5 1.5 0 0 0 2.93 1.83C1.8 2.45 1.6 4.07 2.5 4.9l7.7 7.02L3.15 20.3a1.5 1.5 0 0 0 .28 2.24l11.4 8.24a2 2 0 0 0 2.34 0l11.4-8.24a1.5 1.5 0 0 0 .28-2.24l-7.05-8.38 7.7-7.02c.9-.83.7-2.45-.43-3.07z" fill="#E2761B"/>
              </svg>
            </div>
            <h3 className="text-base font-bold text-slate-100">จำเป็นต้องมี MetaMask</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-300">
            ระบบ <strong>DoOrDonate</strong> รองรับการเชื่อมต่อผ่านกระเป๋า <strong>MetaMask</strong> โดยเฉพาะ แต่เบราว์เซอร์ของคุณยังไม่ได้ติดตั้งส่วนขยาย MetaMask
          </p>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs text-slate-400">
            <h4 className="font-semibold text-slate-200">วิธีติดตั้งง่าย ๆ ใน 1 นาที:</h4>
            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
              <li>คลิกปุ่ม <strong>&quot;ดาวน์โหลด MetaMask&quot;</strong> ด้านล่าง</li>
              <li>ติดตั้ง Extension ลงใน Chrome / Brave / Edge หรือเบราว์เซอร์ที่คุณใช้</li>
              <li>สร้างหรือนำเข้ากระเป๋าเงินของคุณ</li>
              <li>รีเฟรชหน้านี้ แล้วกดปุ่ม <strong>เชื่อมต่อ MetaMask</strong> อีกครั้ง</li>
            </ol>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
            >
              ปิดหน้าต่าง
            </button>
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noreferrer"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-2.5 text-xs font-semibold text-slate-950 shadow-lg transition hover:from-orange-400 hover:to-amber-400"
            >
              <Download className="h-4 w-4" />
              <span>ดาวน์โหลด MetaMask</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
