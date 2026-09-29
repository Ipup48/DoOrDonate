import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'DoOrDonate',
  description: 'มัดจำเป้าหมายชีวิต ทำสำเร็จได้เงินคืน ไม่สำเร็จเงินไปบริจาค',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
