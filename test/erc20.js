const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const readFileRelative = require('./utils').readFileRelative;
const writeFileRelative = require('./utils').writeFileRelative;
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./config.json")
const gasUsed = 100000;
const disc = 100000;

const sourceFile =  "./contracts/erc20/erc20.aes"

describe('ERC20', () => {

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
			const compiledContract = await firstClient.contractCompile(erc20Source, { gas: config.gas })

			//Act
			const deployPromise = compiledContract.deploy({options: { ttl: config.ttl, gas: config.gas}, abi: "sophia"});
			assert.isFulfilled(deployPromise, 'Could not deploy the erc20');

			//Assert
			const deployedContract = await deployPromise;
			assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
		})

	})

	describe('Interact with contract', () => {
		let deployedContract;
		let compiledContract;

		beforeEach(async () => {
			compiledContract = await firstClient.contractCompile(erc20Source, { gas: config.gas })
			deployedContract = await compiledContract.deploy({options: { ttl: config.ttl, gas: config.gas}, abi: "sophia"});
		})

		describe('Contract functionality', () => {
			beforeEach(async () => {
				const mintPromise = deployedContract.call('mint', { args: `(${config.pubKeyHex}, 1000)`, options: { ttl: config.ttl, gas: config.gas }, abi: "sophia"})
				assert.isFulfilled(mintPromise, "Couldn't mint token");
				await mintPromise;
			})

			describe('Mint', () => {
				it('should mint 1000 token successfully', async () => {
					//Arrange
					const expectedBalance = 1000;

					//Act
					const balanceOfPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(balanceOfPromise, 'Could not call balanceOf');
					const balanceOfResult = await balanceOfPromise;
	
					//Assert
					const decodedBalanceOfResult = await balanceOfResult.decode("int");
					assert.equal(decodedBalanceOfResult.value, expectedBalance)
				})
	
				it('should not mint from non-owner', async () => {
					const unauthorisedPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "mint", { args: `(${config.pubKeyHex}, 123)`, options: { ttl: config.ttl, gas: config.gas } })
					assert.isRejected(unauthorisedPromise, 'Unauthorized mint call');
				})

				it('should increase total supply on mint', async () => {
					//Arrange
					const expectedTotalSupply = 1003;

					//Act
					//1000 tokens are already minted
					const deployContractPromise1 = deployedContract.call('mint', { args: `(${config.pubKeyHex}, 1)`, options: { ttl: config.ttl, gas: config.gas }, abi: "sophia"})
					assert.isFulfilled(deployContractPromise1, "Couldn't mint token");
					await deployContractPromise1;

					const deployContractPromise2 = deployedContract.call('mint', { args: `(${config.pubKeyHex}, 1)`, options: { ttl: config.ttl, gas: config.gas }, abi: "sophia"})
					assert.isFulfilled(deployContractPromise2, "Couldn't mint token");
					await deployContractPromise2;

					const deployContractPromise3 = deployedContract.call('mint', { args: `(${config.pubKeyHex}, 1)`, options: { ttl: config.ttl, gas: config.gas }, abi: "sophia"})
					await deployContractPromise3;
					assert.isFulfilled(deployContractPromise3, "Couldn't mint token");
					
					const totalSupplyPromise = deployedContract.call('totalSupply', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(totalSupplyPromise, 'Could not call totalSupply');
					const totalSupplyResult = await totalSupplyPromise;
				
					//Assert
					const totalSupplyResultDecoded = await totalSupplyResult.decode("int");
					assert.equal(totalSupplyResultDecoded.value, expectedTotalSupply)
				})

			})
	
			describe('Burn', () => {
				it('should burn token successfully', async () => {
					//Arrange
					const expectedBalance = 900;
					const burnAmount = 100;
	
					//Act
					const ownerOfPromise = deployedContract.call('burn', { args: `(${burnAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
					const ownerOfResult = await ownerOfPromise;
					
					const balanceOfPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(balanceOfPromise, 'Could not call balanceOf');
					const balanceOfResult = await balanceOfPromise;
					
					//Assert
					const decodedBalanceOfResult = await balanceOfResult.decode("int");
					assert.equal(decodedBalanceOfResult.value, expectedBalance)
				})
	
				it('shouldn`t burn token from non-owner', async () => {
					//Arrange
					const burnAmount = 100;
	
					//Act
					const unauthorizedBurnPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "burn", { args: `(${burnAmount})`, options: { ttl: config.ttl, gas: config.gas } })
	
					//Assert
					assert.isRejected(unauthorizedBurnPromise, 'bad_call_data');
				})

				it('should decrease total supply on burn', async () => {
					//Arrange
					const expectedTotalSupply = 900;
					const burnAmount = 50;
	
					//Act
					const ownerOfPromise1 = deployedContract.call('burn', { args: `(${burnAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(ownerOfPromise1, 'Could not call ownerOf');
					const ownerOfResult1 = await ownerOfPromise1;

					const ownerOfPromise2 = deployedContract.call('burn', { args: `(${burnAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(ownerOfPromise2, 'Could not call ownerOf');
					const ownerOfResult2 = await ownerOfPromise2;
	
					const balanceOfPromise = deployedContract.call('totalSupply', { options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(balanceOfPromise, 'Could not call balanceOf');
					const balanceOfResult = await balanceOfPromise;

					//Assert
					const decodedBalanceOfResult = await balanceOfResult.decode("int");
					assert.equal(decodedBalanceOfResult.value, expectedTotalSupply)
				})
			})
	
			describe('Transfer', () => {
				it('should transfer token successfully', async () => {
					//Arrange
					const expectedBalanceOfNotOwner = 10;
					const expectedBalanceOfOwner = 990;
					const transferAmount = 10;
					
					//Act
					const approvePromise = deployedContract.call('approve', { args: `(${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(approvePromise, 'Could not call approve');
					const approveResult = await approvePromise;

					const transferFromPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferFrom", { args: `(${config.pubKeyHex}, ${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } })
					assert.isFulfilled(transferFromPromise, 'Could not call transferFrom');
					const transferFromResult = await transferFromPromise;
					
					const balanceOfNotOwnerPromise = deployedContract.call('balanceOf', { args: `(${config.notOwnerPubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(balanceOfNotOwnerPromise, 'Could not call balanceOf');
					const balanceOfNotOwnerResult = await balanceOfNotOwnerPromise;
	
					const balanceOwnerPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(balanceOwnerPromise, 'Could not call balanceOf');
					const balanceOfOwnerResult = await balanceOwnerPromise;
	
					//Assert
					const decodedBalanceOfNotOwnerResult = await balanceOfNotOwnerResult.decode("int");
					const decodedBalanceOfOwnerResult = await balanceOfOwnerResult.decode("int");
	
					assert.equal(decodedBalanceOfNotOwnerResult.value, expectedBalanceOfNotOwner)
					assert.equal(decodedBalanceOfOwnerResult.value, expectedBalanceOfOwner)
				})

				it('shouldn`t transfer token without appove', async () => {
					//Arrange
					const expectedBalanceOfNotOwner = 0;
					const expectedBalanceOfOwner = 1000;
					const transferAmount = 123;

					//Act
					const transferFromPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferFrom", { args: `(${config.pubKeyHex}, ${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } })
					assert.isRejected(transferFromPromise, 'Invocation failed');

					const balanceOfNotOwnerPromise = deployedContract.call('balanceOf', { args: `(${config.notOwnerPubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(balanceOfNotOwnerPromise, 'Could not call balanceOf');
					const balanceOfNotOwnerResult = await balanceOfNotOwnerPromise;
	
					const balanceOwnerPromise = deployedContract.call('balanceOf', { args: `(${config.pubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(balanceOwnerPromise, 'Could not call balanceOf');
					const balanceOfOwnerResult = await balanceOwnerPromise;
	
					//Assert
					const decodedBalanceOfNotOwnerResult = await balanceOfNotOwnerResult.decode("int");
					const decodedBalanceOfOwnerResult = await balanceOfOwnerResult.decode("int");
	
					assert.equal(decodedBalanceOfNotOwnerResult.value, expectedBalanceOfNotOwner)
					assert.equal(decodedBalanceOfOwnerResult.value, expectedBalanceOfOwner)
				})
			})

			describe('Transfer', () => {
				it('should increase allowance successfully', async () => {
					//Arrange
					const expectedAllowance= 20;
					const transferAmount = 10;
					
					//Act
					const approvePromise = deployedContract.call('approve', { args: `(${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(approvePromise, 'Could not call approve');
					const approveResult = await approvePromise;

					const increaseAllowancePromise = deployedContract.call('increaseAllowance', { args: `(${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(increaseAllowancePromise, 'Could not call approve');
					const increaseAllowanceResult = await increaseAllowancePromise;

					const allowancePromise = deployedContract.call('allowance', { args: `(${config.pubKeyHex}, ${config.notOwnerPubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(allowancePromise, 'Could not call approve');
					const allowancePromiseResult = await allowancePromise;
	
					//Assert
					const allowanceResult = await allowancePromiseResult.decode("int");
	
					assert.equal(allowanceResult.value, expectedAllowance)
				})

				it('should deccrease allowance successfully', async () => {
					//Arrange
					const expectedAllowance= 9;
					const transferAmount = 10;
					const decreaseAmount = 1;
					
					//Act
					const approvePromise = deployedContract.call('approve', { args: `(${config.notOwnerPubKeyHex}, ${transferAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(approvePromise, 'Could not call approve');
					const approveResult = await approvePromise;

					const decreaseAllowancePromise = deployedContract.call('decreaseAllowance', { args: `(${config.notOwnerPubKeyHex}, ${decreaseAmount})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(decreaseAllowancePromise, 'Could not call approve');
					const decreaseAllowanceResult = await decreaseAllowancePromise;

					const allowancePromise = deployedContract.call('allowance', { args: `(${config.pubKeyHex}, ${config.notOwnerPubKeyHex})`, options: { ttl: config.ttl, gas: config.gas } });
					assert.isFulfilled(allowancePromise, 'Could not call approve');
					const allowancePromiseResult = await allowancePromise;
	
					//Assert
					const allowanceResult = await allowancePromiseResult.decode("int");
	
					assert.equal(allowanceResult.value, expectedAllowance)
				})
			})
		})
	})
})