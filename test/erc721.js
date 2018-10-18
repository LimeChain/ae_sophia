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
const firstTokenId = 0;
const secondTokenId = 1;
const thirdTokenId = 2;
const nonExistentTokenId = 123;
const pubKeyHex = "0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca"
const host = "http://localhost:3001/";
const internalHost = "http://localhost:3001/internal/";
const source = readFileRelative('erc721_full.aes', 'utf-8');

describe('ERC721', () => {

	let client;
	let nonce;

	before(async () => {
		nonce;
		client = await Ae({
			url: host,
			internalUrl: internalHost,
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

	describe('Deploy', () => {
		it('contract successfully', async () => {
			let deployedContract;
			try{
				const compiledContract = await client.contractCompile(source, { gas: gasUsed })
				deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce }})
				nonce++
			}catch(e){
				console.log(e)
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
				let deployedContract = await compiledContract.deploy({ initState: `("${tokenName}", "${tokenSymbol}")`, options: { ttl: 500, gas: gasUsed, nonce } })
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
		it('should mint 1 token successfully', async () => {
			const compiledContract = await client.contractCompile(source, { gas: gasUsed })
			let deployedContract;
			let decodedOwnerOfResult;
			let decodedBalanceOfResult;
			let expectedBalance = 1;
	
			try{
				deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
				nonce++;
			
				let mintedResult = await deployedContract.call('mint', { args: `(${firstTokenId}, ${pubKeyHex})`, options: { ttl: 500, gas: gasUsed, nonce} });
				nonce++
				
				let ownerOfResult = await deployedContract.call('ownerOf', { args: `(${firstTokenId})`, options: { ttl: 500, gas: gasUsed, nonce} });
				nonce++
				decodedOwnerOfResult = await ownerOfResult.result.returnValue.toLowerCase()
	
				let balanceOfResult = await deployedContract.call('balanceOf', { args: `(${pubKeyHex})`, options: { ttl: 500, gas: gasUsed, nonce} });
				nonce++
				decodedBalanceOfResult = await balanceOfResult.decode("int");
				
			}catch(e){
				console.log(e)
				assert.isFalse(true);
				return;
			}
	
			assert.equal(decodedOwnerOfResult, pubKeyHex)
			assert.equal(decodedBalanceOfResult.value, expectedBalance)
		})
	})

	after(function() {
		writeFileRelative('nonce.txt', nonce, function(){})
	});
})



