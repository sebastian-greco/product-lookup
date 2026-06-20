export const productStatuses = ['ACTIVE', 'INACTIVE'] as const;

export type ProductStatus = (typeof productStatuses)[number];
