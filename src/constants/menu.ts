// Canonical option sets for menu items — kept consistent across the
// Kitchen app, the backend, the admin panel, and Swagger docs.

export const DIET_OPTIONS = ['Veg', 'Non-veg', 'Vegan', 'Jain'] as const;
export const SPICE_OPTIONS = ['Mild', 'Medium', 'Spicy', 'Extra spicy'] as const;

export type Diet = (typeof DIET_OPTIONS)[number];
export type Spice = (typeof SPICE_OPTIONS)[number];

export const isValidDiet = (v: unknown): v is Diet =>
  typeof v === 'string' && (DIET_OPTIONS as readonly string[]).includes(v);

export const isValidSpice = (v: unknown): v is Spice =>
  typeof v === 'string' && (SPICE_OPTIONS as readonly string[]).includes(v);
