import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class StatsUpdatedEvent {
    constructor(props?: Partial<StatsUpdatedEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @BigIntColumn_({nullable: false})
    totalScore!: bigint

    @IntColumn_({nullable: false})
    level!: number

    @IntColumn_({nullable: false})
    rankTier!: number

    @IntColumn_({nullable: false})
    multiplier!: number

    @Index_()
    @StringColumn_({nullable: false})
    triggerType!: string

    @BigIntColumn_({nullable: false})
    triggerAmount!: bigint

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
