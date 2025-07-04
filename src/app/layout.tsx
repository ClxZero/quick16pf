import './globals.css';
import { Livvic, Quicksand } from 'next/font/google';
import { ThreadsBackground } from './ThreadsBackground';

const livvic = Livvic({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '900'],
  style: ['normal', 'italic'],
  display: 'swap',
});

const quicksand = Quicksand({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
});

export const metadata = {
  title: '16pf',
  description: 'Test rapido de 16pf',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={livvic.className}>
        <ThreadsBackground />
        <div className="relative z-10 max-screen-90 flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          <footer className="footer">
            <a 
              href="https://github.com/clxzero" 
              target="_blank" 
              rel="noopener noreferrer"
              className="footer-link"
            >
              Por VitalyClarX
            </a>
          </footer>
        </div>
      </body>
    </html>
  )
}
