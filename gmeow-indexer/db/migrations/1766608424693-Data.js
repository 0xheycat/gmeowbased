module.exports = class Data1766608424693 {
    name = 'Data1766608424693'

    async up(db) {
        await db.query(`CREATE TABLE "guild_level_up_event" ("id" character varying NOT NULL, "guild_id" text NOT NULL, "new_level" integer NOT NULL, "timestamp" numeric NOT NULL, "block_number" integer NOT NULL, "tx_hash" text NOT NULL, CONSTRAINT "PK_7634fdd51f06997bdb044e2d33e" PRIMARY KEY ("id"))`)
        await db.query(`CREATE INDEX "IDX_d6f380f74a5ccac56e09d0d07d" ON "guild_level_up_event" ("guild_id") `)
        await db.query(`CREATE INDEX "IDX_daa000439b6622e0c927dcb17a" ON "guild_level_up_event" ("block_number") `)
        await db.query(`CREATE INDEX "IDX_300ef6fe94ac7301a27ca6577e" ON "guild_level_up_event" ("tx_hash") `)
    }

    async down(db) {
        await db.query(`DROP TABLE "guild_level_up_event"`)
        await db.query(`DROP INDEX "public"."IDX_d6f380f74a5ccac56e09d0d07d"`)
        await db.query(`DROP INDEX "public"."IDX_daa000439b6622e0c927dcb17a"`)
        await db.query(`DROP INDEX "public"."IDX_300ef6fe94ac7301a27ca6577e"`)
    }
}
