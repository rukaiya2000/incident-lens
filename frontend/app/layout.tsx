import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IncidentGraph",
  description: "Investigate multi-source footage with an evidence-backed context graph",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-zinc-50">
        <header className="border-b border-white/70 bg-white/65 shadow-sm backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/65">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-bold text-white shadow-lg shadow-blue-500/25">IG</span><span className="font-semibold tracking-tight">IncidentGraph</span></Link>
            <nav className="flex items-center gap-1 text-sm font-medium text-slate-600 dark:text-zinc-300"><Link href="/" className="rounded-full px-3 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm dark:hover:bg-zinc-900 dark:hover:text-white">Cases</Link><Link href="/reports" className="rounded-full px-3 py-2 transition hover:bg-white hover:text-slate-950 hover:shadow-sm dark:hover:bg-zinc-900 dark:hover:text-white">Report library</Link></nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}