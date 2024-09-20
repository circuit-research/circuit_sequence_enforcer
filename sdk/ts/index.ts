import { Connection, PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { createHash } from 'crypto';
import { IDL } from "./sequence_enforcer";

export const PROGRAM_ID = new PublicKey(
	"TT1eRKxi2Rj3oEvsFMe9W5hrcPmpXqKkNj7wC83AhXk"
);

export type SequenceAccount = {
	sequenceNum: BN;
	authority: PublicKey;
};

export const fetchSequenceAccount = async (
	connection: Connection,
	sequenceAccountPda: PublicKey
): Promise<SequenceAccount | undefined> => {
	const accountInfo = await connection.getAccountInfo(sequenceAccountPda);
	if (accountInfo === null) {
		console.error(`Sequence account (${sequenceAccountPda.toBase58()}) does not exist`);
		return undefined;
	}

	const coder = new anchor.BorshAccountsCoder(IDL);
	return coder.decode('sequenceAccount', accountInfo.data) as SequenceAccount;
};

export const checkIfAccountExists = async (
	connection: Connection,
	account: PublicKey
): Promise<boolean> => {
	try {
		const accountInfo = await connection.getAccountInfo(account);
		return accountInfo != null;
	} catch (e) {
		return false;
	}
};

export const findSequenceEnforcerPda = (
	pdaPrefix: string,
	authority: PublicKey,
	programId = PROGRAM_ID
): [PublicKey, number] => {
	const [sequenceAccount, sequenceAccountBump] =
		PublicKey.findProgramAddressSync(
			[Buffer.from(pdaPrefix, 'utf-8'), authority.toBytes()],
			programId
		);
	return [sequenceAccount, sequenceAccountBump];
};

export function makeInitSequenceInstruction(
	sequenceAccount: PublicKey,
	ownerPk: PublicKey,
	bump: number,
	sym: string,
	programId = PROGRAM_ID
): TransactionInstruction {
	const keys = [
		{ isSigner: false, isWritable: true, pubkey: sequenceAccount },
		{ isSigner: true, isWritable: true, pubkey: ownerPk },
		{ isSigner: false, isWritable: false, pubkey: SystemProgram.programId },
	];

	const variant = createHash('sha256')
		.update('global:initialize')
		.digest()
		.slice(0, 8);

	const bumpData = new BN(bump).toBuffer('le', 1);
	const strLen = new BN(sym.length).toBuffer('le', 4);
	const symEncoded = Buffer.from(sym);

	const data = Buffer.concat([variant, bumpData, strLen, symEncoded]);

	return new TransactionInstruction({
		keys,
		data,
		programId,
	});
}

export async function makeInitSequenceInstructionIfNotExist(
	connection: Connection,
	sequenceAccount: PublicKey,
	ownerPk: PublicKey,
	bump: number,
	sym: string,
	programId = PROGRAM_ID
): Promise<TransactionInstruction | null> {
	if (await checkIfAccountExists(connection, sequenceAccount)) {
		return null;
	}
	return makeInitSequenceInstruction(
		sequenceAccount,
		ownerPk,
		bump,
		sym,
		programId
	);
}

export function makeCheckTtlInstruction(
	sequenceAccount: PublicKey,
	ownerPk: PublicKey,
	ttl: number,
	programId = PROGRAM_ID
): TransactionInstruction {
	const keys = [
		{ isSigner: false, isWritable: true, pubkey: sequenceAccount },
		{ isSigner: true, isWritable: false, pubkey: ownerPk },
	];
	const variant = createHash('sha256')
		.update('global:check_ttl')
		.digest()
		.subarray(0, 8);

	const ttlBuffer = new BN(ttl).toBuffer('le', 8);
	const data = Buffer.concat([variant, ttlBuffer]);
	return new TransactionInstruction({
		keys,
		data,
		programId,
	});
}

export function makeResetSequenceNumberInstruction(
	sequenceAccount: PublicKey,
	ownerPk: PublicKey,
	seqNum: number,
	programId = PROGRAM_ID
): TransactionInstruction {
	const keys = [
		{ isSigner: false, isWritable: true, pubkey: sequenceAccount },
		{ isSigner: true, isWritable: false, pubkey: ownerPk },
	];
	const variant = createHash('sha256')
		.update('global:reset_sequence_number')
		.digest()
		.subarray(0, 8);

	const seqNumBuffer = new BN(seqNum).toBuffer('le', 8);
	const data = Buffer.concat([variant, seqNumBuffer]);
	return new TransactionInstruction({
		keys,
		data,
		programId,
	});
}

export function makeCheckAndSetSequenceNumberInstruction(
	sequenceAccount: PublicKey,
	ownerPk: PublicKey,
	seqNum: number,
	ttl: number,
	programId = PROGRAM_ID
): TransactionInstruction {
	const keys = [
		{ isSigner: false, isWritable: true, pubkey: sequenceAccount },
		{ isSigner: true, isWritable: false, pubkey: ownerPk },
	];
	const variant = createHash('sha256')
		.update('global:check_and_set_sequence_number')
		.digest()
		.subarray(0, 8);

	const seqNumBuffer = new BN(seqNum).toBuffer('le', 8);
	const ttlBuffer = new BN(ttl).toBuffer('le', 8);
	const data = Buffer.concat([variant, seqNumBuffer, ttlBuffer]);
	return new TransactionInstruction({
		keys,
		data,
		programId,
	});
}

/**
 * A helper class to manage sequence IDs for multiple keys, maintains a monotonic sequence ID for each key
 */
export class SequenceIdManager {
	private lastSequenceId: Map<string, number> = new Map();

	/**
	 * Hydrates the sequence IDs for the given keys and sequence accounts
	 * @param connection - The Solana connection object
	 * @param keys - The key to use to reference the corresponding sequenceAccount
	 * @param sequenceAccounts - An array of sequence account pubkeys to hydrate
	 */
	async hydrateSequenceIds(
		connection: Connection,
		keys: string[],
		sequenceAccounts: PublicKey[]
	): Promise<void> {
		if (keys.length !== sequenceAccounts.length) {
			throw new Error(`Must have same number of keys and sequence accounts`);
		}
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const pubkey = sequenceAccounts[i];
			const sequenceAccount = await fetchSequenceAccount(connection, pubkey);
			this.lastSequenceId.set(key, sequenceAccount.sequenceNum.toNumber());
			console.log(
				`Hydrating sequence IDs: ${key} ${pubkey.toBase58()}: ${sequenceAccount.sequenceNum.toNumber()}`
			);
		}
	}

	getNextSequenceId(key: string): number {
		if (!this.lastSequenceId.has(key)) {
			throw new Error(`Must call hydrateSequenceIds for ${key} first`);
		}
		const currentId = this.lastSequenceId.get(key)!;
		const nextId = currentId + 1;
		this.lastSequenceId.set(key, nextId);
		return nextId;
	}

	getCurrentSequenceId(key: string): number {
		if (!this.lastSequenceId.has(key)) {
			throw new Error(`Must call hydrateSequenceIds for ${key} first`);
		}
		return this.lastSequenceId.get(key)!;
	}
}