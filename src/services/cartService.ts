import { prisma } from '../config/database';
import * as couponService from './couponService';

// ── Geo ──────────────────────────────────────────────────────────────────────
const rad = (d: number) => (d * Math.PI) / 180;
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Thrown when adding an item from a kitchen different from the cart's. */
export class CartKitchenConflict extends Error {
  code = 'CART_KITCHEN_CONFLICT';
  constructor(
    public currentCookId: string,
    public currentKitchenName: string,
    public newKitchenName: string,
  ) {
    super(`Your cart already has items from "${currentKitchenName}".`);
  }
}

export class CartError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function getOrCreateCart(userId: string) {
  const existing = await prisma.cart.findUnique({ where: { userId } });
  return existing ?? prisma.cart.create({ data: { userId } });
}

async function getConfig() {
  const c = await prisma.platformConfig.findUnique({ where: { id: 'default' } });
  return {
    customerDeliveryFee: c?.customerDeliveryFee ?? 25,
    platformFee: c?.platformFee ?? 10,
    deliveryRadiusKm: c?.deliveryRadiusKm ?? 10,
    pickupRadiusKm: c?.pickupRadiusKm ?? 25,
  };
}

// ── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Add a menu item. If the cart already belongs to another kitchen, throws
 * CartKitchenConflict unless `force` is set (then the cart is cleared first).
 */
export async function addItem(userId: string, menuItemId: string, qty = 1, force = false) {
  if (qty <= 0) qty = 1;
  const menuItem = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!menuItem) throw new CartError(404, 'This dish is no longer available.');
  if (!menuItem.isAvailable) throw new CartError(400, `"${menuItem.name}" is currently unavailable.`);

  let cart = await getOrCreateCart(userId);

  if (cart.cookId && cart.cookId !== menuItem.cookId) {
    if (!force) {
      const current = await prisma.cook.findUnique({ where: { id: cart.cookId } });
      const next = await prisma.cook.findUnique({ where: { id: menuItem.cookId } });
      throw new CartKitchenConflict(
        cart.cookId,
        current?.kitchenName || current?.name || 'another kitchen',
        next?.kitchenName || next?.name || 'this kitchen',
      );
    }
    // Forced switch → wipe the old cart first.
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    cart = await prisma.cart.update({
      where: { id: cart.id },
      data: { cookId: null, couponCode: null },
    });
  }

  if (!cart.cookId) {
    cart = await prisma.cart.update({ where: { id: cart.id }, data: { cookId: menuItem.cookId } });
  }

  const existingLine = await prisma.cartItem.findUnique({
    where: { cartId_menuItemId: { cartId: cart.id, menuItemId } },
  });
  if (existingLine) {
    await prisma.cartItem.update({ where: { id: existingLine.id }, data: { qty: existingLine.qty + qty } });
  } else {
    await prisma.cartItem.create({ data: { cartId: cart.id, menuItemId, qty } });
  }
  return cart;
}

export async function incrementItem(userId: string, menuItemId: string) {
  const cart = await getOrCreateCart(userId);
  const line = await prisma.cartItem.findUnique({
    where: { cartId_menuItemId: { cartId: cart.id, menuItemId } },
  });
  if (!line) {
    // Nothing to increment → behave like a fresh add (qty 1) of this item.
    return addItem(userId, menuItemId, 1);
  }
  await prisma.cartItem.update({ where: { id: line.id }, data: { qty: line.qty + 1 } });
  return cart;
}

export async function decrementItem(userId: string, menuItemId: string) {
  const cart = await getOrCreateCart(userId);
  const line = await prisma.cartItem.findUnique({
    where: { cartId_menuItemId: { cartId: cart.id, menuItemId } },
  });
  if (!line) return cart;
  if (line.qty <= 1) {
    await prisma.cartItem.delete({ where: { id: line.id } });
  } else {
    await prisma.cartItem.update({ where: { id: line.id }, data: { qty: line.qty - 1 } });
  }
  return resetIfEmpty(cart.id);
}

export async function removeItem(userId: string, menuItemId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id, menuItemId } });
  return resetIfEmpty(cart.id);
}

export async function clearCart(userId: string) {
  const cart = await getOrCreateCart(userId);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  return prisma.cart.update({ where: { id: cart.id }, data: { cookId: null, couponCode: null } });
}

/** When the last line is removed, unlock the kitchen + drop the coupon. */
async function resetIfEmpty(cartId: string) {
  const count = await prisma.cartItem.count({ where: { cartId } });
  if (count === 0) {
    return prisma.cart.update({ where: { id: cartId }, data: { cookId: null, couponCode: null } });
  }
  return prisma.cart.findUnique({ where: { id: cartId } });
}

export async function applyCoupon(userId: string, code: string) {
  const cart = await getOrCreateCart(userId);
  const coupon = await couponService.findCouponByCode(code);
  const invalid = validateCoupon(coupon);
  if (invalid) throw new CartError(400, invalid);
  return prisma.cart.update({ where: { id: cart.id }, data: { couponCode: coupon!.code } });
}

export async function removeCoupon(userId: string) {
  const cart = await getOrCreateCart(userId);
  return prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
}

/** Returns an error string if the coupon can't be used, else null. */
function validateCoupon(coupon: any): string | null {
  if (!coupon) return 'Invalid coupon code.';
  if (coupon.status !== 'active') return 'This coupon is not active.';
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < Date.now()) return 'This coupon has expired.';
  if (coupon.cap != null && coupon.redemptions >= coupon.cap) return 'This coupon has reached its limit.';
  return null;
}

function couponDiscount(coupon: any, itemTotal: number): { discount: number; freeDelivery: boolean } {
  switch (coupon.type) {
    case 'flat':
      return { discount: Math.min(coupon.value, itemTotal), freeDelivery: false };
    case 'percent':
      return { discount: Math.round((itemTotal * coupon.value) / 100), freeDelivery: false };
    case 'free_delivery':
      return { discount: 0, freeDelivery: true };
    default:
      return { discount: 0, freeDelivery: false };
  }
}

// ── Read + bill ────────────────────────────────────────────────────────────────

/**
 * Full cart + server-computed bill. lat/lng + fulfillment drive the delivery
 * fee and the serviceable-radius check. The client NEVER sends prices.
 */
export async function getCartWithBill(
  userId: string,
  opts: { lat?: number; lng?: number; fulfillment?: 'delivery' | 'pickup' },
) {
  const fulfillment = opts.fulfillment === 'pickup' ? 'pickup' : 'delivery';
  const config = await getConfig();
  const cart = await getOrCreateCart(userId);
  const lines = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'asc' },
  });

  if (lines.length === 0) {
    return emptyCart(cart.id, fulfillment, config.deliveryRadiusKm);
  }

  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: lines.map((l) => l.menuItemId) } },
  });
  const byId = new Map(menuItems.map((m) => [m.id, m]));

  const items = lines.map((l) => {
    const m = byId.get(l.menuItemId);
    const available = !!m && m.isAvailable;
    const price = m?.price ?? 0;
    return {
      menuItemId: l.menuItemId,
      name: m?.name ?? 'Unavailable item',
      price,
      qty: l.qty,
      imageUrl: m?.imageUrl ?? null,
      isAvailable: available,
      lineTotal: available ? price * l.qty : 0,
    };
  });

  const itemTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
  const itemCount = items.reduce((sum, i) => sum + (i.isAvailable ? i.qty : 0), 0);

  // Kitchen + distance / serviceability
  const cook = cart.cookId ? await prisma.cook.findUnique({ where: { id: cart.cookId } }) : null;
  let dist: number | null = null;
  if (opts.lat != null && opts.lng != null && cook?.lat != null && cook?.lng != null) {
    dist = Math.round(distanceKm(opts.lat, opts.lng, cook.lat, cook.lng) * 10) / 10;
  }
  // Per-kitchen delivery radius overrides the admin default; pickup radius is global.
  const radiusKm = cook?.serviceRadiusKm ?? config.deliveryRadiusKm;
  let serviceable = true;
  if (fulfillment === 'delivery') {
    serviceable = dist != null ? dist <= radiusKm : false; // delivery needs coords
  } else {
    serviceable = dist != null ? dist <= config.pickupRadiusKm : true; // pickup lenient
  }

  // Coupon
  let discount = 0;
  let freeDelivery = false;
  let couponValid = false;
  let couponError: string | null = null;
  if (cart.couponCode) {
    const coupon = await couponService.findCouponByCode(cart.couponCode);
    const invalid = validateCoupon(coupon);
    if (invalid) {
      couponError = invalid;
    } else {
      couponValid = true;
      const r = couponDiscount(coupon, itemTotal);
      discount = r.discount;
      freeDelivery = r.freeDelivery;
    }
  }

  // Fees
  let deliveryFee = fulfillment === 'pickup' ? 0 : config.customerDeliveryFee;
  if (freeDelivery) deliveryFee = 0;
  const taxesCharges = config.platformFee;
  const grandTotal = Math.max(0, itemTotal - discount + deliveryFee + taxesCharges);

  return {
    cartId: cart.id,
    fulfillment,
    kitchen: cook
      ? {
          id: cook.id,
          name: cook.kitchenName || cook.name,
          tier: cook.tier,
          etaMins: 28,
        }
      : null,
    distanceKm: dist,
    serviceRadiusKm: radiusKm,
    serviceable,
    items,
    itemCount,
    bill: {
      itemTotal,
      discount,
      couponCode: cart.couponCode,
      couponValid,
      deliveryFee,
      taxesCharges,
      grandTotal,
    },
    couponError,
  };
}

function emptyCart(cartId: string, fulfillment: 'delivery' | 'pickup', radiusKm: number) {
  return {
    cartId,
    fulfillment,
    kitchen: null,
    distanceKm: null,
    serviceRadiusKm: radiusKm,
    serviceable: true,
    items: [],
    itemCount: 0,
    bill: {
      itemTotal: 0,
      discount: 0,
      couponCode: null,
      couponValid: false,
      deliveryFee: 0,
      taxesCharges: 0,
      grandTotal: 0,
    },
    couponError: null,
  };
}
