const chai = require('chai');
const assert = chai.assert;
const readFileRelative = require('./utils').readFileRelative;
const writeFileRelative = require('./utils').writeFileRelative;
const AeSDK = require('@aeternity/aepp-sdk');
const Ae = AeSDK.Cli;

const firstKeypair = {
	priv: 'bb9f0b01c8c9553cfbaf7ef81a50f977b1326801ebf7294d1c2cbccdedf27476e9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca',
	pub: 'ak_2mwRmUeYmfuW93ti9HMSUJzCk1EYcQEfikVSzgo6k2VghsWhgU'
} // Not sensitive data at all
const firstPubKeyHex = "0xe9bbf604e611b5460a3b3999e9771b6f60417d73ce7c5519e12f7e127a1225ca"

const secondKeypair = {
	priv: 'e37484af730bc798ac10fdce7523dc24a64182dfe88ff139f739c1c7f3475434df473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d',
	pub: 'ak_2hLLun8mZQvbEhaDxaWtJBsXLnhyokynwfMDZJ67TbqGoSCtQ9'
} // Not sensitive data at all
const secondPubKeyHex = "0xdf473b854e8d78394c20abfcb8fda9d0ed5dff8703d8668dccda9be157a60b6d"


const tokenName = "Lime Token";
const tokenSymbol = "NFT";
const gasUsed = 100000;
const firstTokenId = 0;
const secondTokenId = 1;
const thirdTokenId = 2;
const nonExistentTokenId = 123;
const host = "http://localhost:3001/";
const internalHost = "http://localhost:3001/internal/";
const source = readFileRelative('erc721_full.aes', 'utf-8');

describe('ERC721', () => {

	let firstClient;
	let secondClient;
	let nonce;

	before(async () => {
		firstClient = await Ae({
			url: host,
			internalUrl: internalHost,
			keypair: firstKeypair
		});

		secondClient = await Ae({
			url: host,
			internalUrl: internalHost,
			keypair: secondKeypair
		});
	
		try{
			const fileNonce = readFileRelative('nonce.txt', 'utf-8');
			console.log("File nonce: " + fileNonce)
			nonce = parseInt(fileNonce.toString().trim())
			if(isNaN(nonce)){
				throw new Error("NaN")
			}
		} catch(e){
			const accInfo = await firstClient.api.getAccountByPubkey(await firstClient.address());
			nonce = parseInt(accInfo.nonce); // Until we fix the nonce issue, we should sometimes be upgrading the nonce ourselves
			console.log("Node nonce: " + nonce) + 1
		}
	})

	describe('Deploy', () => {
		it('contract successfully', async () => {
			let deployedContract;
			try{
				const compiledContract = await firstClient.contractCompile(source, { gas: gasUsed })
				deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce }})
				nonce++
			}catch(e){
				console.log(e)
				assert.isFalse(true);
				return;
			}
	
			assert.equal(firstKeypair.pub, deployedContract.owner)
		})
	
		it('call contract read successfully', async () => {
			const compiledContract = await firstClient.contractCompile(source, { gas: gasUsed })
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
		it('should mint 1 token successfully to the owner', async () => {
			const compiledContract = await firstClient.contractCompile(source, { gas: gasUsed })
			let deployedContract;
			let decodedOwnerOfResult;
			let decodedBalanceOfResult;
			let expectedBalance = 1;
	
			try{
				deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
				nonce++;
			
				let mintedResult = await deployedContract.call('mint', { args: `(${firstTokenId}, ${firstPubKeyHex})`, options: { ttl: 500, gas: gasUsed, nonce} });
				nonce++
				
				let ownerOfResult = await deployedContract.call('ownerOf', { args: `(${firstTokenId})`, options: { ttl: 500, gas: gasUsed, nonce} });
				nonce++
				decodedOwnerOfResult = await ownerOfResult.result.returnValue.toLowerCase()
	
				let balanceOfResult = await deployedContract.call('balanceOf', { args: `(${firstPubKeyHex})`, options: { ttl: 500, gas: gasUsed, nonce} });
				nonce++
				decodedBalanceOfResult = await balanceOfResult.decode("int");
				
			}catch(e){
				console.log(e)
				assert.isFalse(true);
				return;
			}
	
			assert.equal(decodedOwnerOfResult, firstPubKeyHex)
			assert.equal(decodedBalanceOfResult.value, expectedBalance)
		})

		it('shouldn`t mint token to not owner', async () => {
			const compiledContract = await firstClient.contractCompile(source, { gas: gasUsed })
			let deployedContract;
			// let decodedOwnerOfResult;
			// let decodedBalanceOfResult;
			// let expectedBalance = 1;
	
			try{
				deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
				nonce++;
			
				assert.throws(async () =>{
					deployedContract.client = secondClient;
					let mintedResult = await deployedContract.call('mint', { args: `(${firstTokenId}, ${firstPubKeyHex})`, options: { ttl: 500, gas: gasUsed, nonce} });
				});      
				nonce++
				
			}catch(e){
				console.log(e)
				return;
			}
	
			// assert.equal(decodedOwnerOfResult, firstPubKeyHex)
			// assert.equal(decodedBalanceOfResult.value, expectedBalance)
		})
	})

	after(function() {
		writeFileRelative('nonce.txt', nonce, function(){})
	});
})