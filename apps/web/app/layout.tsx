import type { Metadata } from "next";
import "./globals.css";
import "./premium.css";
import "./editorial.css";
import { LocaleProvider } from "./locale";

export const metadata: Metadata = { title: "DPsoft — Business, connected.", description: "Connect business data, define agent access and retain the evidence behind your answers." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><LocaleProvider>{children}</LocaleProvider></body></html>;
}
