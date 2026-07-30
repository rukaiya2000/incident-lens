import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Incident Lens",
  description: "Investigate multi-source footage with an evidence-backed context graph",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="18" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <circle cx="12" cy="18" r="2.5" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M8.2 7.3L10.5 16M15.8 7.3L13.5 16M8.5 6H15.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              Incident Lens
            </Link>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </body>
    </html>
  );
}
