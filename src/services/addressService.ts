import { prisma } from '../config/database';

export interface AddressInput {
  label?: string;
  receiverName?: string;
  receiverPhone?: string;
  line1: string;
  landmark?: string;
  area?: string;
  city?: string;
  pincode?: string;
  lat: number;
  lng: number;
  isDefault?: boolean;
}

export async function listAddresses(userId: string) {
  return prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function findAddress(userId: string, id: string) {
  const a = await prisma.address.findUnique({ where: { id } });
  return a && a.userId === userId ? a : null;
}

export async function createAddress(userId: string, data: AddressInput) {
  const count = await prisma.address.count({ where: { userId } });
  const makeDefault = data.isDefault || count === 0; // first address is default
  if (makeDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  return prisma.address.create({
    data: {
      userId,
      label: data.label || 'Home',
      receiverName: data.receiverName || null,
      receiverPhone: data.receiverPhone || null,
      line1: data.line1,
      landmark: data.landmark || null,
      area: data.area || null,
      city: data.city || null,
      pincode: data.pincode || null,
      lat: data.lat,
      lng: data.lng,
      isDefault: makeDefault,
    },
  });
}

export async function updateAddress(userId: string, id: string, data: Partial<AddressInput>) {
  const existing = await findAddress(userId, id);
  if (!existing) return null;
  if (data.isDefault) {
    await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  }
  const patch: any = {};
  for (const k of ['label', 'receiverName', 'receiverPhone', 'line1', 'landmark', 'area', 'city', 'pincode', 'lat', 'lng', 'isDefault'] as const) {
    if (data[k] !== undefined) patch[k] = data[k];
  }
  return prisma.address.update({ where: { id }, data: patch });
}

export async function deleteAddress(userId: string, id: string) {
  const existing = await findAddress(userId, id);
  if (!existing) return null;
  await prisma.address.delete({ where: { id } });
  // If we removed the default, promote the most recent remaining address.
  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }
  return existing;
}

export async function setDefault(userId: string, id: string) {
  const existing = await findAddress(userId, id);
  if (!existing) return null;
  await prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
  return prisma.address.update({ where: { id }, data: { isDefault: true } });
}
