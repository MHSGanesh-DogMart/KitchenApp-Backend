import { prisma } from '../config/database';

export const listCoupons = async (search?: string, status?: string) => {
  const where: any = {};

  if (search) {
    where.OR = [
      { code: { contains: search } },
      { description: { contains: search } }
    ];
  }

  if (status) {
    where.status = status;
  }

  return prisma.coupon.findMany({
    where,
    orderBy: { createdAt: 'desc' }
  });
};

export const findCouponByCode = async (code: string) => {
  return prisma.coupon.findUnique({
    where: { code: code.toUpperCase() }
  });
};

export const createCoupon = async (data: {
  code: string;
  description: string;
  type: string;
  value: number;
  cap: number;
  endsAt: Date | string;
  status?: string;
  minOrderValue?: number;
}) => {
  return prisma.coupon.create({
    data: {
      code: data.code.toUpperCase(),
      description: data.description,
      type: data.type,
      value: data.value,
      minOrderValue: data.minOrderValue ?? 0,
      cap: data.cap,
      endsAt: new Date(data.endsAt),
      status: data.status || 'active'
    }
  });
};

export const updateCouponByCode = async (code: string, updates: {
  description?: string;
  type?: string;
  value?: number;
  cap?: number;
  endsAt?: Date | string;
  status?: string;
  minOrderValue?: number;
}) => {
  const data: any = { ...updates };
  if (updates.endsAt) {
    data.endsAt = new Date(updates.endsAt);
  }
  return prisma.coupon.update({
    where: { code: code.toUpperCase() },
    data
  });
};

export const deleteCouponByCode = async (code: string) => {
  return prisma.coupon.delete({
    where: { code: code.toUpperCase() }
  });
};
