import { pgTable, varchar, text, uuid, timestamp } from "drizzle-orm/pg-core";

export const user = pgTable('users', {
    id: uuid().defaultRandom().primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: varchar({ length: 30 }).notNull().unique(),
    display_name: varchar({ length: 30 }).notNull(),
    password_hash: text().notNull(),
    created_at: timestamp().defaultNow().notNull()
});