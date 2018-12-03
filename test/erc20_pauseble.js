const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./config.json")
const sourceFile =  "./contracts/erc20/erc20_pausable.aes"

describe('ERC20 Pauseable', () => {

	let firstClient;
	let secondClient;
	let erc20Source;

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

        const { tx } = await firstClient.api.postSpend({
            fee: 1,
            amount: 1111111,
            senderId: config.ownerKeyPair.publicKey,
            recipientId: config.notOwnerKeyPair.publicKey,
            payload: '',
            ttl: config.ttl
        })

        const signed = await firstClient.signTransaction(tx)
        await firstClient.api.postTransaction({ tx: signed })

		erc20Source = utils.readFileRelative(sourceFile, config.filesEncoding);
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			//Arrange
			const compiledContract = await firstClient.contractCompile(erc20Source, { gas: config.gas })

			//Act
			const deployPromise = compiledContract.deploy({options: { ttl: config.ttl, gas: config.gas}, abi: "sophia"});
			assert.isFulfilled(deployPromise, 'Could not deploy the erc20');

			//Assert
			const deployedContract = await deployPromise;
			assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
		})

	})

	describe('Interact with contract', () => {
		let deployedContract;
		let compiledContract;

		beforeEach(async () => {
			compiledContract = await firstClient.contractCompile(erc20Source, { gas: config.gas })
			deployedContract = await compiledContract.deploy({options: { ttl: config.ttl, gas: config.gas}, abi: "sophia"});
		})

		describe('Contract functionality', () => {
			beforeEach(async () => {
				const mintPromise = deployedContract.call('mint', { args: `(${config.pubKeyHex}, 1000)`, options: { ttl: config.ttl, gas: config.gas }, abi: "sophia"})
				assert.isFulfilled(mintPromise, "Couldn't mint token");
				await mintPromise;
			})

			describe('Pause', () => {
				it('should pause contract successfully', async () => {
					//Arrange
					const expectedValue = true;

					//Act
					const pausePromise = deployedContract.call('pause', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(pausePromise, 'Could not call pause');
					await pausePromise;

					const pausedPromise = deployedContract.call('paused', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(pausedPromise, 'Could not call pause');
					const pausedPromiseResult = await pausedPromise;

					//Assert
					const pausedResult = await pausedPromiseResult.decode("bool");
					assert.equal(pausedResult.value, expectedValue)
				})
	
				it('should not pause contract from non-owner', async () => {
					const unauthorisedPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "pause", {options: { ttl: config.ttl, gas: config.gas } })
					assert.isRejected(unauthorisedPromise, 'Unauthorized pause call');
				})

				it('shouldn`t mint when contract is paused', async () => {
					//Arrange

					//Act
					const pausePromise = deployedContract.call('pause', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(pausePromise, 'Could not call pause');
					await pausePromise;

					const mintPromise = deployedContract.call('mint', { args: `(${config.pubKeyHex}, 1)`, options: { ttl: config.ttl, gas: config.gas }, abi: "sophia"})

					//Assert
					assert.isRejected(mintPromise, 'Invalid mint call');
				})

				it('shouldn`t burn when contract is paused', async () => {
					//Arrange
					const burnAmount = 100;

					//Act
					const pausePromise = deployedContract.call('pause', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(pausePromise, 'Could not call pause');
					await pausePromise;

					const burnPromise = deployedContract.call('burn', { args: `(${burnAmount})`, options: { ttl: config.ttl, gas: config.gas }, abi: "sophia"})

					//Assert
					assert.isRejected(burnPromise, 'Invalid burn call');
				})

				it('shouldn`t approve when contract is paused', async () => {
					//Arrange
					const transferAmount = 10;

					//Act
					const pausePromise = deployedContract.call('pause', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(pausePromise, 'Could not call pause');
					await pausePromise;

					const approvePromise = deployedContract.call('approve', { args: `(${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } });

					//Assert
					assert.isRejected(approvePromise, 'Invalid approve call');
				})

				it('shouldn`t transfer when contract is paused with already approved coins', async () => {
					//Arrange
					const transferAmount = 10;

					//Act
					const approvePromise = deployedContract.call('approve', { args: `(${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(approvePromise, 'Could not call approve');
					const approveResult = await approvePromise;

					const pausePromise = deployedContract.call('pause', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(pausePromise, 'Could not call pause');
					await pausePromise;

					const transferFromPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferFrom", { args: `(${config.pubKeyHex}, ${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } })

					//Assert
					assert.isRejected(transferFromPromise, 'Invalid approve call');
				})
			})
		})
	})
})