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

	let client;
	let nonce;
	let erc721Source;

	before(async () => {
		client = await Ae({
			url: config.host,
			internalUrl: config.internalHost,
			keypair: config.ownerKeyPair
		});

		if (utils.fileExists(config.nonceFile)) {
			const fileNonce = readFileRelative(config.nonceFile, config.filesEncoding);
			nonce = parseInt(fileNonce.toString().trim())
		} else {
			const accInfo = await client.api.getAccountByPubkey(await client.address());
			nonce = parseInt(accInfo.nonce);
		}

		if (isNaN(nonce)) {
			throw new Error("NaN")
		}

		erc721Source = utils.readFileRelative(config.sourceFile, config.filesEncoding);

	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			const compiledContract = await client.contractCompile(erc721Source, { gas: config.gas })
			const deployPromise = compiledContract.deploy({ initState: `("${tokenName}", "${tokenSymbol}")`, options: { ttl: config.ttl, gas: config.gas, nonce } });
			assert.isFulfilled(deployPromise, 'Could not deploy the erc721');
			const deployedContract = await deployPromise;
			nonce++;

			assert.equal(config.ownerKeyPair.pub, deployedContract.owner)
		})

	})

	describe('Interact with contract', () => {
		let deployedContract;

		beforeEach(async () => {
			const compiledContract = await client.contractCompile(erc721Source, { gas: config.gas })
			deployedContract = await compiledContract.deploy({ initState: `("${tokenName}", "${tokenSymbol}")`, options: { ttl: config.ttl, gas: config.gas, nonce } });

			nonce++;
		})

		describe('Read', () => {
			it('call contract read successfully', async () => {

				const callNamePromise = deployedContract.call('name', { options: { ttl: config.ttl, gas: config.gas, nonce } });
				assert.isFulfilled(callNamePromise, 'Could call the name of the token');
				const callNameResult = await callNamePromise;
				const decodedNameResult = await callNameResult.decode("string");
				assert.equal(decodedNameResult.value, tokenName)

				nonce++;

				const callSymbolPromise = deployedContract.call('symbol', { options: { ttl: config.ttl, gas: config.gas, nonce } });
				assert.isFulfilled(callSymbolPromise, 'Could call the symbol of the token');
				const callSymbolResult = await callSymbolPromise;

				nonce++;
				const decodedSymbolResult = await callSymbolResult.decode("string");

				assert.equal(decodedSymbolResult.value, tokenSymbol)
			})
		})

		describe('Mint', () => {
			it('should mint 1 token successfully', async () => {
				const expectedBalance = 1;

				assert.isFulfilled(deployedContract.call('mint', { args: `(${firstTokenId}, ${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce } }));
				nonce++

				const ownerOfPromise = deployedContract.call('ownerOf', { args: `(${firstTokenId})`, options: { ttl: config.ttl, gas: config.gas, nonce } });
				assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
				const ownerOfResult = await ownerOfPromise;
				nonce++

				const decodedOwnerOfResult = await ownerOfResult.result.returnValue.toLowerCase()
				assert.equal(decodedOwnerOfResult, config.pubKeyHex)

				const balanceOfPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas, nonce } });
				const balanceOfResult = await balanceOfPromise;
				nonce++;
				const decodedBalanceOfResult = await balanceOfResult.decode("int");

				assert.equal(decodedBalanceOfResult.value, expectedBalance)

			})
		})

	})


	after(function () {
		writeFileRelative('nonce.txt', nonce)
	});
})



