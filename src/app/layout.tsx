import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Konex Solutions | AI Training",
  description: "Architected by Bern-Waddly Louis Jean",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        {children}

        {/* SIGNATURE ARCHITECTE - MODE NÉON HOLOGRAPHIQUE */}
        <div className="fixed bottom-6 right-6 z-[9999] pointer-events-none select-none group">
          <div className="flex flex-col items-end opacity-40 group-hover:opacity-100 transition-all duration-700">
            <div className="flex items-center gap-2">
              <div className="h-[1px] w-8 bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500 drop-shadow-[0_0_5px_#22c55e]">
                Lead Architect
              </span>
            </div>
            <span className="text-sm font-mono tracking-tighter text-white mt-1 uppercase">
              Bern-Waddly Louis Jean
            </span>
            <span className="text-[8px] text-green-500/50 font-mono">SYS_AUTH: VERIFIED_DEV</span>
          </div>
        </div>
      </body>
    </html>
  );
}