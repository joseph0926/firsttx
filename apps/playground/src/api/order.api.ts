import { sleep } from '@/lib/utils';
import type { Order } from '@/models/order.model';

let forceFailAt: number | null = null;

export function setForceFailStep(step: number | null) {
  forceFailAt = step;
}

export async function validateInventory(): Promise<void> {
  await sleep(200);
  console.log('[API] validateInventory called, forceFailAt:', forceFailAt);

  if (forceFailAt === 1) {
    throw new Error('Inventory validation failed');
  }

  if (Math.random() < 0.05) {
    throw new Error('Inventory validation failed');
  }
}

export async function reserveItems(): Promise<void> {
  await sleep(150);

  if (forceFailAt === 2) {
    throw new Error('Reservation failed');
  }

  if (Math.random() < 0.05) {
    throw new Error('Reservation failed');
  }
}

export async function processPayment(): Promise<string> {
  await sleep(250);

  if (forceFailAt === 3) {
    throw new Error('Payment processing failed');
  }

  if (Math.random() < 0.05) {
    throw new Error('Payment processing failed');
  }

  return `charge_${Date.now()}`;
}

export async function refundPayment(chargeId: string): Promise<void> {
  await sleep(100);
  console.log(`[API] Refund payment: ${chargeId}`);
}

export async function scheduleShipping(): Promise<string> {
  await sleep(200);
  console.log('[API] scheduleShipping called, forceFailAt:', forceFailAt);

  if (forceFailAt === 4) {
    throw new Error('Shipping schedule failed');
  }

  if (Math.random() < 0.05) {
    throw new Error('Shipping schedule failed');
  }

  return `shipment_${Date.now()}`;
}

export async function cancelShipment(shipmentId: string): Promise<void> {
  await sleep(100);
  console.log(`[API] Cancel shipment: ${shipmentId}`);
}

export async function sendNotification(): Promise<void> {
  await sleep(100);

  if (forceFailAt === 5) {
    throw new Error('Notification failed');
  }

  if (Math.random() < 0.05) {
    throw new Error('Notification failed');
  }
}

export async function fetchOrder(): Promise<Order> {
  await sleep(800);

  return {
    items: [
      { id: 'item-1', name: 'Laptop Pro', quantity: 1, price: 1299 },
      { id: 'item-2', name: 'Wireless Mouse', quantity: 2, price: 29.99 },
    ],
    total: 1358.98,
    discount: 0,
    shipping: 'standard',
    status: 'pending',
    lastModified: new Date().toISOString(),
  };
}
