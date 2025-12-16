import {Entity as Entity_, Column as Column_, PrimaryColumn as PrimaryColumn_, BigIntColumn as BigIntColumn_, StringColumn as StringColumn_, Index as Index_, IntColumn as IntColumn_} from "@subsquid/typeorm-store"

@Entity_()
export class NFTMint {
    constructor(props?: Partial<NFTMint>) {
        Object.assign(this, props)
    }

    @PrimaryColumn_()
    id!: string

    @BigIntColumn_({nullable: false})
    tokenId!: bigint

    @Index_()
    @StringColumn_({nullable: false})
    to!: string

    @Index_()
    @StringColumn_({nullable: false})
    nftType!: string

    @StringColumn_({nullable: false})
    metadataURI!: string

    @BigIntColumn_({nullable: false})
    timestamp!: bigint

    @Index_()
    @IntColumn_({nullable: false})
    blockNumber!: number

    @Index_()
    @StringColumn_({nullable: false})
    txHash!: string
}
