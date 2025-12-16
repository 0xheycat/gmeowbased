import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, StringColumn as StringColumn_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"
import {ReferralCode} from "./referralCode.model"

@Entity_()
export class ReferralUse {
    constructor(props?: Partial<ReferralUse>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => ReferralCode, {nullable: true})
    code!: ReferralCode

    @Index_()
    @StringColumn_({nullable: false})
    referrer!: string

    @Index_()
    @StringColumn_({nullable: false})
    referee!: string

    @BigIntColumn_({nullable: false})
    reward!: bigint

    @BigIntColumn_({nullable: false})
    timestamp!: bigint

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
