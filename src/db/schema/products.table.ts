import {
  check,
  index,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { productStatuses } from './product-status.js';

/**
 * Product IDs use the agreed `prd_` prefixed ULID format.
 */
export const productStatusEnum = pgEnum('product_status', productStatuses);

export const productsTable = pgTable(
  'products',
  {
    id: varchar('id', { length: 30 }).primaryKey(),
    sku: varchar('sku', { length: 64 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 128 }).notNull(),
    price: numeric('price', {
      precision: 12,
      scale: 2,
      mode: 'number'
    }).notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    status: productStatusEnum('status').default('ACTIVE').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    uniqueIndex('products_sku_unique_idx').on(table.sku),
    index('products_category_idx').on(table.category),
    index('products_status_idx').on(table.status),
    index('products_name_trgm_idx').using('gin', table.name.op('gin_trgm_ops')),
    check(
      'products_id_format_check',
      sql`${table.id} ~ '^prd_[0-9A-HJKMNP-TV-Z]{26}$'`
    ),
    check('products_sku_not_blank_check', sql`btrim(${table.sku}) <> ''`),
    check('products_name_not_blank_check', sql`btrim(${table.name}) <> ''`),
    check(
      'products_category_not_blank_check',
      sql`btrim(${table.category}) <> ''`
    ),
    check('products_price_positive_check', sql`${table.price} > 0`),
    check(
      'products_currency_format_check',
      sql`${table.currency} ~ '^[A-Z]{3}$'`
    )
  ]
);
