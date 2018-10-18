const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const readFileRelative = require('./utils').readFileRelative;
const writeFileRelative = require('./utils').writeFileRelative;
const AeSDK = require('@aeternity/aepp-sdk');
const Ae = AeSDK.Cli;

const config = {
	host: "http://localhost:3001/",
	internalHost: "http://localhost:3001/internal/",
	ownerKeyPair: {
		priv: 'bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
		pub: 'ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU'
	},
	notOwnerKeyPair : {
		priv: 'e37484af730bc798ac10fdce7523dc24a64182dfe88ff139f739c1c7f3475434df473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d',
		pub: 'ak_2hLLun8mZQvbEhaDxaWtJBsXLnhyokynwfMDZJ67TbqGoSCtQ9'
	},
	notOwnerPubKeyHex : "0xdf473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d",
	pubKeyHex: '0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
	filesEncoding: 'utf-8',
	nonceFile: 'nonce.txt',
	sourceFile: 'erc721_full.aes',
	gas: 100000,
	ttl: 500
}

const tokenName = "Lime Token";
const tokenSymbol = "NFT";
const gasUsed = 100000;
const firstTokenId = 0;
const secondTokenId = 1;
const thirdTokenId = 2;
const nonExistentTokenId = 123;

describe('ERC721', () => {

	let firstClient;
	let secondClient;
	let nonce;
	let erc721Source;

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
			const fileNonce = readFileRelative(config.nonceFile, config.filesEncoding);
			nonce = parseInt(fileNonce.toString().trim())
		} else {
			const accInfo = await firstClient.api.getAccountByPubkey(await firstClient.address());
			nonce = parseInt(accInfo.nonce);
		}

		if (isNaN(nonce)) {
			throw new Error("NaN")
		}

		erc721Source = utils.readFileRelative(config.sourceFile, config.filesEncoding);
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			//Arrange
			const compiledContract = await firstClient.contractCompile(erc721Source, { gas: config.gas })

			//Act
			const deployPromise = compiledContract.deploy({ initState: `("${tokenName}", "${tokenSymbol}")`, options: { ttl: config.ttl, gas: config.gas, nonce } });
			nonce++;
			assert.isFulfilled(deployPromise, 'Could not deploy the erc721');
			
			//Assert
			const deployedContract = await deployPromise;
			assert.equal(config.ownerKeyPair.pub, deployedContract.owner)
		})

	})

	describe('Interact with contract', () => {
		let deployedContract;
		let compiledContract;

		beforeEach(async () => {
			compiledContract = await firstClient.contractCompile(erc721Source, { gas: config.gas })

			deployedContract = await compiledContract.deploy({ initState: `("${tokenName}", "${tokenSymbol}")`, options: { ttl: config.ttl, gas: config.gas, nonce } });

			nonce++;
		})

		describe('Read', () => {
			it('call contract read successfully', async () => {
				//Arrange

				//Act
				const callNamePromise = deployedContract.call('name', { options: { ttl: config.ttl, gas: config.gas, nonce } });
				nonce++;
				assert.isFulfilled(callNamePromise, 'Could call the name of the token');
				
				const callSymbolPromise = deployedContract.call('symbol', { options: { ttl: config.ttl, gas: config.gas, nonce } });
				nonce++;
				assert.isFulfilled(callSymbolPromise, 'Could call the symbol of the token');

				//Assert
				const callNameResult = await callNamePromise;
				const decodedNameResult = await callNameResult.decode("string");

				const callSymbolResult = await callSymbolPromise;
				const decodedSymbolResult = await callSymbolResult.decode("string");

				assert.equal(decodedNameResult.value, tokenName)
				assert.equal(decodedSymbolResult.value, tokenSymbol)
			})
		})

		describe('Mint', () => {
			it('should mint 1 token successfully', async () => {
				//Arrange
				const expectedBalance = 1;

				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce } })
				nonce++
				assert.isFulfilled(deployContractPromise);

				//Act
				const ownerOfPromise = deployedContract.call('ownerOf', { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce } });
				nonce++
				assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
				
				const balanceOfPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce } });
				nonce++;
				assert.isFulfilled(balanceOfPromise, 'Could not call ownerOf');

				//Assert
				const ownerOfResult = await ownerOfPromise;
				const decodedOwnerOfResult = await ownerOfResult.result.returnValue.toLowerCase()

				const balanceOfResult = await balanceOfPromise;
				const decodedBalanceOfResult = await balanceOfResult.decode("int");

				assert.equal(decodedOwnerOfResult, config.pubKeyHex)
				assert.equal(decodedBalanceOfResult.value, expectedBalance)
			})

			it.only('should mint 1 token successfully 123', async () => {
				//Arrange

				// const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce } })
				// nonce++
				// assert.isFulfilled(deployContractPromise);

				//Act
				// const balanceOfPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce } });
				// async function spendTx ({ senderId, recipientId, amount, fee, ttl, nonce, payload }) {
				// var  a = await firstClient.spendTx({senderId : config.ownerKeyPair.pub, recipientId : config.notOwnerKeyPair.pub, amount : 10000000, nonce, fee: 1, payload: ''})
				const { tx } = await firstClient.api.postSpend({
					fee: 1,
					amount: 1111111,
					senderId: config.ownerKeyPair.pub,
					recipientId: config.notOwnerKeyPair.pub,
					payload: '',
					ttl: 555
				  })
				  const signed = await firstClient.signTransaction(tx)
				  const { txHash } = await firstClient.api.postTransaction({ tx: signed })
				  nonce++;
				console.log(txHash)
				let result = await
					secondClient
					.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "mint", { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce : 1 } })
				nonce++;
				console.log(result)
				// const ownerOfPromise = deployedContract.call('ownerOf', { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce } });
				// nonce++
				// assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
			

				// //Assert
				// assert.equal(decodedBalanceOfResult.value, expectedBalance)
			})
		})
	})


	after(function () {
		writeFileRelative('nonce.txt', nonce)
	});
})