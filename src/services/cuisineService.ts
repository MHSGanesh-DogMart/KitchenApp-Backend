import { prisma } from '../config/database';

export const listCuisines = async (search?: string, isActive?: boolean) => {
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { description: { contains: search } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  return prisma.cuisine.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });
};

export const findCuisineById = async (id: string) => {
  return prisma.cuisine.findUnique({ where: { id } });
};

export const findCuisineByName = async (name: string) => {
  return prisma.cuisine.findFirst({
    where: { name: { equals: name } },
  });
};

export const createCuisine = async (data: {
  name: string;
  description?: string;
  imageUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}) => {
  return prisma.cuisine.create({
    data: {
      name: data.name.trim(),
      description: data.description?.trim(),
      imageUrl: data.imageUrl,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 0,
    },
  });
};

export const updateCuisine = async (
  id: string,
  updates: {
    name?: string;
    description?: string;
    imageUrl?: string;
    isActive?: boolean;
    sortOrder?: number;
  }
) => {
  const data: any = { ...updates };
  if (updates.name) data.name = updates.name.trim();
  if (updates.description) data.description = updates.description.trim();
  return prisma.cuisine.update({ where: { id }, data });
};

export const deleteCuisine = async (id: string) => {
  return prisma.cuisine.delete({ where: { id } });
};

export const countCuisines = async () => {
  return prisma.cuisine.count();
};
