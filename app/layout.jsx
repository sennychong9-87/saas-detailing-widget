import './globals.css';

export const metadata = {
  title: 'DetailerShield Engine',
  description: 'Interactive Conversion & No-Show Deposit System',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans bg-transparent">
        {children}
      </body>
    </html>
  );
}