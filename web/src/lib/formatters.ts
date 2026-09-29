import { formatEther } from 'viem';

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length < chars * 2 + 2) return address;
  return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
}

export function formatEthAmount(amount: bigint): string {
  const formatted = formatEther(amount);
  const num = parseFloat(formatted);
  if (num === 0) return '0';
  if (num < 0.0001) return '< 0.0001';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  });
}

export function formatSecondsLeft(seconds: number): {
  days: number;
  hours: number;
  minutes: number;
  secs: number;
  text: string;
  isExpired: boolean;
} {
  if (seconds <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      secs: 0,
      text: 'หมดเวลาแล้ว',
      isExpired: true,
    };
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0 || days > 0) parts.push(`${hours} ชม.`);
  parts.push(`${minutes} นาที`);
  parts.push(`${secs} วิ`);

  return {
    days,
    hours,
    minutes,
    secs,
    text: parts.join(' '),
    isExpired: false,
  };
}

export function calculateTimeProgress(createdAt: number | undefined, deadline: number, currentNow: number): number {
  if (!createdAt || createdAt >= deadline) {
    // If we don't have createdAt, estimate based on remaining time
    const remaining = deadline - currentNow;
    if (remaining <= 0) return 100;
    return 50;
  }
  const total = deadline - createdAt;
  const elapsed = currentNow - createdAt;
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}
