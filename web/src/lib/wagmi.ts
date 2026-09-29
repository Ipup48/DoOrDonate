import { http, createConfig, fallback } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// ตั้งค่า Wagmi ให้เชื่อมต่อเฉพาะ MetaMask บนเครือข่าย Sepolia Testnet
// ใช้ Fallback RPC หลายจุดเพื่อป้องกันปัญหา RPC ล่มหรือติด Rate-limit
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  transports: {
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia-rpc.publicnode.com'),
      http('https://rpc.sepolia.org'),
      http('https://1rpc.io/sepolia'),
      http('https://sepolia.drpc.org'),
      http(),
    ]),
  },
  ssr: true,
});
