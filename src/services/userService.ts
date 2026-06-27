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
  updates: {
    name?: string;
    email?: string;
    dob?: string;
    profilePicUrl?: string;
    fcmToken?: string;
  },
) {
  const data: any = {};
  if (updates.name !== undefined) data.name = updates.name.trim();
  if (updates.email !== undefined) data.email = updates.email?.trim() || null;
  if (updates.dob !== undefined) data.dob = updates.dob || null;
  if (updates.profilePicUrl !== undefined) data.profilePicUrl = updates.profilePicUrl || null;
  if (updates.fcmToken !== undefined) data.fcmToken = updates.fcmToken;
  return prisma.user.update({ where: { id }, data });
}

export async function updateFcmToken(id: string, fcmToken: string) {
  return prisma.user.update({ where: { id }, data: { fcmToken } });
}

/** All customers, newest first (for the admin panel). */
export async function listAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function countUsers() {
  return prisma.user.count();
}
