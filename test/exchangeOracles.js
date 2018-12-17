const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
const AeSDK = require('@aeternity/aepp-sdk');
const Deployer = require('aeproject').Deployer;
const utils = require('./utils');
const config = require('./config.json')
const oracleSourceFile = './contracts/exchange/ExchangeOracle.aes';
const marketSourceFile = './contracts/exchange/ExchangeMarket.aes';
const bytes = require('@aeternity/aepp-sdk/es/utils/bytes');
const BigNumber = require('bignumber.js');
const Universal = AeSDK.Universal;
const crypto = AeSDK.Crypto;
const assert = chai.assert;
chai.use(chaiAsPromised);
const ttl = 100
const qfee = 100
const _aePrice = 1000
const _tokenPrice = 1500
const _updatedAePrice = 2000
const _updatedTokenPrice = 2000
const _zeroPrice = 0


describe('ExchangeOracle', () => {

	let firstClient;
	let secondClient;
	let oracleSource;
	let marketSource;


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

		oracleSource = utils.readFileRelative(oracleSourceFile, config.filesEncoding);
		marketSource = utils.readFileRelative(marketSourceFile, config.filesEncoding);

	})

	it('deploying oracle successfully', async () => {
		//Arrange
		const compiledContract = await firstClient.contractCompile(oracleSource, {
			gas: config.gas
		})

		//Act
		const deployPromise = compiledContract.deploy({
			options: {
				ttl: config.ttl
			}
		});

		assert.isFulfilled(deployPromise, 'Could not deploy the ExchangeOracle Smart Contract');
		//Assert
		const deployedContract = await deployPromise;
		assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
	})

	it('deploying market successfully', async () => {
		//Arrange
		const compiledContract = await firstClient.contractCompile(marketSource, {
			gas: config.gas
		})

		//Act
		const deployPromise = compiledContract.deploy({
			initState: `("${_aePrice}", "${_tokenPrice}")`,
			options: {
				ttl: config.ttl
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
					ttl: config.ttl
				},
				abi: "sophia"
			});

			compiledMarketContract = await firstClient.contractCompile(marketSource, {
				gas: config.gas
			})

			deployedMarketContract = await compiledMarketContract.deploy({
				initState: `(${_aePrice}, ${_tokenPrice})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
		})

		it('should register an oracle successfully  ', async () => {

			const registerOraclePromise = deployedOracleContract.call('registerOracle', {
				args: `(${qfee}, ${ttl})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
			assert.isFulfilled(registerOraclePromise, 'Registering the oracle has failed');
			const registerOracleResult = await registerOraclePromise;

		})

		it.only('should make a query from the market ', async () => {
			let string = "aePrice"
			let maxGas = 2000000000

			const registerOraclePromise = deployedOracleContract.call('registerOracle', {
				args: `(${qfee}, ${ttl})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
			assert.isFulfilled(registerOraclePromise, 'Registering the oracle has failed');
			const registerOracleResult = await registerOraclePromise;
			let encodedData = await registerOracleResult.decode('int')

			const createQueryPromise = await deployedMarketContract.call('createQuery', {
				args: `(${encodedData.value}, "${string}", ${qfee}, ${ttl}, ${ttl} )`,
				options: {
					ttl: config.ttl,
					gas: maxGas,
					gasLimit: maxGas
				},
				abi: "sophia"
			});

			assert.isFulfilled(createQueryPromise, 'Registering the oracle has failed');

			const createQueryResult = await createQueryPromise;
			console.log(createQueryResult)

		})

		it("should get the query_fee", async () => {

			const registerOraclePromise = await deployedOracleContract.call('registerOracle', {
				args: `(${qfee}, ${ttl})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
			let encodedData = await registerOraclePromise.decode('int')

			const getQueryFeePromise = await deployedMarketContract.call('queryFee', {
				args: `(${encodedData.value})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});
			let decodedResult = await getQueryFeePromise.decode("int")
			assert.equal(decodedResult.value, qfee, "The query fee is not correct")
		})

		it("should update the ae price", async () => {


			const updatingAePricePromise = await deployedMarketContract.call('updateAePrice', {
				args: `(${_updatedAePrice})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});

			const getAePricePromise = await deployedMarketContract.call('getAePrice', {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});

			let finalAePrice = await getAePricePromise.decode("int")
			assert.equal(finalAePrice.value, _updatedAePrice, "Ae price was not updated properly")

		})

		it("should update the token price", async () => {


			const updatingTokenPricePromise = await deployedMarketContract.call('updateTokenPrice', {
				args: `(${_updatedTokenPrice})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});

			const getTokenPricePromise = await deployedMarketContract.call('getTokenPrice', {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});

			let finalTokenPrice = await getTokenPricePromise.decode("int")
			assert.equal(finalTokenPrice.value, _updatedTokenPrice, "Token price was not updated properly")

		})

		it("should throw if the new price is not greater than zero", async () => {


			const updatingAePricePromise = deployedMarketContract.call('updateAePrice', {
				args: `(${_zeroPrice})`,
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});

			console.log(updatingAePricePromise)

			const getAePricePromise = await deployedMarketContract.call('getAePrice', {
				options: {
					ttl: config.ttl
				},
				abi: "sophia"
			});

			let finalAePrice = await getAePricePromise.decode("int")
			assert.equal(finalAePrice.value, _aePrice, "Ae price was not updated properly")

		})

	})


})