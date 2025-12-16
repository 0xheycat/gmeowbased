import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class LeaderboardEntry {
    constructor(props?: Partial<LeaderboardEntry>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @Index_()
    @IntColumn_({nullable: false})
    rank!: number

    @BigIntColumn_({nullable: false})
    totalPoints!: bigint

    @BigIntColumn_({nullable: false})
    weeklyPoints!: bigint

    @BigIntColumn_({nullable: false})
    monthlyPoints!: bigint

    @DateTimeColumn_({nullable: false})
    updatedAt!: Date
}
