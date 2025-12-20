import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class TreasuryOperation {
    constructor(props?: Partial<TreasuryOperation>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    operationType!: string

    @Index_()
    @StringColumn_({nullable: false})
    token!: string

    @BigIntColumn_({nullable: false})
    amount!: bigint

    @Index_()
    @StringColumn_({nullable: false})
    from!: string

    @StringColumn_({nullable: true})
    to!: string | undefined | null

    @BigIntColumn_({nullable: true})
    questId!: bigint | undefined | null

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
