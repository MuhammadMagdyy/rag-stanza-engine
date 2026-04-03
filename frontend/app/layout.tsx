import "./globals.css";
import type { Metadata } from "next";


// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className="antialiased"
        suppressHydrationWarning={true} // <--- ADD THIS LINE
      >
        {children}
      </body>
    </html>
  );
}