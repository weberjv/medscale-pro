import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedScale Pro • Emergência Adulta - HGD",
  description: "Plataforma de Gestão de Escala Médica, Corpo Clínico e Folha PJ",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%232563eb'/><path d='M42 22h16v20h20v16H58v20H42V58H22V42h20V22z' fill='white'/></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}