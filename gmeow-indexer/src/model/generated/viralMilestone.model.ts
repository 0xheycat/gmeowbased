import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, DateTimeColumn as DateTimeColumn_, BooleanColumn as BooleanColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class ViralMilestone {
    constructor(props?: Partial<ViralMilestone>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @Index_()
    @StringColumn_({nullable: false})
    milestoneType!: string

    @BigIntColumn_({nullable: false})
    value!: bigint

    @DateTimeColumn_({nullable: false})
    timestamp!: Date

    @StringColumn_({nullable: true})
    castHash!: string | undefined | null

    @BooleanColumn_({nullable: false})
    notificationSent!: boolean

    @BigIntColumn_({nullable: true})
    previousValue!: bigint | undefined | null

    @BigIntColumn_({nullable: false})
    requiredValue!: bigint

    @Index_()
    @StringColumn_({nullable: false})
    category!: string
}
