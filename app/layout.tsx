export const metadata = {
  title: 'Odyssee',
  description: 'Tradingbot Dashboard'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ background: '#111', margin: 0 }}>{children}</body>
    </html>
  );
}
