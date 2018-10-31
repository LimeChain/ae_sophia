const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const AeSDK = require('@aeternity/aepp-sdk');
const Ae = AeSDK.Cli;

const utils = require('./utils');

const config = {
	host: "http://localhost:3001/",
	internalHost: "http://localhost:3001/internal/",
	ownerKeyPair: {
		priv: 'bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
		pub: 'ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU'
	},
	notOwnerKeyPair: {
		priv: 'e37484af730bc798ac10fdce7523dc24a64182dfe88ff139f739c1c7f3475434df473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d',
		pub: 'ak_2hLLun8mZQvbEhaDxaWtJBsXLnhyokynwfMDZJ67TbqGoSCtQ9'
	},
	pubKeyHex: '0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
	notOwnerPubKeyHex: "0xdf473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d",
	filesEncoding: 'utf-8',
	nonceFile: 'nonce.txt',
	sourceFile: './contracts/Ownable.aes',
	gas: 100000,
	ttl: 500
}
let nonces;


describe('Ownable', () => {

	let firstClient;
	let secondClient;
	let ownableSource;


	before(async () => {

		firstClient = await Ae({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.ownerKeyPair
		});
		secondClient = await Ae({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.notOwnerKeyPair
		});
		if (utils.fileExists(config.nonceFile)) {
			const fileNonces = utils.readFileRelative(config.nonceFile, config.filesEncoding);
			nonces = JSON.parse(fileNonces.toString())
		} else {
			nonces = {
				first: 1,
				second: 1
			}
			const {
				tx
			} = await firstClient.api.postSpend({
				fee: 1,
				amount: 1,
				senderId: config.ownerKeyPair.pub,
				recipientId: config.notOwnerKeyPair.pub,
				payload: '',
				ttl: 555,
				nonce: nonces.first++
			})
			const signed = await firstClient.signTransaction(tx)

			await firstClient.api.postTransaction({
				tx: signed
			})
		}
		ownableSource = utils.readFileRelative(config.sourceFile, config.filesEncoding);
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
					nonce: nonces.first++
				}
			});

			assert.isFulfilled(deployPromise, 'Could not deploy the Ownable Smart Contract');
			//Assert
			const deployedContract = await deployPromise;
			assert.equal(config.ownerKeyPair.pub, deployedContract.owner)
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
					gas: config.gas,
					nonce: nonces.first++
				}
			});
		})

		it('should set the proper owner to the smart contarct', async () => {

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.first++
				}
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.ownerKeyPair.pub))

		})

		it('should return true if owner calls onlyOwner', async () => {
			const callOnlyOwnerPromise = deployedContract.call('onlyOwner', {
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.first++
				}
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
					gas: config.gas,
					nonce: nonces.first++
				}
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
					gas: config.gas,
					nonce: nonces.first++
				}
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
					gas: config.gas,
					nonce: nonces.first++
				}
			})
			assert.isFulfilled(callTransferOwnerhipPromise, 'Calling transfer ownerhip function failed');
			await callTransferOwnerhipPromise;

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.first++
				}
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.notOwnerKeyPair.pub))
		})

		it('should throw if not owner call function onlyOwner', async () => {
			const unauthorizedOnlyOwnerPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "onlyOwner", {
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.second++
				}
			})

			assert.isRejected(unauthorizedOnlyOwnerPromise, 'Calling the onlyOwner function failed');

		})

		it('should throw if not owner tries to renounce ownership', async () => {
			const unauthorizedRenounceOwnershipPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "renounceOwnership", {
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.second++
				}
			})

			assert.isRejected(unauthorizedRenounceOwnershipPromise, 'Calling the renounce ownership function failed');

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.first++
				}
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.ownerKeyPair.pub))

		})

		it('should throw if not owner tries to change the ownership of the contract', async () => {
			const unauthorizedTransferOwwnerhipPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferOwnership", {
				args: `(${config.notOwnerPubKeyHex})`,
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.second++
				}
			})
			assert.isRejected(unauthorizedTransferOwwnerhipPromise, 'Calling the trasnfer ownership function failed');

			const callOwnerPromise = deployedContract.call('owner', {
				options: {
					ttl: config.ttl,
					gas: config.gas,
					nonce: nonces.first++
				}
			});
			assert.isFulfilled(callOwnerPromise, 'Calling the owner function failed');
			const callOwnerResult = await callOwnerPromise;

			assert.equal(utils.trimAdresseses(callOwnerResult.result.returnValue), utils.trimAdresseses(config.ownerKeyPair.pub))
		})
	})



	after(function () {
		utils.writeFileRelative('nonce.txt', JSON.stringify(nonces))
	});

})