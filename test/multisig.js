const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./config.json")
const sourceFile =  "./contracts/multisig/multisigwallet.aes"

describe('MultiSig', () => {

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
            amount: 1,
            senderId: config.ownerKeyPair.publicKey,
            recipientId: config.notOwnerKeyPair.publicKey,
            payload: '',
            ttl: config.ttl
        })

		const signed = await firstClient.signTransaction(tx)
		
        await firstClient.api.postTransaction({ tx: signed })

		multiSigSource = utils.readFileRelative(sourceFile, config.filesEncoding);
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
            //Arrange
			const compiledContract = await firstClient.contractCompile(multiSigSource)
            let value = 5
            
			//Act
			const deployPromise = compiledContract.deploy();
			assert.isFulfilled(deployPromise, 'Could not deploy the erc20');
			const deployedContract = await deployPromise;

            const capPromise = deployedContract.call('approve', { args: `${value}` });
            assert.isFulfilled(capPromise, 'Could not call cap');
            const capPromiseResult = await capPromise;
            
            //Assert
            const decodedCapPromiseResult = await capPromiseResult.decode("int");
		})
    })
})