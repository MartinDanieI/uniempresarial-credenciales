import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  weight: ['400', '500', '600', '800', '900'],
});

const poppins = Poppins({
  variable: '--font-poppins-var',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Credenciales Uniempresarial',
  description:
    'Portal de autogestión de credenciales institucionales de la Fundación Universitaria Empresarial de la Cámara de Comercio de Bogotá.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: '#0132af',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-CO" className={`${inter.variable} ${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
