import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class PointsTransaction {
    constructor(props?: Partial<PointsTransaction>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    transactionType!: string

    @Index_()
    @StringColumn_({nullable: false})
    user!: string

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @StringColumn_({nullable: true})
    from!: string | undefined | null

    @StringColumn_({nullable: true})
    to!: string | undefined | null

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
