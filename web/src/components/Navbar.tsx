import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance, useChainId, useSwitchChain, useReadContract } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { shortenAddress } from '@/lib/formatters';
import { ETHERSCAN_ADDRESS, WTC_TOKEN_ADDRESS, WTC_ABI, addWtcTokenToWallet } from '@/lib/contract';
import { formatEther } from 'viem';
import { Wallet, LogOut, ExternalLink, Copy, Check, ChevronDown, ShieldAlert, Sparkles, Plus, Coins } from 'lucide-react';

interface NavbarProps {
  onOpenSettings: () => void;
  onOpenMetaMaskInstallModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSettings, onOpenMetaMaskInstallModal }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // ดึงยอดเงิน Sepolia ETH
  const { data: balanceData } = useBalance({
    address,
    chainId: sepolia.id,
  });

  // ดึงยอดเหรียญ WTC Token (ERC-20 Reward Token)
  const { data: wtcBalanceRaw, isLoading: isWtcLoading, refetch: refetchWtc } = useReadContract({
    address: WTC_TOKEN_ADDRESS,
    abi: WTC_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address),
    },
  });

  const wtcBalance = wtcBalanceRaw ? parseFloat(formatEther(wtcBalanceRaw as bigint)) : 0;

  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tokenAdded, setTokenAdded] = useState(false);

  const isSepolia = chainId === sepolia.id;

  const handleConnect = async () => {
    const hasMetaMask = typeof window !== 'undefined' && Boolean((window as any).ethereum?.isMetaMask);
    if (!hasMetaMask) {
      onOpenMetaMaskInstallModal();
      return;
    }

    const metaMaskConnector = connectors.find((c) => c.id === 'metaMask' || c.id === 'injected') || connectors[0];
    if (metaMaskConnector) {
      connect({ connector: metaMaskConnector });
    }
  };

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyTokenAddress = () => {
    navigator.clipboard.writeText(WTC_TOKEN_ADDRESS);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleAddToken = async () => {
    const success = await addWtcTokenToWallet();
    if (success) {
      setTokenAdded(true);
      setTimeout(() => setTokenAdded(false), 2500);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* โลโก้ และ ชื่อเว็บ */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-glow">
            <span className="text-xl">🎯</span>
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-950">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                Do<span className="text-emerald-400">Or</span>Donate
              </h1>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                Sepolia
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              มัดจำเป้าหมายด้วย ETH • สำเร็จได้เงินคืน + โบนัสเหรียญ WTC
            </p>
          </div>
        </div>

        {/* ส่วนกระเป๋าเงิน & สถานะ */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ป้ายแสดงยอดเหรียญ WTC คงเหลือในกระเป๋า (เมื่อเชื่อมต่อแล้ว) */}
          {isConnected && isSepolia && (
            <div
              onClick={handleAddToken}
              className="group flex cursor-pointer items-center gap-1.5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-950/30 to-amber-500/5 px-2.5 py-1.5 text-xs transition hover:border-amber-500/60 hover:bg-amber-900/30 active:scale-95"
              title="คลิกเพื่อเพิ่มเหรียญ WTC ลงใน MetaMask ของคุณ"
            >
              <span className="text-sm">🪙</span>
              <div className="flex flex-col text-left">
                <span className="text-[9px] font-bold text-amber-400/90 leading-none">WTC Token</span>
                <span className="font-mono text-xs font-extrabold text-amber-200 leading-tight">
                  {isWtcLoading ? '...' : wtcBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <span className="hidden sm:inline-flex items-center gap-0.5 rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 group-hover:bg-amber-500/30">
                <Plus className="h-2.5 w-2.5" />
                MetaMask
              </span>
            </div>
          )}

          {/* ปุ่มตั้งค่า Contract Address */}
          <button
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 transition hover:border-slate-700 hover:text-slate-200"
            title="ตั้งค่า Contract Address"
          >
            ⚙️
          </button>

          {!isConnected ? (
            /* ปุ่มเชื่อมต่อ MetaMask */
            <button
              onClick={handleConnect}
              disabled={isPending}
              className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 font-medium text-slate-950 shadow-glow transition hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-60"
            >
              <svg className="h-5 w-5 transition group-hover:scale-110" viewBox="0 0 32 32" fill="none">
                <path d="M29.07 1.83a1.5 1.5 0 0 0-1.78.27l-8.52 7.72H13.2L4.7 2.1A1.5 1.5 0 0 0 2.93 1.83C1.8 2.45 1.6 4.07 2.5 4.9l7.7 7.02L3.15 20.3a1.5 1.5 0 0 0 .28 2.24l11.4 8.24a2 2 0 0 0 2.34 0l11.4-8.24a1.5 1.5 0 0 0 .28-2.24l-7.05-8.38 7.7-7.02c.9-.83.7-2.45-.43-3.07z" fill="#E2761B"/>
                <path d="M16 23.5l-6.8-4.9 2.5-3.6h8.6l2.5 3.6-6.8 4.9z" fill="#E4761B"/>
                <path d="M13.2 9.82h5.6l2.9 4.18H10.3l2.9-4.18z" fill="#D7C1B3"/>
                <path d="M9.2 15h13.6l-2 5.5H11.2l-2-5.5z" fill="#233447"/>
                <path d="M11.5 20.5h9l-4.5 4-4.5-4z" fill="#CD6116"/>
              </svg>
              <span className="text-sm font-semibold tracking-wide">
                {isPending ? 'กำลังเชื่อมต่อ...' : 'เชื่อมต่อ MetaMask'}
              </span>
            </button>
          ) : (
            /* สถานะเมื่อเชื่อมต่อแล้ว */
            <div className="relative">
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 p-1 pl-3 shadow-inner">
                {/* เครือข่าย */}
                {!isSepolia ? (
                  <button
                    onClick={() => switchChain({ chainId: sepolia.id })}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-2 py-1 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/30"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>สลับเป็น Sepolia</span>
                  </button>
                ) : (
                  <div className="hidden items-center gap-1.5 sm:flex">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-medium text-slate-400">Sepolia</span>
                  </div>
                )}

                {/* ยอดเงิน Sepolia ETH */}
                {isSepolia && balanceData && (
                  <div className="hidden border-l border-slate-800 pl-2 sm:block">
                    <span className="text-xs font-semibold text-slate-200">
                      {parseFloat(balanceData.formatted).toFixed(3)} ETH
                    </span>
                  </div>
                )}

                {/* ปุ่ม Address + Dropdown */}
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700 active:scale-95"
                >
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-mono">{shortenAddress(address || '')}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* Dropdown เมนูเมื่อกดที่ชื่อกระเป๋า */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                  />
                  <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-2xl">
                    <div className="border-b border-slate-800 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400">กระเป๋า MetaMask</span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                          เชื่อมต่อแล้ว
                        </span>
                      </div>
                      <p className="mt-1.5 font-mono text-xs text-slate-200 break-all bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                        {address}
                      </p>
                    </div>

                    {/* แสดงยอด WTC Token ใน Dropdown */}
                    <div className="my-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs text-amber-300">
                          <span>🪙</span>
                          <span className="font-semibold">โบนัส WTC ในกระเป๋า:</span>
                        </div>
                        <span className="font-mono text-xs font-bold text-amber-200">
                          {wtcBalance.toFixed(2)} WTC
                        </span>
                      </div>
                      <button
                        onClick={handleAddToken}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500/20 py-1.5 text-[11px] font-bold text-amber-300 transition hover:bg-amber-500/30"
                      >
                        {tokenAdded ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            <span>เพิ่มเหรียญลง MetaMask แล้ว!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5" />
                            <span>เพิ่มเหรียญ WTC ลง MetaMask</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      <button
                        onClick={handleCopy}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
                          {copied ? 'คัดลอก Wallet Address แล้ว!' : 'คัดลอก Wallet Address'}
                        </span>
                      </button>

                      <button
                        onClick={handleCopyTokenAddress}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          {copiedToken ? <Check className="h-3.5 w-3.5 text-amber-400" /> : <Coins className="h-3.5 w-3.5 text-slate-400" />}
                          {copiedToken ? 'คัดลอก WTC Token Address แล้ว!' : 'คัดลอก WTC Token Address'}
                        </span>
                      </button>

                      <a
                        href={ETHERSCAN_ADDRESS + address}
                        target="_blank"
                        rel="noreferrer"
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                          ดูประวัติบน Etherscan
                        </span>
                      </a>

                      <button
                        onClick={() => {
                          disconnect();
                          setDropdownOpen(false);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-red-400 transition hover:bg-red-500/10 mt-1 border-t border-slate-800/80 pt-2"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        ตัดการเชื่อมต่อ
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
