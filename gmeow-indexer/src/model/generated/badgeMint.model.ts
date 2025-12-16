import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {User} from "./user.model"

@Entity_()
export class BadgeMint {
    constructor(props?: Partial<BadgeMint>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    tokenId!: bigint

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @StringColumn_({nullable: false})
    badgeType!: string

    @BigIntColumn_({nullable: false})
    timestamp!: bigint

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
