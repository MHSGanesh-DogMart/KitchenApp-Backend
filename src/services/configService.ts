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
  payoutCycle: 'Weekly · Friday 6 PM IST',
  minimumPayout: 500,
  bankRail: 'UPI · NEFT fallback'
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

export const updatePlatformConfig = async (updates: Partial<typeof DEFAULT_CONFIG>) => {
  // Ensure config exists before updating
  await getOrCreatePlatformConfig();
  
  // Exclude ID from updates just in case
  const { id, ...validUpdates } = updates;

  return prisma.platformConfig.update({
    where: { id: 'default' },
    data: validUpdates
  });
};
