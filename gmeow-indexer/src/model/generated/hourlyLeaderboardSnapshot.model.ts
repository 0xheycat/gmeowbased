import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class HourlyLeaderboardSnapshot {
    constructor(props?: Partial<HourlyLeaderboardSnapshot>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @IntColumn_({nullable: false})
    totalUsers!: number

    @BigIntColumn_({nullable: false})
    averagePoints!: bigint

    @BigIntColumn_({nullable: false})
    medianPoints!: bigint

    @StringColumn_({nullable: false})
    entriesJSON!: string
}
