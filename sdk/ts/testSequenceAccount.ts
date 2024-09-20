import { ComputeBudgetInstruction, ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import {
	fetchSequenceAccount,
	findSequenceEnforcerPda,
	makeCheckAndSetSequenceNumberInstruction,
	makeInitSequenceInstruction,
	makeResetSequenceNumberInstruction,
	SequenceAccount,
} from "./index";


const rpc = 'https://api.mainnet-beta.solana.com';
const signer = [0, 0, 0];
const seqAccountPrefix = 'seq-2'; // chance this to init a new account
const computePrice = 100;


const sendAndConfirmIxs = async (connection: Connection, instructions: TransactionInstruction[], wallet: Keypair) => {
	const blockhash = await connection.getLatestBlockhash();
	const msg = new TransactionMessage({
		payerKey: wallet.publicKey,
		instructions,
		recentBlockhash: blockhash.blockhash
	}).compileToV0Message([]);
	const tx = new VersionedTransaction(msg);
	tx.sign([wallet]);
	const txSig = await connection.sendTransaction(tx, {
		skipPreflight: false
	});
	console.log(`Transaction sent: ${txSig}`);


	while (true) {
		const blockHeight = await connection.getBlockHeight({
			commitment: 'confirmed',
		});
		if (blockHeight > blockhash.lastValidBlockHeight) {
			throw new Error(`Block height ${blockHeight} is greater than last valid block height ${blockhash.lastValidBlockHeight}, tx dropped`);
		}
		const txResp = await connection.getTransaction(txSig, {
			commitment: 'confirmed',
			maxSupportedTransactionVersion: 0
		});
		if (txResp) {
			console.log(`Transaction confirmed!`);
			break;
		} else {
			console.log(`Waiting for confirmation...`)
			await new Promise(resolve => setTimeout(resolve, 1000));
			continue;
		}
	}
}

const main = async () => {
	const wallet = Keypair.fromSecretKey(Uint8Array.from(signer));
	const connection = new Connection(rpc, "confirmed");

	console.log(`Siging wallet with ${wallet.publicKey.toBase58()}: ${(await connection.getBalance(wallet.publicKey)) / LAMPORTS_PER_SOL} SOL balance`);

	const [seqAccountKey, bump] = findSequenceEnforcerPda(seqAccountPrefix, wallet.publicKey);
	console.log(`Loading Sequence Account for prefix: ${seqAccountPrefix}, pubkey: ${seqAccountKey.toBase58()}, bump: ${bump}`);

	const acc = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(`Sequence account exists: ${acc !== undefined}`);
	if (!acc) {
		console.log(`Initing account...`);
		const ix = makeInitSequenceInstruction(seqAccountKey, wallet.publicKey, bump, seqAccountPrefix);
		await sendAndConfirmIxs(
			connection,
			[
				ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computePrice }),
				ix,
			],
			wallet);
	}

	const seqAccount = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(`Sequence account:`);
	console.log(seqAccount);

	console.log(`Resetting sequence to 0`)
	const ix0 = makeResetSequenceNumberInstruction(seqAccountKey, wallet.publicKey, 0);
	await sendAndConfirmIxs(connection, [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computePrice }), ix0], wallet);
	const seqAccount0 = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(seqAccount0);
	console.log('');

	/// try setting an out of order sequence
	console.log(`Setting sequence to 1`)
	const ix1 = makeCheckAndSetSequenceNumberInstruction(seqAccountKey, wallet.publicKey, 1, Date.now() / 1000 + 100);
	await sendAndConfirmIxs(connection, [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computePrice }), ix1], wallet);
	const seqAccount1 = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(seqAccount1);
	console.log('');

	console.log(`Setting sequence to 2`)
	const ix2 = makeCheckAndSetSequenceNumberInstruction(seqAccountKey, wallet.publicKey, 2, Date.now() / 1000 + 100);
	await sendAndConfirmIxs(connection, [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computePrice }), ix2], wallet);
	const seqAccount2 = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(seqAccount2);
	console.log('');

	console.log(`Setting sequence to 3`)
	const ix3 = makeCheckAndSetSequenceNumberInstruction(seqAccountKey, wallet.publicKey, 3, Date.now() / 1000 + 100);
	await sendAndConfirmIxs(connection, [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computePrice }), ix3], wallet);
	const seqAccount3 = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(seqAccount3);
	console.log('');

	console.log(`Setting sequence to 1 (should throw)`)
	try {
		const ix4 = makeCheckAndSetSequenceNumberInstruction(seqAccountKey, wallet.publicKey, 1, Date.now() / 1000 + 100);
		await sendAndConfirmIxs(connection, [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computePrice }), ix4], wallet);
		throw new Error(`Expected an error...`);
	} catch (e) {
		console.error(e);
	}
	const seqAccount4 = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(seqAccount4);
	console.log('');

	console.log(`Testing ttl`)
	console.log(`Setting sequence to 10`)
	const ix5 = makeCheckAndSetSequenceNumberInstruction(seqAccountKey, wallet.publicKey, 10, Date.now() / 1000 - 100);
	await sendAndConfirmIxs(connection, [ComputeBudgetProgram.setComputeUnitPrice({ microLamports: computePrice }), ix5], wallet);
	const seqAccount5 = await fetchSequenceAccount(connection, seqAccountKey);
	console.log(seqAccount5);
	console.log('');
};

main();