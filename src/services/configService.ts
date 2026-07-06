import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';

const DEFAULT_CONFIG = {
  id: 'default',
  platformCommission: 15,
  customerDeliveryFee: 25,
  cookSignupBonus: 500,
  platformFee: 10,
  privacyPolicyUrl: 'https://example.com/privacy',
  termsAndConditionUrl: 'https://example.com/terms',
  defaultStateRadius: 100000,
  defaultCityRadius: 15000,
  defaultVillageRadius: 5000,
  deliveryRadiusKm: 10,
  pickupRadiusKm: 25,
  payoutCycle: 'Weekly · Friday 6 PM IST',
  minimumPayout: 500,
  bankRail: 'UPI · NEFT fallback',
  activeCities: [] as Prisma.InputJsonValue
};

export const getOrCreatePlatformConfig = async () => {
  let config = await prisma.platformConfig.findUnique({
    where: { id: 'default' }
  });
  if (!config) {
    config = await prisma.platformConfig.create({
      data: DEFAULT_CONFIG
    });
  }
  return config;
};

// Columns that clients are allowed to update. Anything else in the request
// body (e.g. `activeCities` sent by the admin UI) is ignored so a stray field
// can't make Prisma reject the whole update.
const UPDATABLE_FIELDS = [
  'platformCommission',
  'customerDeliveryFee',
  'cookSignupBonus',
  'platformFee',
  'privacyPolicyUrl',
  'termsAndConditionUrl',
  'defaultStateRadius',
  'defaultCityRadius',
  'defaultVillageRadius',
  'deliveryRadiusKm',
  'pickupRadiusKm',
  'payoutCycle',
  'minimumPayout',
  'bankRail',
  'activeCities',
] as const;

export const updatePlatformConfig = async (updates: Record<string, unknown>) => {
  // Ensure config exists before updating
  await getOrCreatePlatformConfig();

  // Whitelist only known columns; drop id, updatedAt, and any unknown fields.
  const validUpdates: Record<string, unknown> = {};
  for (const key of UPDATABLE_FIELDS) {
    if (updates[key] !== undefined) validUpdates[key] = updates[key];
  }

  return prisma.platformConfig.update({
    where: { id: 'default' },
    data: validUpdates
  });
};
