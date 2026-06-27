import { prisma } from '../config/database';

const normalize = (p: string) => p.replace(/\D/g, '');

/** Find a customer by phone (digits-only compare). */
export async function findUserByPhone(phone: string) {
  const cleaned = normalize(phone);
  const users = await prisma.user.findMany();
  return users.find((u) => normalize(u.phone) === cleaned) || null;
}

export async function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export async function createUser(data: {
  name: string;
  phone: string;
  email?: string;
  fcmToken?: string;
}) {
  return prisma.user.create({
    data: {
      name: data.name.trim(),
      phone: data.phone,
      email: data.email?.trim() || null,
      fcmToken: data.fcmToken || null,
      status: 'Active',
    },
  });
}

export async function updateUser(
  id: string,
  updates: { name?: string; email?: string; fcmToken?: string },
) {
  const data: any = { ...updates };
  if (updates.name) data.name = updates.name.trim();
  if (updates.email !== undefined) data.email = updates.email?.trim() || null;
  return prisma.user.update({ where: { id }, data });
}

export async function updateFcmToken(id: string, fcmToken: string) {
  return prisma.user.update({ where: { id }, data: { fcmToken } });
}
