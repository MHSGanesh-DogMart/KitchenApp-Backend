import { prisma } from '../config/database';

export type FavType = 'kitchen' | 'dish';

/** Add a favourite (idempotent). */
export async function addFavorite(userId: string, type: FavType, targetId: string) {
  return prisma.favorite.upsert({
    where: { userId_type_targetId: { userId, type, targetId } },
    update: {},
    create: { userId, type, targetId },
  });
}

export async function removeFavorite(userId: string, type: FavType, targetId: string) {
  await prisma.favorite.deleteMany({ where: { userId, type, targetId } });
}

/** Target ids the user favourited, of a given type. */
export async function listFavoriteIds(userId: string, type: FavType): Promise<string[]> {
  const rows = await prisma.favorite.findMany({
    where: { userId, type },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((r) => r.targetId);
}

/** Both sets at once — used to mark isWishlisted across feeds. */
export async function favoritedSets(userId: string) {
  const rows = await prisma.favorite.findMany({ where: { userId } });
  const kitchen = new Set<string>();
  const dish = new Set<string>();
  for (const r of rows) {
    if (r.type === 'kitchen') kitchen.add(r.targetId);
    else if (r.type === 'dish') dish.add(r.targetId);
  }
  return { kitchen, dish };
}
