const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./config.json")
const sourceFile = "./contracts/erc20/erc20_capped.aes"

describe('ERC20 Capped', () => {

	let firstClient;
	let secondClient;
	let erc20Source;

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

		erc20Source = utils.readFileRelative(sourceFile, config.filesEncoding);
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			//Arrange
			const cap = 100;
			const compiledContract = await firstClient.contractCompile(erc20Source, {})

			//Act
			const deployPromise = compiledContract.deploy({
				initState: `(${cap})`,
				options: {
					ttl: config.ttl,
				},
				abi: "sophia"
			});
			assert.isFulfilled(deployPromise, 'Could not deploy the erc20');
			const deployedContract = await deployPromise;

			const capPromise = deployedContract.call('cap', {
				options: {
					ttl: config.ttl,
				}
			});
			assert.isFulfilled(capPromise, 'Could not call cap');
			const capPromiseResult = await capPromise;

			//Assert
			const decodedCapPromiseResult = await capPromiseResult.decode("int");

			assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
			assert.equal(decodedCapPromiseResult.value, cap)

		})
	})

	describe('Contract functionality', () => {

		it('shoulnd`t mint over cap limit', async () => {
			//Arrange
			const cap = 100;
			const compiledContract = await firstClient.contractCompile(erc20Source, {})

			//Act
			const deployPromise = compiledContract.deploy({
				initState: `(${cap})`,
				options: {
					ttl: config.ttl,
				},
				abi: "sophia"
			});
			assert.isFulfilled(deployPromise, 'Could not deploy the erc20');
			const deployedContract = await deployPromise;

			const mintPromise = deployedContract.call('mint', {
				args: `(${config.pubKeyHex}, 1000)`,
				options: {
					ttl: config.ttl,
				},
				abi: "sophia"
			})

			//Assert
			assert.isRejected(mintPromise, 'Invalid approve call');
		})
	})
})