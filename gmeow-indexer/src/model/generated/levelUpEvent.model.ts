import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, IntColumn as IntColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class LevelUpEvent {
    constructor(props?: Partial<LevelUpEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @IntColumn_({nullable: false})
    oldLevel!: number

    @IntColumn_({nullable: false})
    newLevel!: number

    @BigIntColumn_({nullable: false})
    totalScore!: bigint

    @IntColumn_({nullable: false})
    levelGap!: number

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
