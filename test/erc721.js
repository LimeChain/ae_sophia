const chai = require('chai');
const assert = chai.assert;
const readFileRelative = require('./utils').readFileRelative;
const writeFileRelative = require('./utils').writeFileRelative;

const AeSDK = require('@aeternity/aepp-sdk');
const Ae = AeSDK.Cli;

const keypair = {
	priv: 'caf71ac4b52d961ac4597bcd6f849ded73169ad8e50e8266be8db2793f5c93f9da91f82013b8f9bb9859fc9bb4d5c6e53154e380b2b776fe456f211abd99a927',
	pub: 'ak_2fG5mZP4raeJ2HDpZCwTfQY6PyqSLWdfLFhJkpbJpk3DuX4Qku'
} // Not sensitive data at all

const tokenName = "Lime Token";
const tokenSymbol = "NFT";
const gasUsed = 100000;

const firstTokenId = 1;
const secondTokenId = 2;
const thirdTokenId = 3;
const nonExistentTokenId = 123;
const pubKeyHex = "0xda91f82013b8f9bb9859fc9bb4d5c6e53154e380b2b776fe456f211abd99a927"

async function  init(){
	let nonce;
	let client = await Ae({
		url: 'https://sdk-edgenet.aepps.com',
		internalUrl: 'https://sdk-edgenet.aepps.com',
		keypair
	});

	try{
		const fileNonce = readFileRelative('nonce.txt', 'utf-8');
		nonce = parseInt(fileNonce.toString().trim())

		if(isNaN(nonce)){
			throw new Error("NaN")
		}
	} catch(e){
		const accInfo = await client.api.getAccountByPubkey(await client.address());
		nonce = parseInt(accInfo.nonce); // Until we fix the nonce issue, we should sometimes be upgrading the nonce ourselves
	}

	return { nonce, client}
}

describe('Deploy', () => {

	let client;
	let nonce;
    const source = readFileRelative('erc721.aes', 'utf-8');

	before(async () => {
		let inited = await init();
		client = inited.client;
		nonce = inited.nonce;
	})

	after(function() {
		writeFileRelative('nonce.txt', nonce, function(){})
	});

	beforeEach(() => {
		nonce++;
		console.log("Nonce: " + nonce);
	})

	it('contract successfully', async () => {
		//Arrange
		const compiledContract = await client.contractCompile(source, { gas: gasUsed })

		//Act
		const deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
        console.log(JSON.stringify(deployedContract.call))

	    //Assert
		assert.equal(keypair.pub, deployedContract.owner)
	})

	it('call contract read successfully', async () => {
		//Arrange
		const compiledContract = await client.contractCompile(source, { gas: gasUsed })
		const deployedContract = await compiledContract.deploy({ initState: '("Lime Token", "NFT")', options: { ttl: 500, gas: gasUsed, nonce } })
		nonce++;
		
		//Act
		const callNameResult = await deployedContract.call('name', { options: { ttl: 500, gas: gasUsed, nonce } });
		const decodedNameResult = await callNameResult.decode("string");
	    nonce++;
		const callSymbolResult = await deployedContract.call('symbol', { options: { ttl: 500, gas: gasUsed, nonce } });
        const decodedSymbolResult = await callSymbolResult.decode("string");
		
        //Assert
		assert.equal(decodedNameResult.value, tokenName)
		assert.equal(decodedSymbolResult.value, tokenSymbol)
	})
})

describe('Mint', () => {

    let client;
    let nonce;
    const source = readFileRelative('erc721.aes', 'utf-8');

    before(async () => {
        let inited = await init();
        client = inited.client;
        nonce = inited.nonce;
    })

    after(function () {
        writeFileRelative('nonce.txt', nonce, function () { })
    });

    beforeEach(() => {
        nonce++;
        console.log("Nonce: " + nonce);
    })

    it('should mint 1 token successfully', async () => {
        //Arrange
        const compiledContract = await client.contractCompile(source, { gas: gasUsed })
        const deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
        nonce++;
        console.log(deployedContract.call)
        //Act
//        const mintedResult = await deployedContract.call('mint', { args: '("0", "0xda91f82013b8f9bb9859fc9bb4d5c6e53154e380b2b776fe456f211abd99a927")', options: { ttl: 500, gas: gasUsed, nonce } });
//        console.log(mintedResult)
        //Assert
//        assert.equal(keypair.pub, deployedContract.owner)
    })
})