import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';

// ตั้งค่า Wagmi + RainbowKit ให้ใช้เครือข่าย Sepolia
export const config = getDefaultConfig({
  appName: 'DoOrDonate',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo',
  chains: [sepolia],
  ssr: true, // จำเป็นสำหรับ Next.js
});
