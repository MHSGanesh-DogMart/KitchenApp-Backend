import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import * as cartService from './cartService';
import * as addressService from './addressService';

// Razorpay keys — read from env, fall back to the provided test keys.
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_SLqY0q39pGu6sx';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'EB02d4wenp5Lgdl0vhh3U1Ni';

export const KEY_ID = RAZORPAY_KEY_ID; // safe to expose to the app

export class OrderError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Create a Razorpay order (amount in paise). Uses global fetch (Node 18+). */
async function createRazorpayOrder(amountInr: number, receipt: string) {
  const auth = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt,
      payment_capture: 1,
    }),
  });
  const data: any = await res.json();
  if (!res.ok) {
    throw new OrderError(502, data?.error?.description || 'Could not start payment');
  }
  return data; // { id, amount, currency, ... }
}

/** Verify the Razorpay signature returned by checkout. */
function verifySignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return expected === signature;
}

function genCode(): string {
  return String(crypto.randomInt(1000, 10000)); // 4-digit handoff code
}

/**
 * Step 1 — validate the cart, create a PENDING_PAYMENT order snapshot, and
 * open a Razorpay order. Returns the order + the payment params for the app.
 */
export async function checkout(
  userId: string,
  opts: { fulfillment: 'delivery' | 'pickup'; addressId?: string; note?: string; lat?: number; lng?: number },
) {
  const fulfillment = opts.fulfillment === 'pickup' ? 'pickup' : 'delivery';

  // Resolve the delivery location: explicit address > passed lat/lng.
  let address = null as Awaited<ReturnType<typeof addressService.findAddress>> | null;
  let lat = opts.lat;
  let lng = opts.lng;
  if (fulfillment === 'delivery') {
    if (opts.addressId) {
      address = await addressService.findAddress(userId, opts.addressId);
      if (!address) throw new OrderError(400, 'Selected address not found');
      lat = address.lat;
      lng = address.lng;
    }
    if (lat == null || lng == null) {
      throw new OrderError(400, 'A delivery address is required');
    }
  }

  const cart = await cartService.getCartWithBill(userId, { lat, lng, fulfillment });
  if (cart.items.length === 0) throw new OrderError(400, 'Your cart is empty');
  if (cart.items.some((i: any) => !i.isAvailable)) {
    throw new OrderError(400, 'Some items are no longer available. Please review your cart.');
  }
  // Hard-block delivery outside the kitchen's radius (pickup is unrestricted).
  if (fulfillment === 'delivery' && !cart.serviceable) {
    throw new OrderError(400, cart.serviceMessage || 'This kitchen does not deliver to your location.');
  }
  if (!cart.kitchen) throw new OrderError(400, 'Cart kitchen missing');

  // Kitchen must be open/accepting orders.
  const cook = await prisma.cook.findUnique({ where: { id: cart.kitchen.id } });
  if (cook && cook.acceptingOrders === false) {
    throw new OrderError(400, `${cook.kitchenName || cook.name} is not accepting orders right now.`);
  }

  const bill = cart.bill;
  const order = await prisma.order.create({
    data: {
      userId,
      cookId: cart.kitchen.id,
      kitchenName: cart.kitchen.name,
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      fulfillment,
      addressLabel: address?.label ?? null,
      addressLine1: address?.line1 ?? null,
      addressArea: address?.area ?? null,
      addressCity: address?.city ?? null,
      addressPincode: address?.pincode ?? null,
      receiverName: address?.receiverName ?? null,
      receiverPhone: address?.receiverPhone ?? null,
      lat: lat ?? null,
      lng: lng ?? null,
      distanceKm: cart.distanceKm ?? null,
      itemTotal: bill.itemTotal,
      discount: bill.discount,
      couponCode: bill.couponCode ?? null,
      deliveryFee: bill.deliveryFee,
      taxesCharges: bill.taxesCharges,
      grandTotal: bill.grandTotal,
      cookingNote: opts.note ?? null,
      items: {
        create: cart.items.map((i: any) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          lineTotal: i.lineTotal,
          imageUrl: i.imageUrl ?? null,
        })),
      },
    },
  });

  const rzp = await createRazorpayOrder(bill.grandTotal, order.id);
  await prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rzp.id } });

  return {
    orderId: order.id,
    payment: {
      keyId: RAZORPAY_KEY_ID,
      razorpayOrderId: rzp.id,
      amount: rzp.amount, // paise
      currency: rzp.currency,
    },
  };
}

/**
 * Step 2 — verify the payment. On success: confirm the order, redeem the
 * coupon, clear the cart, issue a handoff code. On failure: mark it FAILED.
 */
export async function verifyPayment(
  userId: string,
  data: { orderId: string; razorpayPaymentId: string; razorpayOrderId: string; razorpaySignature: string },
) {
  const order = await prisma.order.findUnique({ where: { id: data.orderId } });
  if (!order || order.userId !== userId) throw new OrderError(404, 'Order not found');
  if (order.status !== 'PENDING_PAYMENT') return order; // already processed (idempotent)

  const ok = verifySignature(data.razorpayOrderId, data.razorpayPaymentId, data.razorpaySignature);
  if (!ok) {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAYMENT_FAILED', paymentStatus: 'FAILED' },
    });
    throw new OrderError(400, 'Payment verification failed');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PLACED',
        paymentStatus: 'PAID',
        razorpayPaymentId: data.razorpayPaymentId,
        handoffCode: genCode(),
      },
      include: { items: true },
    });
    if (order.couponCode) {
      await tx.coupon.updateMany({
        where: { code: order.couponCode },
        data: { redemptions: { increment: 1 } },
      });
    }
    // Clear the cart (items + lock).
    const cart = await tx.cart.findUnique({ where: { userId } });
    if (cart) {
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      await tx.cart.update({ where: { id: cart.id }, data: { cookId: null, couponCode: null } });
    }
    return o;
  });

  return updated;
}

export async function listOrders(userId: string) {
  return prisma.order.findMany({
    where: { userId, status: { not: 'PENDING_PAYMENT' } },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
}

export async function getOrder(userId: string, id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  return order && order.userId === userId ? order : null;
}

// ── Status flow ─────────────────────────────────────────────────────────────
const FLOW = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED'];
const CANCELLABLE_BY_CUSTOMER = ['PLACED', 'ACCEPTED'];

/** Customer cancels their own order (only before the kitchen starts cooking). */
export async function cancelOrder(userId: string, id: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.userId !== userId) throw new OrderError(404, 'Order not found');
  if (order.status === 'CANCELLED') return order;
  if (!CANCELLABLE_BY_CUSTOMER.includes(order.status)) {
    throw new OrderError(400, 'This order can no longer be cancelled.');
  }
  return prisma.$transaction(async (tx) => {
    const o = await tx.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    });
    // Release the coupon redemption back.
    if (order.couponCode) {
      await tx.coupon.updateMany({
        where: { code: order.couponCode, redemptions: { gt: 0 } },
        data: { redemptions: { decrement: 1 } },
      });
    }
    return o;
  });
}

// ── Kitchen side (cook = token user id) ──────────────────────────────────────

export async function listKitchenOrders(cookId: string, status?: string) {
  return prisma.order.findMany({
    where: {
      cookId,
      status: status ? status : { notIn: ['PENDING_PAYMENT', 'PAYMENT_FAILED'] },
    },
    orderBy: { createdAt: 'desc' },
    include: { items: true },
  });
}

/** Dashboard summary for the kitchen: today's earnings + a 7-day sparkline. */
export async function getKitchenSummary(cookId: string) {
  const delivered = await prisma.order.findMany({
    where: { cookId, status: 'DELIVERED' },
    select: { grandTotal: true, createdAt: true },
  });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekly = [0, 0, 0, 0, 0, 0, 0]; // index 6 = today, 0 = 6 days ago
  let todayEarned = 0;
  let todayOrders = 0;
  for (const o of delivered) {
    const d = new Date(o.createdAt);
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.floor((startOfToday.getTime() - dayStart.getTime()) / 86400000);
    if (diff === 0) {
      todayEarned += o.grandTotal;
      todayOrders++;
    }
    if (diff >= 0 && diff < 7) weekly[6 - diff] += o.grandTotal;
  }
  return {
    todayEarned: Math.round(todayEarned),
    todayOrders,
    avgOrder: todayOrders > 0 ? Math.round(todayEarned / todayOrders) : 0,
    weekly: weekly.map((n) => Math.round(n)),
    totalDelivered: delivered.length,
    todayIdx: 6,
  };
}

export async function getKitchenOrder(cookId: string, id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  return order && order.cookId === cookId ? order : null;
}

export async function acceptOrder(cookId: string, id: string) {
  const order = await getKitchenOrder(cookId, id);
  if (!order) throw new OrderError(404, 'Order not found');
  if (order.status !== 'PLACED') throw new OrderError(400, 'Only newly placed orders can be accepted.');
  return prisma.order.update({ where: { id }, data: { status: 'ACCEPTED' }, include: { items: true } });
}

export async function rejectOrder(cookId: string, id: string) {
  const order = await getKitchenOrder(cookId, id);
  if (!order) throw new OrderError(404, 'Order not found');
  if (!['PLACED', 'ACCEPTED'].includes(order.status)) {
    throw new OrderError(400, 'This order can no longer be rejected.');
  }
  return prisma.$transaction(async (tx) => {
    const o = await tx.order.update({ where: { id }, data: { status: 'CANCELLED' }, include: { items: true } });
    if (order.couponCode) {
      await tx.coupon.updateMany({
        where: { code: order.couponCode, redemptions: { gt: 0 } },
        data: { redemptions: { decrement: 1 } },
      });
    }
    return o;
  });
}

/** Move an order forward: PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED. */
export async function updateKitchenStatus(cookId: string, id: string, target: string) {
  const order = await getKitchenOrder(cookId, id);
  if (!order) throw new OrderError(404, 'Order not found');
  const from = FLOW.indexOf(order.status);
  const to = FLOW.indexOf(target);
  if (from < 0) throw new OrderError(400, `Cannot update a ${order.status.toLowerCase()} order.`);
  if (to < 0) throw new OrderError(400, 'Invalid status.');
  if (to <= from) throw new OrderError(400, 'Order status can only move forward.');
  return prisma.order.update({ where: { id }, data: { status: target }, include: { items: true } });
}

// ─── Admin: cross-kitchen order ledger ───────────────────────────────────────

/**
 * All orders across every kitchen for the admin Orders page.
 * Server-side status filter + search (order id / kitchen / customer) + pagination.
 */
export async function listAllOrders(opts: { status?: string; search?: string; page?: number; limit?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const search = (opts.search ?? '').trim();
  const status = (opts.status ?? '').trim();

  const and: Prisma.OrderWhereInput[] = [];
  if (status) and.push({ status });
  if (search) {
    and.push({
      OR: [
        { id: { contains: search, mode: 'insensitive' } },
        { kitchenName: { contains: search, mode: 'insensitive' } },
        { receiverName: { contains: search, mode: 'insensitive' } },
        { receiverPhone: { contains: search } },
      ],
    });
  }
  const where: Prisma.OrderWhereInput = and.length ? { AND: and } : {};

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: true },
    }),
    prisma.order.count({ where }),
  ]);

  // Resolve account-holder names for display (order stores only receiver snapshot).
  const userIds = [...new Set(orders.map((o) => o.userId))];
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const data = orders.map((o) => ({
    id: o.id,
    customer: o.receiverName || userMap.get(o.userId)?.name || 'Customer',
    phone: o.receiverPhone || userMap.get(o.userId)?.phone || null,
    kitchen: o.kitchenName || '—',
    items: o.items.reduce((s, it) => s + it.qty, 0),
    total: o.grandTotal,
    payment: o.paymentStatus,
    fulfillment: o.fulfillment,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return { data, total, page, limit };
}

/** Summary tiles for the admin Orders page. */
export async function adminOrderStats() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [revenueAgg, live, refunds] = await Promise.all([
    prisma.order.aggregate({
      _sum: { grandTotal: true },
      where: { status: { notIn: ['CANCELLED', 'PAYMENT_FAILED', 'REFUNDED', 'PENDING_PAYMENT'] } },
    }),
    prisma.order.count({
      where: { status: { in: ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'] } },
    }),
    prisma.order.count({ where: { status: 'REFUNDED', updatedAt: { gte: dayAgo } } }),
  ]);
  return { revenue: revenueAgg._sum.grandTotal ?? 0, live, refunds };
}
