import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, StringColumn as StringColumn_, Index as Index_, BigIntColumn as BigIntColumn_, IntColumn as IntColumn_, DateTimeColumn as DateTimeColumn_, BooleanColumn as BooleanColumn_, OneToMany as OneToMany_} from "@subsquid/typeorm-store"
import {QuestCompletion} from "./questCompletion.model"

@Entity_()
export class Quest {
    constructor(props?: Partial<Quest>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @Index_()
    @StringColumn_({nullable: false})
    questType!: string

    @Index_()
    @StringColumn_({nullable: false})
    creator!: string

    @Index_()
    @StringColumn_({nullable: false})
    contractAddress!: string

    @BigIntColumn_({nullable: false})
    rewardPoints!: bigint

    @StringColumn_({nullable: true})
    rewardToken!: string | undefined | null

    @BigIntColumn_({nullable: true})
    rewardTokenAmount!: bigint | undefined | null

    @IntColumn_({nullable: true})
    onchainType!: number | undefined | null

    @StringColumn_({nullable: true})
    targetAsset!: string | undefined | null

    @BigIntColumn_({nullable: true})
    targetAmount!: bigint | undefined | null

    @StringColumn_({nullable: true})
    targetData!: string | undefined | null

    @DateTimeColumn_({nullable: false})
    createdAt!: Date

    @Index_()
    @IntColumn_({nullable: false})
    createdBlock!: number

    @DateTimeColumn_({nullable: true})
    closedAt!: Date | undefined | null

    @IntColumn_({nullable: true})
    closedBlock!: number | undefined | null

    @Index_()
    @BooleanColumn_({nullable: false})
    isActive!: boolean

    @IntColumn_({nullable: false})
    totalCompletions!: number

    @BigIntColumn_({nullable: false})
    totalPointsAwarded!: bigint

    @BigIntColumn_({nullable: false})
    totalTokensAwarded!: bigint

    @OneToMany_(() => QuestCompletion, e => e.quest)
    completions!: QuestCompletion[]

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
