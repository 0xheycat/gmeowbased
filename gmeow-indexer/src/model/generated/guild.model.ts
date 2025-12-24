import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, BooleanColumn as BooleanColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {GuildMember} from "./guildMember.model"
import {GuildEvent} from "./guildEvent.model"

@Entity_()
export class Guild {
    constructor(props?: Partial<Guild>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @StringColumn_({nullable: false})
    name!: string

    @Index_()
    @StringColumn_({nullable: false})
    owner!: string

    @BigIntColumn_({nullable: false})
    createdAt!: bigint

    @IntColumn_({nullable: false})
    totalMembers!: number

    @IntColumn_({nullable: false})
    level!: number

    @BooleanColumn_({nullable: false})
    isActive!: boolean

    @BigIntColumn_({nullable: false})
    treasuryPoints!: bigint

    @OneToMany_(() => GuildMember, e => e.guild)
    members!: GuildMember[]

    @OneToMany_(() => GuildEvent, e => e.guild)
    events!: GuildEvent[]
}
