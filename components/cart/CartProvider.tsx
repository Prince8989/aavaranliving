"use client";

import { createContext, useCallback, useContext, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CartView } from "@/lib/cart";
import {
  addToCartAction,
  removeCartItemAction,
  setCurrencyAction,
  setShipCountryAction,
  updateCartItemAction,
} from "@/app/actions/cart";
import { track } from "@/lib/analytics";

type Ctx = {
  cart: CartView;
  pending: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  drawerRef: React.RefObject<HTMLDialogElement | null>;
  add: (variantId: string, quantity?: number, opts?: { openDrawer?: boolean }) => Promise<boolean>;
  update: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  setCurrency: (c: string) => Promise<void>;
  setShipCountry: (c: string) => Promise<void>;
};

const CartContext = createContext<Ctx | null>(null);

export function CartProvider({ initial, children }: { initial: CartView; children: ReactNode }) {
  const [cart, setCart] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();

  const run = useCallback(
    (fn: () => Promise<{ ok: boolean; error?: string; cart?: CartView }>, after?: (ok: boolean) => void) =>
      new Promise<boolean>((resolve) => {
        startTransition(async () => {
          const res = await fn();
          if (res.cart) setCart(res.cart);
          setError(res.ok ? null : (res.error ?? "Something went wrong."));
          after?.(res.ok);
          resolve(res.ok);
        });
      }),
    []
  );

  const open = useCallback(() => {
    const d = drawerRef.current;
    if (d && !d.open) d.showModal();
  }, []);
  const close = useCallback(() => drawerRef.current?.close(), []);

  const value: Ctx = {
    cart,
    pending,
    error,
    open,
    close,
    drawerRef,
    add: (variantId, quantity = 1, opts = { openDrawer: true }) =>
      run(
        () => addToCartAction({ variantId, quantity }),
        (ok) => {
          if (ok) {
            track("add_to_cart", { item_id: variantId, currency: cart.currency });
            if (opts.openDrawer) open();
          }
        }
      ),
    update: async (itemId, quantity) => {
      await run(() => updateCartItemAction({ itemId, quantity }));
    },
    remove: async (itemId) => {
      await run(() => removeCartItemAction(itemId));
    },
    setCurrency: async (c) => {
      await run(() => setCurrencyAction(c), () => router.refresh());
    },
    setShipCountry: async (c) => {
      await run(() => setShipCountryAction(c));
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
