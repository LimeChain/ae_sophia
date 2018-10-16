const chai = require('chai');
const assert = chai.assert;
const readFileRelative = require('./utils').readFileRelative;

const AeSDK = require('@aeternity/aepp-sdk');
const Ae = AeSDK.Cli;

const keypair = {
	priv: 'caf71ac4b52d961ac4597bcd6f849ded73169ad8e50e8266be8db2793f5c93f9da91f82013b8f9bb9859fc9bb4d5c6e53154e380b2b776fe456f211abd99a927',
	pub: 'ak_2fG5mZP4raeJ2HDpZCwTfQY6PyqSLWdfLFhJkpbJpk3DuX4Qku'
} // Not sensitive data at all



describe('ERC721', () => {

	let client;
	let nonce;

	const gasUsed = 100000;

	before(async () => {
		client = await Ae({
			url: 'https://sdk-edgenet.aepps.com',
			internalUrl: 'https://sdk-edgenet.aepps.com',
			keypair
		});

		const accInfo = await client.api.getAccountByPubkey(await client.address());
		nonce = accInfo.nonce; // Until we fix the nonce issue, we should sometimes be upgrading the nonce ourselves
	})

	beforeEach(() => {
		nonce++;
	})


	it('deploy contract', async () => {
		const source = readFileRelative('erc721.aes', 'utf-8');
		const compiledContract = await client.contractCompile(source, { gas: gasUsed })
		console.log(compiledContract);
		const deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
		console.log(deployedContract);
	})

	it('call contract read', async () => {
		const source = readFileRelative('erc721.aes', 'utf-8');
		const compiledContract = await client.contractCompile(source, { gas: gasUsed })
		const deployedContract = await compiledContract.deploy({ initState: undefined, options: { ttl: 500, gas: gasUsed, nonce } })
		nonce++;
		const callResult = await deployedContract.call('name', { options: { ttl: 500, gas: gasUsed, nonce } });
		console.log(callResult);
	})
})