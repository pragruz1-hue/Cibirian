'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { products, getProduct } from '@/lib/catalog';
import type { Product } from '@/lib/types';

const LS = {
  cart: 'sbc.cart.v1',
  fav: 'sbc.favorites.v1',
  city: 'sbc.city.v1',
  viewed: 'sbc.viewed.v1',
};

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'info';
}

interface ShopState {
  ready: boolean;
  cart: Record<number, number>;
  favorites: number[];
  viewed: number[];
  city: string;
  cartCount: number;
  cartTotal: number;
  cartLines: { product: Product; qty: number }[];
  favoriteProducts: Product[];
  viewedProducts: Product[];
  cartOpen: boolean;
  cityOpen: boolean;
  callbackOpen: boolean;
  authOpen: boolean;
  quickView: Product | null;
  toasts: Toast[];
  addToCart: (id: number, qty?: number) => void;
  setQty: (id: number, qty: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  inCart: (id: number) => boolean;
  setCity: (c: string) => void;
  markViewed: (id: number) => void;
  openCart: () => void;
  closeCart: () => void;
  setCityOpen: (v: boolean) => void;
  setCallbackOpen: (v: boolean) => void;
  setAuthOpen: (v: boolean) => void;
  setQuickView: (p: Product | null) => void;
  notify: (text: string, kind?: Toast['kind']) => void;
}

const Ctx = createContext<ShopState | null>(null);

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ShopProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<Record<number, number>>({});
  const [favorites, setFavorites] = useState<number[]>([]);
  const [viewed, setViewed] = useState<number[]>([]);
  const [city, setCityState] = useState('Новосибирск');
  const [cartOpen, setCartOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [quickView, setQuickView] = useState<Product | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  useEffect(() => {
    setCart(readJson<Record<number, number>>(LS.cart, {}));
    setFavorites(readJson<number[]>(LS.fav, []));
    setViewed(readJson<number[]>(LS.viewed, []));
    setCityState(readJson<string>(LS.city, 'Новосибирск'));
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(LS.cart, JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(LS.fav, JSON.stringify(favorites));
  }, [favorites, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(LS.viewed, JSON.stringify(viewed));
  }, [viewed, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(LS.city, JSON.stringify(city));
  }, [city, ready]);

  const notify = useCallback((text: string, kind: Toast['kind'] = 'ok') => {
    const id = ++toastId.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  }, []);

  const addToCart = useCallback(
    (id: number, qty = 1) => {
      setCart((c) => ({ ...c, [id]: Math.min(999, (c[id] ?? 0) + qty) }));
      const p = getProduct(id as unknown as string) ?? products.find((x) => x.id === id);
      notify(p ? `«${p.name.slice(0, 48)}${p.name.length > 48 ? '…' : ''}» — в корзине` : 'Товар добавлен в корзину');
      setCartOpen(true);
    },
    [notify],
  );

  const setQty = useCallback((id: number, qty: number) => {
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(999, qty);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }, []);

  const clearCart = useCallback(() => setCart({}), []);

  const toggleFavorite = useCallback(
    (id: number) => {
      setFavorites((f) => {
        const has = f.includes(id);
        notify(has ? 'Удалено из избранного' : 'Добавлено в избранное', 'info');
        return has ? f.filter((x) => x !== id) : [...f, id];
      });
    },
    [notify],
  );

  const setCity = useCallback((c: string) => {
    setCityState(c);
    setCityOpen(false);
  }, []);

  const markViewed = useCallback((id: number) => {
    setViewed((v) => [id, ...v.filter((x) => x !== id)].slice(0, 12));
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), []);

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => ({ product: byId.get(Number(id))!, qty }))
        .filter((l) => Boolean(l.product)),
    [cart, byId],
  );

  const value: ShopState = {
    ready,
    cart,
    favorites,
    viewed,
    city,
    cartCount: cartLines.reduce((s, l) => s + l.qty, 0),
    cartTotal: cartLines.reduce((s, l) => s + l.qty * l.product.price, 0),
    cartLines,
    favoriteProducts: favorites.map((id) => byId.get(id)!).filter(Boolean),
    viewedProducts: viewed.map((id) => byId.get(id)!).filter(Boolean),
    cartOpen,
    cityOpen,
    callbackOpen,
    authOpen,
    quickView,
    toasts,
    addToCart,
    setQty,
    removeFromCart,
    clearCart,
    toggleFavorite,
    isFavorite: (id) => favorites.includes(id),
    inCart: (id) => Boolean(cart[id]),
    setCity,
    markViewed,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    setCityOpen,
    setCallbackOpen,
    setAuthOpen,
    setQuickView,
    notify,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShop(): ShopState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useShop must be used inside ShopProvider');
  return ctx;
}
