import { pgTable, integer, uuid, timestamp, varchar } from "drizzle-orm/pg-core";
import { user } from "./users";
import { creatures } from "./creatures";

export const userCreatures = pgTable('user-creatures', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    userId: uuid().notNull().references(() => user.id),
    creatureId: integer().notNull().references(() => creatures.id),
    nickname: varchar({ length: 30 }),
    experience: integer().notNull().default(0),
    caught_at: timestamp().defaultNow().notNull()
});