import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, OneToMany as OneToMany_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {BadgeMint} from "./badgeMint.model"
import {GuildMember} from "./guildMember.model"
import {GMEvent} from "./gmEvent.model"
import {TipEvent} from "./tipEvent.model"
import {ViralMilestone} from "./viralMilestone.model"

@Entity_()
export class User {
    constructor(props?: Partial<User>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    totalPoints!: bigint

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

    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @DateTimeColumn_({nullable: false})
    updatedAt!: Date
}
