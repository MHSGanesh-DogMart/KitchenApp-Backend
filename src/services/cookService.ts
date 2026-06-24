import { PrismaClient, Cook as PrismaCook } from '@prisma/client';
import { prisma } from '../config/database';

export type Cook = PrismaCook;

export function parseCook(cook: any): any {
  if (!cook) return null;
  const parsed = { ...cook };
  if (parsed.meals && typeof parsed.meals === 'string') {
    try {
      parsed.meals = JSON.parse(parsed.meals);
    } catch {}
  }
  if (parsed.weeklyOff && typeof parsed.weeklyOff === 'string') {
    try {
      parsed.weeklyOff = JSON.parse(parsed.weeklyOff);
    } catch {
      parsed.weeklyOff = parsed.weeklyOff.split(',').map((s: string) => s.trim());
    }
  }
  return parsed;
}

/** Find a cook by its UUID */
export async function findCookById(id: string): Promise<any> {
  const cook = await prisma.cook.findUnique({ where: { id } });
  return parseCook(cook);
}

/** Find a cook by phone number (digits only) */
export async function findCookByPhone(phone: string): Promise<any> {
  const normalize = (p: string) => p.replace(/\D/g, '');
  const cleaned = normalize(phone);
  const cooks = await prisma.cook.findMany();
  const cook = cooks.find(c => normalize(c.phone) === cleaned) || null;
  return parseCook(cook);
}

/** Return all cooks */
export async function listAllCooks(): Promise<any[]> {
  const cooks = await prisma.cook.findMany();
  return cooks.map(parseCook);
}

/** Create a new cook or update existing */
export async function upsertCook(cook: any): Promise<any> {
  const existing = await prisma.cook.findUnique({ where: { id: cook.id } });
  const data = {
    ...cook,
    meals: cook.meals && typeof cook.meals !== 'string' ? JSON.stringify(cook.meals) : cook.meals,
    weeklyOff: cook.weeklyOff && typeof cook.weeklyOff !== 'string' ? JSON.stringify(cook.weeklyOff) : cook.weeklyOff,
  };
  if (existing) {
    const updated = await prisma.cook.update({ where: { id: cook.id }, data });
    return parseCook(updated);
  }
  const created = await prisma.cook.create({ data });
  return parseCook(created);
}

/** Delete a cook by ID */
export async function deleteCookById(id: string): Promise<boolean> {
  try {
    await prisma.cook.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

/** Count all cooks */
export async function countCooks(): Promise<number> {
  return prisma.cook.count();
}

/** Count pending cooks */
export async function countPendingCooks(): Promise<number> {
  return prisma.cook.count({ where: { status: 'Kitchen_Pending' } });
}

/** Get list of pending cooks */
export async function getPendingCooks(): Promise<any[]> {
  const cooks = await prisma.cook.findMany({ where: { status: 'Kitchen_Pending' } });
  return cooks.map(parseCook);
}

/** Verify a cook */
export async function verifyCook(id: string): Promise<any> {
  const updated = await prisma.cook.update({
    where: { id },
    data: { status: 'Verified' },
  });
  return parseCook(updated);
}

/** Delete a cook */
export async function deleteCook(id: string): Promise<any> {
  const deleted = await prisma.cook.delete({ where: { id } });
  return parseCook(deleted);
}

/** Create a new cook */
export async function createCook(data: any): Promise<any> {
  const mapped = {
    ...data,
    meals: data.meals && typeof data.meals !== 'string' ? JSON.stringify(data.meals) : data.meals,
    weeklyOff: data.weeklyOff && typeof data.weeklyOff !== 'string' ? JSON.stringify(data.weeklyOff) : data.weeklyOff,
  };
  const created = await prisma.cook.create({ data: mapped });
  return parseCook(created);
}

/** Update FSSAI details */
export async function updateFssai(id: string, data: { fssaiNumber?: string; fssaiExpiry?: string }): Promise<any> {
  const updated = await prisma.cook.update({
    where: { id },
    data: {
      fssaiNumber: data.fssaiNumber,
      fssaiExpiry: data.fssaiExpiry,
    },
  });
  return parseCook(updated);
}

/** Update FCM Token for push notifications */
export async function updateFcmToken(id: string, data: any): Promise<any> {
  const fcmToken = typeof data === 'string' ? data : data?.fcmToken;
  const updated = await prisma.cook.update({
    where: { id },
    data: { fcmToken },
  });
  return parseCook(updated);
}
