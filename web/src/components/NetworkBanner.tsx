import React from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { AlertTriangle, ArrowRight } from 'lucide-react';

export const NetworkBanner: React.FC = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || chainId === sepolia.id) {
    return null;
  }

  return (
    <div className="border-b border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/15 to-amber-500/10 px-4 py-2.5 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2.5 text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          <span>
            <strong>ตรวจพบเครือข่ายไม่ถูกต้อง:</strong> สัญญา DoOrDonate ทำงานบน <strong>Sepolia Testnet</strong> เท่านั้น
          </span>
        </div>
        <button
          onClick={() => switchChain({ chainId: sepolia.id })}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:opacity-50"
        >
          <span>{isPending ? 'กำลังสลับ...' : 'สลับไปยัง Sepolia ใน MetaMask'}</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
