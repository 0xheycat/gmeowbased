import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {ReferralUse} from "./referralUse.model"

@Entity_()
export class ReferralCode {
    constructor(props?: Partial<ReferralCode>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    owner!: string

    @BigIntColumn_({nullable: false})
    createdAt!: bigint

    @IntColumn_({nullable: false})
    totalUses!: number

    @BigIntColumn_({nullable: false})
    totalRewards!: bigint

    @OneToMany_(() => ReferralUse, e => e.code)
    referrals!: ReferralUse[]
}
