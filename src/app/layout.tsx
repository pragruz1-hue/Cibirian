import type { Metadata, Viewport } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ShopUI from '@/components/ShopUI';
import { ShopProvider } from '@/store/ShopProvider';
import { site } from '@/lib/catalog';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://sibcirulnik.ru'),
  title: {
    default: 'Профессиональная косметика для волос купить с доставкой | Сибирский цирюльник',
    template: '%s | Сибирский цирюльник',
  },
  description:
    'Интернет-магазин профессиональной косметики для салонов красоты и мастеров. ' +
    'Средства для ухода за волосами, окрашивание, стайлинг, косметика для лица и тела. ' +
    'Доставка по Новосибирску и более чем в 20 городов России.',
  keywords: [
    'профессиональная косметика для волос',
    'купить косметику для салонов',
    'OLLIN',
    'TEFIA',
    'EXITO',
    'KAARAL',
    'KEBREN',
    'доставка Новосибирск',
  ],
  openGraph: {
    title: 'Профессиональная косметика для волос | Сибирский цирюльник',
    description: 'Каталог профессиональной косметики для волос, лица и тела. Доставка по России.',
    type: 'website',
    locale: 'ru_RU',
    siteName: site.name,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#146b5f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <ShopProvider>
          <Header />
          <main>{children}</main>
          <Footer />
          <ShopUI />
        </ShopProvider>
      </body>
    </html>
  );
}
