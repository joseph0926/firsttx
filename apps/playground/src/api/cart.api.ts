import { sleep } from '@/lib/utils';
import type { Cart } from '@/models/cart.model';

const NETWORK_DELAY = 800;

export async function fetchCart(): Promise<Cart> {
  await sleep(NETWORK_DELAY);

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

export async function updateCartItem(itemId: string, quantity: number): Promise<Cart> {
  await sleep(500);

  const cart = await fetchCart();
  const item = cart.items.find((i) => i.id === itemId);

  if (item) {
    item.quantity = quantity;
    cart.total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  cart.lastModified = new Date().toISOString();
  return cart;
}
