import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { MainHeader } from "@/components/header/main-header";
import { MainFooter } from "@/components/footer/main-footer";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Seven Peaks Gear",
  description: "Premium outdoor and adventure gear for enthusiasts",
  icons: {
    icon: "/mountain-logo.svg",
    apple: "/mountain-logo.svg",
  },
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
