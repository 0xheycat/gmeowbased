import { Factories, ed25519 } from '@farcaster/core';

type HexString = `0x${string}`;

const toHexString = (bytes: Uint8Array): HexString =>
	`0x${Buffer.from(bytes).toString('hex')}`;

const createSigner = async () => {
	const privateKey = Factories.Ed25519PrivateKey.build();
	const publicKeyResult = await ed25519.getPublicKey(privateKey);

	if (publicKeyResult.isErr()) {
		throw publicKeyResult.error;
	}

	const publicKey = publicKeyResult.value;

	const signer = {
		publicKey: toHexString(publicKey),
		privateKey: toHexString(privateKey),
		getAddress: () => toHexString(publicKey),
	};

	return signer;
};

const main = async () => {
	try {
		const signer = await createSigner();
		console.log('Public key:', signer.publicKey);
		console.log('Private key:', signer.privateKey);
		console.log('Signer address:', signer.getAddress());
	} catch (error) {
		console.error('Failed to create signer');
		if (error instanceof Error) {
			console.error(error.message);
		}
		process.exitCode = 1;
	}
};

void main();