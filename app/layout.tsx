import type { Metadata } from "next";
import { Inter, Libre_Baskerville, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ChatWidgetLoader } from "@/components/chatbot/chat-widget-loader";
export const dynamic = "force-dynamic";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LexDJ — Archive du droit et de la législation de Djibouti",
  description:
    "Archive numérique non officielle du droit et de la législation de Djibouti : lois, décrets, arrêtés et autres textes du Journal Officiel, recherchables et exportables en PDF.",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${libreBaskerville.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        {children}
        <ChatWidgetLoader />
      </body>
    </html>
  );
}
