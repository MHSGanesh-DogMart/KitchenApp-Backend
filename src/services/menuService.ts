import { prisma } from '../config/database';

export interface MenuInput {
  name: string;
  price: number;
  perDay?: number;
  imageUrl?: string;
  diet?: string;
  spice?: string;
  eggless?: boolean;
  portion?: string;
  ingredients?: string;
  description?: string;
  isAvailable?: boolean;
}

/** All menu items belonging to a kitchen (newest first). */
export const listMenusByCook = async (cookId: string) => {
  return prisma.menuItem.findMany({
    where: { cookId },
    orderBy: { createdAt: 'desc' },
  });
};

/** Every available dish across all kitchens (for the customer home feed). */
export const listAvailableMenus = async () => {
  return prisma.menuItem.findMany({
    where: { isAvailable: true },
    orderBy: { createdAt: 'desc' },
  });
};

export const findMenuById = async (id: string) => {
  return prisma.menuItem.findUnique({ where: { id } });
};

export const createMenu = async (cookId: string, data: MenuInput) => {
  return prisma.menuItem.create({
    data: {
      cookId,
      name: data.name.trim(),
      price: data.price,
      perDay: data.perDay ?? 0,
      imageUrl: data.imageUrl,
      diet: data.diet ?? 'Veg',
      spice: data.spice ?? 'Medium',
      eggless: data.eggless ?? true,
      portion: data.portion?.trim(),
      ingredients: data.ingredients?.trim(),
      description: data.description?.trim(),
      isAvailable: data.isAvailable ?? true,
    },
  });
};

export const updateMenu = async (id: string, updates: Partial<MenuInput>) => {
  const data: any = { ...updates };
  if (updates.name) data.name = updates.name.trim();
  if (updates.portion !== undefined) data.portion = updates.portion?.trim();
  if (updates.ingredients !== undefined) {
    data.ingredients = updates.ingredients?.trim();
  }
  if (updates.description !== undefined) {
    data.description = updates.description?.trim();
  }
  return prisma.menuItem.update({ where: { id }, data });
};

export const setAvailability = async (id: string, isAvailable: boolean) => {
  return prisma.menuItem.update({ where: { id }, data: { isAvailable } });
};

export const deleteMenu = async (id: string) => {
  return prisma.menuItem.delete({ where: { id } });
};
