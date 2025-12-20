import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, BooleanColumn as BooleanColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class BadgeStake {
    constructor(props?: Partial<BadgeStake>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    user!: string

    @BigIntColumn_({nullable: false})
    badgeId!: bigint

    @Index_()
    @StringColumn_({nullable: false})
    stakeType!: string

    @DateTimeColumn_({nullable: true})
    stakedAt!: Date | undefined | null

    @DateTimeColumn_({nullable: true})
    unstakedAt!: Date | undefined | null

    @Index_()
    @BooleanColumn_({nullable: false})
    isActive!: boolean

    @BigIntColumn_({nullable: true})
    rewardsEarned!: bigint | undefined | null

    @DateTimeColumn_({nullable: true})
    lastRewardClaim!: Date | undefined | null

    @BooleanColumn_({nullable: false})
    isPowerBadge!: boolean

    @IntColumn_({nullable: true})
    powerMultiplier!: number | undefined | null

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
