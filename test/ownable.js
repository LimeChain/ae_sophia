const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const AeSDK = require('@aeternity/aepp-sdk');
const bytes = require('@aeternity/aepp-sdk/es/utils/bytes');
const Universal = AeSDK.Universal;
const crypto = AeSDK.Crypto;

const utils = require('./utils');
const config = require('./config.json')
const sourceFile = './contracts/Ownable.aes';

describe('Ownable', () => {

	let firstClient;
	let secondClient;
	let ownableSource;


	before(async () => {

		firstClient = await Universal({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.ownerKeyPair,
			nativeMode: true,
			networkId: 'ae_devnet'
		});
		secondClient = await Universal({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.notOwnerKeyPair,
			nativeMode: true,
			networkId: 'ae_devnet'
		});

		firstClient.setKeypair(config.ownerKeyPair)
		await firstClient.spend(1, config.notOwnerKeyPair.publicKey)

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
					ttl: config.ttl
				},
				abi: "sophia"
			});
		})

		it('should set the proper owner to the smart contarct', async () => {

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});

			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;
			let encodedData = await callOwnerResult.decode('address')
			const ownerPublicKey = crypto.aeEncodeKey(bytes.toBytes(encodedData.value, true))

			assert.equal(ownerPublicKey, config.ownerKeyPair.publicKey)

		})

		it('should return true if owner calls onlyOwner', async () => {
			const callOnlyOwnerPromise = deployedContract.call('onlyOwner', {
				options: {
					ttl: config.ttl
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
					ttl: config.ttl
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
					ttl: config.ttl
				},
				abi: "sophia"
			});
			assert.isFulfilled(callRenounceOwnershipPromise, 'Calling the renounce ownerhip function failed');
			const callRenounceOwnerhipResult = await callRenounceOwnershipPromise;

			let encodedData = await callRenounceOwnerhipResult.decode('address')
			assert.equal(encodedData.value, 0, 'The owner is different from the caller')

		})

		it('should transfer ownership of the contract', async () => {

			const callTransferOwnerhipPromise = deployedContract.call('transferOwnership', {
				args: `(${config.notOwnerPubKeyHex})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			})
			assert.isFulfilled(callTransferOwnerhipPromise, 'Calling transfer ownerhip function failed');
			await callTransferOwnerhipPromise;

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;
			let encodedData = await callOwnerResult.decode('address')
			const ownerPublicKey = crypto.aeEncodeKey(bytes.toBytes(encodedData.value, true))

			assert.equal(ownerPublicKey, config.notOwnerKeyPair.publicKey)
		})

		it('should throw if not owner call function onlyOwner', async () => {
			const unauthorizedOnlyOwnerPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "onlyOwner", {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			})

			assert.isRejected(unauthorizedOnlyOwnerPromise, 'bad_call_data');

		})

		it('should throw if not owner tries to renounce ownership', async () => {
			const unauthorizedRenounceOwnershipPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "renounceOwnership", {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			})

			assert.isRejected(unauthorizedRenounceOwnershipPromise, 'bad_call_data')


			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;
			let encodedData = await callOwnerResult.decode('address')
			const ownerPublicKey = crypto.aeEncodeKey(bytes.toBytes(encodedData.value, true))

			assert.equal(ownerPublicKey, config.ownerKeyPair.publicKey)

		})

		it('should throw if not owner tries to change the ownership of the contract', async () => {
			const unauthorizedTransferOwwnerhipPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferOwnership", {
				args: `(${config.notOwnerPubKeyHex})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			})

			assert.isRejected(unauthorizedTransferOwwnerhipPromise, 'bad_call_data')
			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;
			let encodedData = await callOwnerResult.decode('address')
			const ownerPublicKey = crypto.aeEncodeKey(bytes.toBytes(encodedData.value, true))

			assert.equal(ownerPublicKey, config.ownerKeyPair.publicKey)
		})
	})

})