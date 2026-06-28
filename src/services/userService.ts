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
      fcmTokens: data.fcmToken ? [data.fcmToken] : [],
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
  },
) {
  const data: any = {};
  if (updates.name !== undefined) data.name = updates.name.trim();
  if (updates.email !== undefined) data.email = updates.email?.trim() || null;
  if (updates.dob !== undefined) data.dob = updates.dob || null;
  if (updates.profilePicUrl !== undefined) data.profilePicUrl = updates.profilePicUrl || null;
  return prisma.user.update({ where: { id }, data });
}

/** Add a device FCM token to the user's array (dedup; supports multiple devices). */
export async function addFcmToken(id: string, fcmToken: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  if (user.fcmTokens.includes(fcmToken)) return user;
  return prisma.user.update({
    where: { id },
    data: { fcmTokens: { push: fcmToken } },
  });
}

/** Remove a single device token (used on logout from that device). */
export async function removeFcmToken(id: string, fcmToken: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;
  return prisma.user.update({
    where: { id },
    data: { fcmTokens: { set: user.fcmTokens.filter((t) => t !== fcmToken) } },
  });
}

/** Permanently delete a customer and their favourites. */
export async function deleteUser(id: string) {
  await prisma.favorite.deleteMany({ where: { userId: id } });
  return prisma.user.delete({ where: { id } });
}

/** All customers, newest first (for the admin panel). */
export async function listAllUsers() {
  return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
}

export async function countUsers() {
  return prisma.user.count();
}
