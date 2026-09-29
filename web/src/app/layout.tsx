import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'DoOrDonate - มัดจำเป้าหมายชีวิตด้วย ETH (Sepolia)',
  description: 'มัดจำเป้าหมายชีวิตด้วย ETH บน Sepolia Testnet — ทำสำเร็จได้เงินคืน ไม่สำเร็จเงินบริจาคมูลนิธิ',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎯</text></svg>",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-slate-950 text-slate-100 font-sans antialiased min-h-screen selection:bg-emerald-500/30 selection:text-emerald-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
