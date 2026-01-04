import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class RankUpEvent {
    constructor(props?: Partial<RankUpEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @IntColumn_({nullable: false})
    oldTier!: number

    @IntColumn_({nullable: false})
    newTier!: number

    @BigIntColumn_({nullable: false})
    totalScore!: bigint

    @IntColumn_({nullable: false})
    tierGap!: number

    @IntColumn_({nullable: false})
    newMultiplier!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
