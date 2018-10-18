const chai = require('chai');
const assert = chai.assert;
const readFileRelative = require('./utils').readFileRelative;
const writeFileRelative = require('./utils').writeFileRelative;

const AeSDK = require('@aeternity/aepp-sdk');
const Ae = AeSDK.Cli;

const keypair = {
	priv: 'bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
	pub: 'ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU'
} // Not sensitive data at all

const tokenName = "Lime Token";
const tokenSymbol = "NFT";
const gasUsed = 100000;

const firstTokenId = 1;
const secondTokenId = 2;
const thirdTokenId = 3;
const nonExistentTokenId = 123;
const pubKeyHex = "0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca"

// async function  init(){
// 	let nonce;
// 	let client = await Ae({
// 		url: 'https://sdk-edgenet.aepps.com',
// 		internalUrl: 'https://sdk-edgenet.aepps.com',
// 		keypair
// 	});

// 	try{
// 		const fileNonce = readFileRelative('nonce.txt', 'utf-8');
// 		console.log("File nonce: " + fileNonce)
// 		nonce = parseInt(fileNonce.toString().trim())
// 		if(isNaN(nonce)){
// 			throw new Error("NaN")
// 		}
// 	} catch(e){
// 		const accInfo = await client.api.getAccountByPubkey(await client.address());
// 		nonce = parseInt(accInfo.nonce); // Until we fix the nonce issue, we should sometimes be upgrading the nonce ourselves
// 	}

// 	return { nonce, client}
// }

describe('Deploy', () => {

	let client;
	let nonce;
    const source = readFileRelative('erc721_full.aes', 'utf-8');

	before(async () => {
		// let inited = await init();
		client = await Ae({
			url: 'https://sdk-edgenet.aepps.com',
			internalUrl: 'https://sdk-edgenet.aepps.com',
			keypair
		});
	
		try{
			const fileNonce = readFileRelative('nonce.txt', 'utf-8');
			console.log("File nonce: " + fileNonce)
			nonce = parseInt(fileNonce.toString().trim())
			if(isNaN(nonce)){
				throw new Error("NaN")
			}
		} catch(e){
			const accInfo = await client.api.getAccountByPubkey(await client.address());
			nonce = parseInt(accInfo.nonce) + 1; // Until we fix the nonce issue, we should sometimes be upgrading the nonce ourselves
			console.log("Node nonce: " + nonce)
		}

		// client = inited.client;
		// nonce = inited.nonce;
	})

	after(function() {
		writeFileRelative('nonce.txt', nonce, function(){})
	});

	// beforeEach(() => {
	// 	nonce++;
	// 	console.log("Nonce: " + nonce);
	// })

	it('contract successfully', async () => {
		let deployedContract;
		try{
			const compiledContract = await client.contractCompile(source, { gas: gasUsed })

			deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce }})
			nonce++
		}catch(e){
			assert.isFalse(true);
			return;
		}

		assert.equal(keypair.pub, deployedContract.owner)
	})

	it('call contract read successfully', async () => {
		const compiledContract = await client.contractCompile(source, { gas: gasUsed })
		let decodedNameResult;
		let decodedSymbolResult;

		try{
			let deployedContract = await compiledContract.deploy({ initState: `("Lime Token", "NFT")`, options: { ttl: 500, gas: gasUsed, nonce } })
			nonce++;
		
			let callNameResult = await deployedContract.call('name', { options: { ttl: 500, gas: gasUsed, nonce } });
			decodedNameResult = await callNameResult.decode("string");
			nonce++;
	
			let callSymbolResult = await deployedContract.call('symbol', { options: { ttl: 500, gas: gasUsed, nonce } });
			decodedSymbolResult = await callSymbolResult.decode("string");
			nonce++;
		}catch(e){
			assert.isFalse(true);
			return;
		}

		assert.equal(decodedNameResult.value, tokenName)
		assert.equal(decodedSymbolResult.value, tokenSymbol)
	})
})

describe('Mint', () => {

    let client;
	let nonce;
	let nonceCounter = 0;
    const source = readFileRelative('erc721_full.aes', 'utf-8');

    before(async () => {
        // let inited = await init();
        // client = inited.client;
		// nonce = inited.nonce;
		
		client = await Ae({
			url: 'https://sdk-edgenet.aepps.com',
			internalUrl: 'https://sdk-edgenet.aepps.com',
			keypair
		});
	
		try{
			const fileNonce = readFileRelative('nonce.txt', 'utf-8');
			console.log("File nonce: " + fileNonce)
			nonce = parseInt(fileNonce.toString().trim())
			if(isNaN(nonce)){
				throw new Error("NaN")
			}
		} catch(e){
			const accInfo = await client.api.getAccountByPubkey(await client.address());
			nonce = parseInt(accInfo.nonce); // Until we fix the nonce issue, we should sometimes be upgrading the nonce ourselves
			console.log("Node nonce: " + fileNonce) + 1
		}
    })

    after(function () {
        writeFileRelative('nonce.txt', nonce, function () { })
    });

    // beforeEach(() => {
    //     nonce++;
    //     console.log("Nonce: " + nonce);
    // })

    it('should mint 1 token successfully', async () => {
		const compiledContract = await client.contractCompile(source, { gas: gasUsed })
		let deployedContract;
		let decodedOwnerOfResult;
		let decodedBalanceOfResult;

		try{
			deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
			nonce++;
		
			let mintedResult = await deployedContract.call('mint', { args: `"0", "0x0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca"`, options: { ttl: 500, gas: gasUsed, nonce} });
			nonce++

			let ownerOfResult = await deployedContract.call('ownerOf', { args: `"0"`, options: { ttl: 500, gas: gasUsed, nonce} });
			nonce++
			console.log(ownerOfResult)
			// decodedOwnerOfResult = await ownerOfResult.decode()

			let balanceOfResult = await deployedContract.call('balanceOf', { args: `"0x0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca"`, options: { ttl: 500, gas: gasUsed, nonce} });
			nonce++
			console.log(balanceOfResult)
		}catch(e){
			console.log(e)
			assert.isFalse(true);
			return;
		}

		// console.log(await mintedResult.decode("ok"));
    })
})