import React from 'react';
import { X, CheckCircle, AlertCircle, Info, ExternalLink, Loader2 } from 'lucide-react';
import { ETHERSCAN_TX } from '@/lib/contract';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'pending';
  title: string;
  message?: string;
  txHash?: string;
}

interface Props {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<Props> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl transition-all animate-in slide-in-from-bottom-3"
        >
          <div className="shrink-0 mt-0.5">
            {t.type === 'success' && <CheckCircle className="h-5 w-5 text-emerald-400" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400" />}
            {t.type === 'info' && <Info className="h-5 w-5 text-blue-400" />}
            {t.type === 'pending' && <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />}
          </div>

          <div className="flex-1 text-xs">
            <h4 className="font-semibold text-slate-100">{t.title}</h4>
            {t.message && <p className="mt-0.5 text-slate-400">{t.message}</p>}
            {t.txHash && (
              <a
                href={ETHERSCAN_TX + t.txHash}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 underline hover:text-emerald-300"
              >
                <span>ดูธุรกรรมบน Etherscan</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
