module.exports = class Data1766604000619 {
    name = 'Data1766604000619'

    async up(db) {
        await db.query(`CREATE TABLE "guild_points_deposited_event" ("id" character varying NOT NULL, "guild_id" text NOT NULL, "from" text NOT NULL, "amount" numeric NOT NULL, "timestamp" numeric NOT NULL, "block_number" integer NOT NULL, "tx_hash" text NOT NULL, CONSTRAINT "PK_e4fef99dfc7958f4793563bb479" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_2ada80d5e0c79720dc1710d809" ON "guild_points_deposited_event" ("guild_id") `)
        await db.query(`CREATE INDEX "IDX_19f1490a15de7bd15db5948de0" ON "guild_points_deposited_event" ("from") `)
        await db.query(`CREATE INDEX "IDX_6e307a170dc403575f3fba9c37" ON "guild_points_deposited_event" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_77a26c1a2d913818d45a2cb9cf" ON "guild_points_deposited_event" ("tx_hash") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "guild_points_deposited_event"`)
        await db.query(`DROP INDEX "public"."IDX_2ada80d5e0c79720dc1710d809"`)
        await db.query(`DROP INDEX "public"."IDX_19f1490a15de7bd15db5948de0"`)
        await db.query(`DROP INDEX "public"."IDX_6e307a170dc403575f3fba9c37"`)
        await db.query(`DROP INDEX "public"."IDX_77a26c1a2d913818d45a2cb9cf"`)
    }
}
