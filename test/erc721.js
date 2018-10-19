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
	notOwnerKeyPair: {
		priv: 'e37484af730bc798ac10fdce7523dc24a64182dfe88ff139f739c1c7f3475434df473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d',
		pub: 'ak_2hLLun8mZQvbEhaDxaWtJBsXLnhyokynwfMDZJ67TbqGoSCtQ9'
	},
	notOwnerPubKeyHex: "0xdf473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d",
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
	let nonces;
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
			const fileNonces = readFileRelative(config.nonceFile, config.filesEncoding);
			nonces = JSON.parse(fileNonces.toString())
		} else {
			nonces = {
				first: 1,
				second: 1
			}

			const { tx } = await firstClient.api.postSpend({
				fee: 1,
				amount: 1111111,
				senderId: config.ownerKeyPair.pub,
				recipientId: config.notOwnerKeyPair.pub,
				payload: '',
				ttl: 555,
				nonce: nonces.first++
			})
			const signed = await firstClient.signTransaction(tx)
			await firstClient.api.postTransaction({ tx: signed })

		}

		console.log("Test suit starting with nonces", nonces.first, nonces.second);

		erc721Source = utils.readFileRelative(config.sourceFile, config.filesEncoding);
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			//Arrange
			const compiledContract = await firstClient.contractCompile(erc721Source, { gas: config.gas })

			//Act
			const deployPromise = compiledContract.deploy({ initState: `("${tokenName}", "${tokenSymbol}")`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
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

			deployedContract = await compiledContract.deploy({ initState: `("${tokenName}", "${tokenSymbol}")`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
		})

		describe('Read', () => {
			it('call contract read successfully', async () => {
				//Arrange

				//Act
				const callNamePromise = deployedContract.call('name', { options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(callNamePromise, 'Could call the name of the token');
				const callNameResult = await callNamePromise;

				const callSymbolPromise = deployedContract.call('symbol', { options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(callSymbolPromise, 'Could call the symbol of the token');
				const callSymbolResult = await callSymbolPromise;

				//Assert
				const decodedNameResult = await callNameResult.decode("string");
				const decodedSymbolResult = await callSymbolResult.decode("string");

				assert.equal(decodedNameResult.value, tokenName)
				assert.equal(decodedSymbolResult.value, tokenSymbol)
			})
		})

		describe('Mint', () => {
			it('should mint 1 token successfully', async () => {
				//Arrange
				const expectedBalance = 1;

				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				assert.isFulfilled(deployContractPromise, "Couldn't mint token");
				await deployContractPromise;

				//Act
				const ownerOfPromise = deployedContract.call('ownerOf', { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
				const ownerOfResult = await ownerOfPromise;

				const balanceOfPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(balanceOfPromise, 'Could not call balanceOf');
				const balanceOfResult = await balanceOfPromise;

				//Assert
				const decodedOwnerOfResult = await ownerOfResult.result.returnValue.toLowerCase()
				const decodedBalanceOfResult = await balanceOfResult.decode("int");

				assert.equal(decodedOwnerOfResult, config.pubKeyHex)
				assert.equal(decodedBalanceOfResult.value, expectedBalance)
			})

			it('should not mint from non-owner', async () => {
				const unauthorisedPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "mint", { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.second++ } })
				assert.isRejected(unauthorisedPromise, 'Invocation failed');
			})

			it('should not mint token with id that already exist', async () => {
				//Arrange
				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				assert.isFulfilled(deployContractPromise, 'Could not call balanceOf');
				await deployContractPromise;

				//Act
				const secondDeployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				
				//Assert
				assert.isRejected(secondDeployContractPromise, 'Invocation');
			})
		})

		describe('Burn', () => {
			it('should burn token successfully', async () => {
				//Arrange
				const expectedBalance = 0;
				
				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				assert.isFulfilled(deployContractPromise, "Couldn't mint token");
				await deployContractPromise;

				//Act
				const ownerOfPromise = deployedContract.call('burn', { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
				const ownerOfResult = await ownerOfPromise;

				const balanceOfPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(balanceOfPromise, 'Could not call balanceOf');
				const balanceOfResult = await balanceOfPromise;

				//Assert
				const decodedBalanceOfResult = await balanceOfResult.decode("int");
				assert.equal(decodedBalanceOfResult.value, expectedBalance)
			})

			it('shouldn`t burn token from non-owner', async () => {
				//Arrange
				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				assert.isFulfilled(deployContractPromise, "Couldn't mint token");
				await deployContractPromise;

				//Act
				const unauthorizedBurnPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "burn", { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.second++ } })

				//Assert
				assert.isRejected(unauthorizedBurnPromise, 'Invocation failed');
			})
		})

		describe('Transfer', () => {
			it('should transfer token successfully', async () => {
				//Arrange
				const expectedBalanceOfNotOwner = 1;
				const expectedBalanceOfOwner = 0;
				
				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				assert.isFulfilled(deployContractPromise, "Couldn't mint token");
				await deployContractPromise;

				//Act
				const setApprovalForAllPromise = deployedContract.call('setApprovalForAll', { args: `(${config.pubKeyHex},${true})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(setApprovalForAllPromise, 'Could not call setApprovalForAll');
				const setApprovalForAllResult = await setApprovalForAllPromise;

				const approvePromise = deployedContract.call('approve', { args: `(${firstTokenId}, ${config.notOwnerPubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(approvePromise, 'Could not call approve');
				const approveResult = await approvePromise;

				const transferFromPromise = deployedContract.call('transferFrom', { args: `(${config.pubKeyHex}, ${config.notOwnerPubKeyHex}, ${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(transferFromPromise, 'Could not call transferFrom');
				const transferFromResult = await transferFromPromise;

				const balanceOfNotOwnerPromise = deployedContract.call('balanceOf', { args: `(${config.notOwnerPubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(balanceOfNotOwnerPromise, 'Could not call balanceOf');
				const balanceOfNotOwnerResult = await balanceOfNotOwnerPromise;

				const balanceOwnerPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(balanceOwnerPromise, 'Could not call balanceOf');
				const balanceOfOwnerResult = await balanceOwnerPromise;

				const ownerOfPromise = deployedContract.call('ownerOf', { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } });
				assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
				const ownerOfResult = await ownerOfPromise;

				//Assert
				const decodedBalanceOfNotOwnerResult = await balanceOfNotOwnerResult.decode("int");
				const decodedBalanceOfOwnerResult = await balanceOfOwnerResult.decode("int");
				const decodedOwnerOfResult = ownerOfResult.result.returnValue.toLowerCase()

				assert.equal(decodedBalanceOfNotOwnerResult.value, expectedBalanceOfNotOwner)
				assert.equal(decodedBalanceOfOwnerResult.value, expectedBalanceOfOwner)
				assert.equal(decodedOwnerOfResult, config.notOwnerPubKeyHex)
			})

			it('non-owner of token shouldn`t be able to call approve', async () => {
				//Arrange
				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				assert.isFulfilled(deployContractPromise, "Couldn't mint token");
				await deployContractPromise;

				//Act
				const unauthorizedApprovePromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "approve", { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.second++ } })

				//Assert
				assert.isRejected(unauthorizedApprovePromise, 'Invocation failed');
			})

			it('non-owner of token shouldn`t be able to call transferFrom', async () => {
				//Arrange
				const deployContractPromise = deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.first++ } })
				assert.isFulfilled(deployContractPromise, "Couldn't mint token");
				await deployContractPromise;

				//Act
				const unauthorizedTransferPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferFrom", { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce: nonces.second++ } })

				//Assert
				assert.isRejected(unauthorizedTransferPromise, 'Non-owner was able to transferFrom');
			})
		})
	})

	after(function () {
		writeFileRelative('nonce.txt', JSON.stringify(nonces))
	});
})