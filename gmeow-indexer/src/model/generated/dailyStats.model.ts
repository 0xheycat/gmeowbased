import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class DailyStats {
    constructor(props?: Partial<DailyStats>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    date!: string

    @IntColumn_({nullable: false})
    totalGMs!: number

    @IntColumn_({nullable: false})
    uniqueUsers!: number

    @BigIntColumn_({nullable: false})
    totalXPAwarded!: bigint

    @IntColumn_({nullable: false})
    newGuilds!: number

    @IntColumn_({nullable: false})
    badgesMinted!: number
}
