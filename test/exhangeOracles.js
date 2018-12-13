const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const Deployer = require('aeproject').Deployer;
const utils = require('./utils');
const config = require('./config.json')
const oracleSourceFile = './contracts/exchange/ExchangeOracle.aes';
const marketSourceFile = './contracts/exchange/ExchangeMarket.aes';
const ttl = 100
const qfee = 100
const _aePrice = 1000
const _tokenPrice = 1500


describe('ExchangeOracle', () => {

	let firstClient;
	let secondClient;
	let oracleSource;
	let marketSource;


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

		oracleSource = utils.readFileRelative(oracleSourceFile, config.filesEncoding);
		marketSource = utils.readFileRelative(marketSourceFile, config.filesEncoding);

	})

	xit('deploying oracle successfully', async () => {
		//Arrange
		const compiledContract = await firstClient.contractCompile(oracleSource, {
			gas: config.gas
		})

		//Act
		const deployPromise = compiledContract.deploy({
			options: {
				ttl: config.ttl,
				gas: config.gas,
			}
		});

		assert.isFulfilled(deployPromise, 'Could not deploy the ExchangeOracle Smart Contract');
		//Assert
		const deployedContract = await deployPromise;
		assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
	})

	xit('deploying market successfully', async () => {
		//Arrange
		const compiledContract = await firstClient.contractCompile(marketSource, {
			gas: config.gas
		})

		//Act
		const deployPromise = compiledContract.deploy({
			initState: `("${aePrice}", "${tokenPrice}")`,
			options: {
				ttl: config.ttl,
				gas: config.gas,
			}
		});

		assert.isFulfilled(deployPromise, 'Could not deploy the ExchangeMarket Smart Contract');
		//Assert
		const deployedContract = await deployPromise;
		assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
	})


	describe('Oracle smart contract tests', () => {

		let deployedOracleContract;
		let compiledOracleContract;
		let deployedMarketContract;
		let compiledMarketContract;

		beforeEach(async () => {
			compiledOracleContract = await firstClient.contractCompile(oracleSource, {
				gas: config.gas
			})

			deployedOracleContract = await compiledOracleContract.deploy({
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});

			compiledMarketContract = await firstClient.contractCompile(marketSource, {
				gas: config.gas
			})

			deployedMarketContract = await compiledMarketContract.deploy({
				initState: `(${_aePrice}, ${_tokenPrice})`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
		})

		xit('should register an oracle successfully  ', async () => {

			const registerOraclePromise = deployedOracleContract.call('registerOracle', {
				args: `(${qfee}, ${ttl})`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(registerOraclePromise, 'Registering the oracle has failed');
			const registerOracleResult = await registerOraclePromise;

		})

		xit('should make a query from the market ', async () => {
			let oraclePublicKey = utils.trimAdresseses(deployedOracleContract.address)
			let fixedOraclePubKey = `ok_${oraclePublicKey}`
			let string = "aePrice"

			const registerOraclePromise = deployedOracleContract.call('registerOracle', {
				args: `(${qfee}, ${ttl})`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(registerOraclePromise, 'Registering the oracle has failed');
			const registerOracleResult = await registerOraclePromise;
			console.log(registerOracleResult)
			let qfeeee = 120
			let newTtl = 120
			const createQueryPromise = await deployedMarketContract.call('createQuery', {
				args: `("${fixedOraclePubKey}", "${string}", ${qfeeee}, ${newTtl}, ${newTtl} )`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});

			assert.isFulfilled(createQueryPromise, 'Registering the oracle has failed');

			const createQueryResult = await createQueryPromise;
			console.log(createQueryResult)

		})

		it("should get the query_fee", async () => {
			let oraclePublicKey = utils.trimAdresseses(deployedOracleContract.address)
			let fixedOraclePubKey = `ok_${oraclePublicKey}`
			let fee = 5
			let newTTl = 2000
			const registerOraclePromise = await deployedOracleContract.call('registerOracle', {
				args: `(${fee}, ${newTTl})`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			const getQueryFeePromise = await deployedMarketContract.call('queryFee', {
				args: `("${fixedOraclePubKey}")`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			console.log(getQueryFeePromise)
			let decodedResult = await getQueryFeePromise.decode("int")
			console.log(decodedResult)
			assert
		})
	})


})