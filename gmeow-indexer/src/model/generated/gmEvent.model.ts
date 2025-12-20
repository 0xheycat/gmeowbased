import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, StringColumn as StringColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class GMEvent {
    constructor(props?: Partial<GMEvent>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @BigIntColumn_({nullable: false})
    timestamp!: bigint

    @BigIntColumn_({nullable: false})
    pointsAwarded!: bigint

    @IntColumn_({nullable: false})
    streakDay!: number

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
