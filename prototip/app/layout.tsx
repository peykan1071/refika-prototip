import './globals.css';
export const metadata = {
  title: 'REFİKA – Rehber eTwinning Faaliyetleri İl Koordinatörü Ajanı',
  description: 'Rehber eTwinning Faaliyetleri İl Koordinatörü Ajanı. Validasyon, hesap inceleme ve koordinatör onayı prototipi.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
