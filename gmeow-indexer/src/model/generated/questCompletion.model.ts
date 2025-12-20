import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, DateTimeColumn as DateTimeColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {Quest} from "./quest.model"
import {User} from "./user.model"

@Entity_()
export class QuestCompletion {
    constructor(props?: Partial<QuestCompletion>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Quest, {nullable: true})
    quest!: Quest

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @BigIntColumn_({nullable: false})
    pointsAwarded!: bigint

    @BigIntColumn_({nullable: true})
    tokenReward!: bigint | undefined | null

    @StringColumn_({nullable: true})
    rewardToken!: string | undefined | null

    @BigIntColumn_({nullable: false})
    fid!: bigint

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
