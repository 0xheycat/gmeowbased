import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, OneToMany as OneToMany_, Index as Index_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {BadgeMint} from "./badgeMint.model"
import {GuildMember} from "./guildMember.model"
import {GMEvent} from "./gmEvent.model"
import {TipEvent} from "./tipEvent.model"
import {ViralMilestone} from "./viralMilestone.model"
import {StatsUpdatedEvent} from "./statsUpdatedEvent.model"
import {LevelUpEvent} from "./levelUpEvent.model"
import {RankUpEvent} from "./rankUpEvent.model"

@Entity_()
export class User {
    constructor(props?: Partial<User>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    pointsBalance!: bigint

    @BigIntColumn_({nullable: false})
    totalEarnedFromGMs!: bigint

    @IntColumn_({nullable: false})
    currentStreak!: number

    @BigIntColumn_({nullable: false})
    lastGMTimestamp!: bigint

    @IntColumn_({nullable: false})
    lifetimeGMs!: number

    @OneToMany_(() => BadgeMint, e => e.user)
    badges!: BadgeMint[]

    @OneToMany_(() => GuildMember, e => e.user)
    guilds!: GuildMember[]

    @OneToMany_(() => GMEvent, e => e.user)
    gmEvents!: GMEvent[]

    @OneToMany_(() => TipEvent, e => e.from)
    tipsGiven!: TipEvent[]

    @OneToMany_(() => TipEvent, e => e.to)
    tipsReceived!: TipEvent[]

    @BigIntColumn_({nullable: false})
    totalTipsGiven!: bigint

    @BigIntColumn_({nullable: false})
    totalTipsReceived!: bigint

    @OneToMany_(() => ViralMilestone, e => e.user)
    milestones!: ViralMilestone[]

    @IntColumn_({nullable: false})
    milestoneCount!: number

    @Index_()
    @IntColumn_({nullable: false})
    level!: number

    @Index_()
    @IntColumn_({nullable: false})
    rankTier!: number

    @Index_()
    @BigIntColumn_({nullable: false})
    totalScore!: bigint

    @IntColumn_({nullable: false})
    multiplier!: number

    @BigIntColumn_({nullable: false})
    gmPoints!: bigint

    @BigIntColumn_({nullable: false})
    viralPoints!: bigint

    @BigIntColumn_({nullable: false})
    questPoints!: bigint

    @BigIntColumn_({nullable: false})
    guildPoints!: bigint

    @BigIntColumn_({nullable: false})
    referralPoints!: bigint

    @BigIntColumn_({nullable: false})
    xpIntoLevel!: bigint

    @BigIntColumn_({nullable: false})
    xpToNextLevel!: bigint

    @BigIntColumn_({nullable: false})
    pointsIntoTier!: bigint

    @BigIntColumn_({nullable: false})
    pointsToNextTier!: bigint

    @DateTimeColumn_({nullable: true})
    lastLevelUpAt!: Date | undefined | null

    @DateTimeColumn_({nullable: true})
    lastRankUpAt!: Date | undefined | null

    @IntColumn_({nullable: false})
    totalLevelUps!: number

    @IntColumn_({nullable: false})
    totalRankUps!: number

    @OneToMany_(() => StatsUpdatedEvent, e => e.user)
    statsUpdates!: StatsUpdatedEvent[]

    @OneToMany_(() => LevelUpEvent, e => e.user)
    levelUps!: LevelUpEvent[]

    @OneToMany_(() => RankUpEvent, e => e.user)
    rankUps!: RankUpEvent[]

    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @DateTimeColumn_({nullable: false})
    updatedAt!: Date
}
