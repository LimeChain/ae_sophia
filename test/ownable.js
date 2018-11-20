const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;

const utils = require('./utils');
const config = require('./config.json')
const sourceFile = './contracts/Ownable.aes';

// const config = {
// 	host: "http://localhost:3001/",
// 	internalHost: "http://localhost:3001/internal/",
// 	ownerKeyPair: {
// 		secretKey: 'bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
// 		publicKey: 'ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU'
// 	},
// 	notOwnerKeyPair: {
// 		secretKey: 'e37484af730bc798ac10fdce7523dc24a64182dfe88ff139f739c1c7f3475434df473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d',
// 		publicKey: 'ak_2hLLun8mZQvbEhaDxaWtJBsXLnhyokynwfMDZJ67TbqGoSCtQ9'
// 	},
// 	publicKeyHex: '0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
// 	notOwnerpublicKeyHex: "0xdf473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d",
// 	filesEncoding: 'utf-8',
// 	sourceFile: './contracts/Ownable.aes',
// 	gas: 100000,
// 	ttl: 122
// }


describe('Ownable', () => {

	let firstClient;
	let secondClient;
	let ownableSource;


	before(async () => {

		firstClient = await Universal({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.ownerKeyPair
		});
		secondClient = await Universal({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.notOwnerKeyPair
		});

		const {
			tx
		} = await firstClient.api.postSpend({
			fee: 1,
			amount: 1,
			senderId: config.ownerKeyPair.publicKey,
			recipientId: config.notOwnerKeyPair.publicKey,
			payload: '',
			ttl: 123
		})
		const signed = await firstClient.signTransaction(tx)

		await firstClient.api.postTransaction({
			tx: signed
		})

		ownableSource = utils.readFileRelative(sourceFile, config.filesEncoding);
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			//Arrange
			const compiledContract = await firstClient.contractCompile(ownableSource, {
				gas: config.gas
			})

			//Act
			const deployPromise = compiledContract.deploy({
				options: {
					ttl: config.ttl,
					gas: config.gas,
				}
			});

			assert.isFulfilled(deployPromise, 'Could not deploy the Ownable Smart Contract');
			//Assert
			const deployedContract = await deployPromise;
			assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
		})

	})

	describe('Smart contract tests', () => {

		let deployedContract;
		let compiledContract;

		beforeEach(async () => {
			compiledContract = await firstClient.contractCompile(ownableSource, {
				gas: config.gas
			})

			deployedContract = await compiledContract.deploy({
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
		})

		it('should set the proper owner to the smart contarct', async () => {

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.ownerKeyPair.publicKey))

		})

		it('should return true if owner calls onlyOwner', async () => {
			const callOnlyOwnerPromise = deployedContract.call('onlyOwner', {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});

			assert.isFulfilled(callOnlyOwnerPromise, 'Calling the onlyOwner function failed');
			const callonlyOwnerResult = await callOnlyOwnerPromise;
			const decodedData = await callonlyOwnerResult.decode('bool')

			assert.equal(decodedData.value, 1, 'The owner is different from the caller')
		})

		it('should return true if the caller is the owner, check funtion', async () => {

			const callIsOwnerPromise = deployedContract.call('isOwner', {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(callIsOwnerPromise, 'Calling the onlyOwner function failed');
			const callIsOwnerResult = await callIsOwnerPromise;
			const decodedData = await callIsOwnerResult.decode('bool')

			assert.equal(decodedData.value, 1, 'The owner is different from the caller')
		})

		it('should change the owner to #0 address', async () => {

			const callRenounceOwnershipPromise = deployedContract.call('renounceOwnership', {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(callRenounceOwnershipPromise, 'Calling the renounce ownerhip function failed');
			const callRenounceOwnerhipResult = await callRenounceOwnershipPromise;

			const decodedData = await callRenounceOwnerhipResult.decode('address')
			assert.equal(decodedData.value, 0, 'The owner is different from the caller')

		})

		it('should transfer ownership of the contract', async () => {

			const callTransferOwnerhipPromise = deployedContract.call('transferOwnership', {
				args: `(${config.notOwnerPubKeyHex})`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			})
			assert.isFulfilled(callTransferOwnerhipPromise, 'Calling transfer ownerhip function failed');
			await callTransferOwnerhipPromise;

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.notOwnerKeyPair.publicKey))
		})

		it('should throw if not owner call function onlyOwner', async () => {
			const unauthorizedOnlyOwnerPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "onlyOwner", {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			})

			assert.isRejected(unauthorizedOnlyOwnerPromise, 'bad_call_data');

		})

		it('should throw if not owner tries to renounce ownership', async () => {
			const unauthorizedRenounceOwnershipPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "renounceOwnership", {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			})

			assert.isRejected(unauthorizedRenounceOwnershipPromise, 'bad_call_data')


			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.ownerKeyPair.publicKey))

		})

		it('should throw if not owner tries to change the ownership of the contract', async () => {
			const unauthorizedTransferOwwnerhipPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferOwnership", {
				args: `(${config.notOwnerPubKeyHex})`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			})

			assert.isRejected(unauthorizedTransferOwwnerhipPromise, 'bad_call_data')
			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.ownerKeyPair.publicKey))
		})
	})




})