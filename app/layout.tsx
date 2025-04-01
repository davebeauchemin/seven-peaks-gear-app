import DeployButton from "@/components/nextjs/deploy-button";
import { EnvVarWarning } from "@/components/nextjs/env-var-warning";
import HeaderAuth from "@/components/nextjs/header-auth";
import { ThemeSwitcher } from "@/components/nextjs/theme-switcher";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Link from "next/link";
import "./globals.css";
import { MainHeader } from "@/components/header/main-header";
import { MainFooter } from "@/components/footer/main-footer";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Next.js and Supabase Starter Kit",
  description: "The fastest way to build apps with Next.js and Supabase",
};

const geistSans = Geist({
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geistSans.className} suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <MainHeader />
          {children}
          <MainFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
