import { sleep } from '@/lib/utils';
import type { Cart } from '@/models/cart.model';

const NETWORK_DELAY = 800;
export type CartRequestFixture = 'ack' | 'reject';
export type CartRequestGateEvent =
  'server-gate-released' | 'request-started' | 'server-gate-completed';
export type CartRequestGate = {
  holdRequestStart: () => Promise<void>;
  release: () => void;
  run: <T>(request: () => T | Promise<T>) => Promise<T>;
};
export type DeterministicCartRequest = {
  itemId: string;
  quantity: number;
  fixture: CartRequestFixture;
  gate: CartRequestGate;
};

export function createCartRequestGate(
  onEvent: (event: CartRequestGateEvent) => void,
): CartRequestGate {
  let resolveRelease!: () => void;
  let released = false;
  const releasePromise = new Promise<void>((resolve) => {
    resolveRelease = resolve;
  });

  return {
    holdRequestStart: () => releasePromise,
    release: () => {
      if (released) return;
      released = true;
      onEvent('server-gate-released');
      resolveRelease();
    },
    run: async <T>(request: () => T | Promise<T>) => {
      onEvent('request-started');
      await releasePromise;
      onEvent('server-gate-completed');
      return request();
    },
  };
}

function createCart(): Cart {
  return {
    items: [
      {
        id: '1',
        name: 'Wireless Headphones',
        price: 79.99,
        quantity: 1,
        imageUrl: 'https://picsum.photos/seed/headphones/100/100',
      },
      {
        id: '2',
        name: 'USB-C Cable',
        price: 12.99,
        quantity: 2,
        imageUrl: 'https://picsum.photos/seed/cable/100/100',
      },
      {
        id: '3',
        name: 'Phone Case',
        price: 24.99,
        quantity: 1,
        imageUrl: 'https://picsum.photos/seed/case/100/100',
      },
    ],
    total: 130.96,
    lastModified: new Date().toISOString(),
  };
}

export async function fetchCart(): Promise<Cart> {
  await sleep(NETWORK_DELAY);

  return createCart();
}

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  await sleep(500);

  return createUpdatedCart(itemId, quantity);
}

export async function runCartFixture({
  itemId,
  quantity,
  fixture,
  gate,
}: DeterministicCartRequest): Promise<Cart> {
  return gate.run(() => {
    if (fixture === 'reject') {
      throw new Error('Deterministic cart request failure');
    }

    return createUpdatedCart(itemId, quantity);
  });
}

function createUpdatedCart(itemId: string, quantity: number): Cart {
  const cart = createCart();
  const item = cart.items.find((i) => i.id === itemId);

  if (item) {
    item.quantity = quantity;
    cart.total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  cart.lastModified = new Date().toISOString();
  return cart;
}
