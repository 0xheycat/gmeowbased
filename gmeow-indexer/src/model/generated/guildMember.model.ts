import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, ManyToOne as ManyToOne_, Index as Index_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, BooleanColumn as BooleanColumn_} from "@subsquid/typeorm-store"
import {Guild} from "./guild.model"
import {User} from "./user.model"

@Entity_()
export class GuildMember {
    constructor(props?: Partial<GuildMember>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @ManyToOne_(() => Guild, {nullable: true})
    guild!: Guild

    @Index_()
    @ManyToOne_(() => User, {nullable: true})
    user!: User

    @BigIntColumn_({nullable: false})
    joinedAt!: bigint

    @StringColumn_({nullable: false})
    role!: string

    @BigIntColumn_({nullable: false})
    pointsContributed!: bigint

    @BooleanColumn_({nullable: false})
    isActive!: boolean
}
