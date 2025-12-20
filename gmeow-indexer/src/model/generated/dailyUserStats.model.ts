import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class DailyUserStats {
    constructor(props?: Partial<DailyUserStats>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @Index_()
    @StringColumn_({nullable: false})
    date!: string

    @IntColumn_({nullable: false})
    gmsCompleted!: number

    @BigIntColumn_({nullable: false})
    tipsGiven!: bigint

    @BigIntColumn_({nullable: false})
    tipsReceived!: bigint

    @BigIntColumn_({nullable: false})
    pointsEarned!: bigint

    @IntColumn_({nullable: false})
    guildsJoined!: number

    @IntColumn_({nullable: false})
    badgesMinted!: number

    @IntColumn_({nullable: false})
    streakDay!: number

    @IntColumn_({nullable: true})
    rank!: number | undefined | null
}
