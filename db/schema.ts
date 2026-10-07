import { sqliteTable, text, integer, primaryKey, index } from "drizzle-orm/sqlite-core";
export const selections = sqliteTable(
  "selections",
  {
    userId: text("user_id").notNull(),
    productId: integer("product_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.productId] })],
);
export const requests = sqliteTable(
  "requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("requests_user_created_idx").on(table.userId, table.createdAt)],
);
