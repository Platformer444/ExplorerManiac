import { pgTable, timestamp, integer, uuid, text } from "drizzle-orm/pg-core";
import { user } from "./users";

export const session = pgTable('sessions', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid().notNull().references(() => user.id),
    token: text().notNull(),
    created_at: timestamp().defaultNow().notNull(),
    expired_at: timestamp().notNull()
});