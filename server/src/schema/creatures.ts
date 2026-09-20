import { pgTable, integer, pgEnum, text } from "drizzle-orm/pg-core";

export const rarity = pgEnum('rarity', [ 'common', 'uncommon', 'rare', 'legendary', 'epic' ]);

export const creatures = pgTable('creatures', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().unique().notNull(),
    description: text().unique().notNull(),
    rarity: rarity('rarity').notNull()
});