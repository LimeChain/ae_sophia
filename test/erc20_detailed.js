const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./config.json")
const sourceFile =  "./contracts/erc20/erc20_detailed.aes"

describe('ERC20 Detailed', () => {

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
            const expectedName = "UnitTest"
            const expectedSymbol = "TT"
            const expectedDecimals = 18;
			const compiledContract = await firstClient.contractCompile(erc20Source, { gas: config.gas })

			//Act
			const deployPromise = compiledContract.deploy({initState: `("${expectedName}", "${expectedSymbol}", ${expectedDecimals})`, options: { ttl: config.ttl, gas: config.gas}, abi: "sophia"});
			assert.isFulfilled(deployPromise, 'Could not deploy the erc20');
			const deployedContract = await deployPromise;

            const namePromise = deployedContract.call('name', { options: { ttl: config.ttl, gas: config.gas } });
            assert.isFulfilled(namePromise, 'Could not call name');
            const namePromiseResult = await namePromise;

            const symbolPromise = deployedContract.call('symbol', { options: { ttl: config.ttl, gas: config.gas } });
            assert.isFulfilled(symbolPromise, 'Could not call symbol');
            const symbolPromiseResult = await symbolPromise;

            const decimalsPromise = deployedContract.call('decimals', { options: { ttl: config.ttl, gas: config.gas } });
            assert.isFulfilled(decimalsPromise, 'Could not call decimals');
            const decimalsPromiseResult = await decimalsPromise;
            
            //Assert
            const decodedNamePromiseResult = await namePromiseResult.decode("string");
            const decodedSymbolPromiseResult = await symbolPromiseResult.decode("string");
            const decodedDecimalsPromiseResult = await decimalsPromiseResult.decode("int");
            
            assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
            assert.equal(decodedNamePromiseResult.value, expectedName)
            assert.equal(decodedSymbolPromiseResult.value, expectedSymbol)
            assert.equal(decodedDecimalsPromiseResult.value, expectedDecimals)
		})
	})
})