'use client';

import CartDrawer from './CartDrawer';
import ChatWidget from './ChatWidget';
import { CityModal, CallbackModal, AuthModal, QuickViewModal } from './Modals';
import MobileBar from './MobileBar';
import { useShop } from '@/store/ShopProvider';

function Toasts() {
  const { toasts } = useShop();
  if (!toasts.length) return null;
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>{t.text}</div>
      ))}
    </div>
  );
}

/** Все глобальные оверлеи и плавающие элементы магазина. */
export default function ShopUI() {
  return (
    <>
      <CartDrawer />
      <QuickViewModal />
      <CityModal />
      <CallbackModal />
      <AuthModal />
      <ChatWidget />
      <MobileBar />
      <Toasts />
    </>
  );
}
