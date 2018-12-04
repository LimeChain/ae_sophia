const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const AeSDK = require('@aeternity/aepp-sdk');
const Ae = AeSDK.Universal;
const config = require("./config.json")
const sourceFile = './contracts/erc721/erc721_full.aes';
const tokenName = "AE Token";
const tokenSymbol = "NFT";
const firstTokenId = 0;

describe('ERC721', () => {

	let firstClient;
	let secondClient;
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

		const {
			tx
		} = await firstClient.api.postSpend({
			fee: 1,
			amount: 1111111,
			senderId: config.ownerKeyPair.publicKey,
			recipientId: config.notOwnerKeyPair.publicKey,
			payload: '',
			ttl: config.ttl
		})

		const signed = await firstClient.signTransaction(tx)
		await firstClient.api.postTransaction({
			tx: signed
		})

		erc721Source = utils.readFileRelative(sourceFile, config.filesEncoding);
	})

	describe('Deploy contract', () => {

		it('deploying successfully', async () => {
			//Arrange
			const compiledContract = await firstClient.contractCompile(erc721Source, {
				gas: config.gas
			})

			//Act
			const deployPromise = compiledContract.deploy({
				initState: `("${tokenName}", "${tokenSymbol}")`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
			assert.isFulfilled(deployPromise, 'Could not deploy the erc721');

			//Assert
			const deployedContract = await deployPromise;
			
			assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
		})

	})

	describe('Interact with contract', () => {
		let deployedContract;
		let compiledContract;

		beforeEach(async () => {
			compiledContract = await firstClient.contractCompile(erc721Source, {
				gas: config.gas
			})
			deployedContract = await compiledContract.deploy({
				initState: `("${tokenName}", "${tokenSymbol}")`,
				options: {
					ttl: config.ttl,
					gas: config.gas
				},
				abi: "sophia"
			});
		})

		describe('Read', () => {
			it('call contract read successfully', async () => {
				//Arrange

				//Act
				const callNamePromise = deployedContract.call('name', {
					options: {
						ttl: config.ttl,
						gas: config.gas
					}
				});
				assert.isFulfilled(callNamePromise, 'Could call the name of the token');
				const callNameResult = await callNamePromise;

				const callSymbolPromise = deployedContract.call('symbol', {
					options: {
						ttl: config.ttl,
						gas: config.gas
					}
				});
				assert.isFulfilled(callSymbolPromise, 'Could call the symbol of the token');
				const callSymbolResult = await callSymbolPromise;

				//Assert
				const decodedNameResult = await callNameResult.decode("string");
				const decodedSymbolResult = await callSymbolResult.decode("string");

				assert.equal(decodedNameResult.value, tokenName)
				assert.equal(decodedSymbolResult.value, tokenSymbol)
			})
		})

		describe('Contract functionality', () => {
			beforeEach(async () => {
				const deployContractPromise = deployedContract.call('mint', {
					args: `(${firstTokenId}, ${config.pubKeyHex})`,
					options: {
						ttl: config.ttl,
						gas: config.gas
					},
					abi: "sophia"
				})
				assert.isFulfilled(deployContractPromise, "Couldn't mint token");
				await deployContractPromise;
			})

			describe('Mint', () => {
				it('should mint 1 token successfully', async () => {
					//Arrange
					const expectedBalance = 1;

					//Act
					const ownerOfPromise = deployedContract.call('ownerOf', {
						args: `(${firstTokenId})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
					const ownerOfResult = await ownerOfPromise;

					const balanceOfPromise = deployedContract.call('balanceOf', {
						args: `(${config.pubKeyHex})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(balanceOfPromise, 'Could not call balanceOf');
					const balanceOfResult = await balanceOfPromise;

					//Assert
					const decodedOwnerOfResult = await ownerOfResult.result.returnValue.toLowerCase()
					const decodedBalanceOfResult = await balanceOfResult.decode("int");

					assert.equal(decodedOwnerOfResult.split('_')[1], config.ownerKeyPair.publicKey.split('_')[1].toLocaleLowerCase())
					assert.equal(decodedBalanceOfResult.value, expectedBalance)
				})

				it('should not mint from non-owner', async () => {
					const unauthorisedPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "mint", {
						args: `(${firstTokenId}, ${config.pubKeyHex})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					})
					assert.isRejected(unauthorisedPromise, 'bad_call_data');
				})

				it('should not mint token with id that already exist', async () => {
					//Arrange

					//Act
					const secondDeployContractPromise = deployedContract.call('mint', {
						args: `(${firstTokenId}, ${config.pubKeyHex})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					})

					//Assert
					assert.isRejected(secondDeployContractPromise, 'bad_call_data');
				})
			})

			describe('Burn', () => {
				it('should burn token successfully', async () => {
					//Arrange
					const expectedBalance = 0;

					//Act
					const ownerOfPromise = deployedContract.call('burn', {
						args: `(${firstTokenId})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
					const ownerOfResult = await ownerOfPromise;

					const balanceOfPromise = deployedContract.call('balanceOf', {
						args: `(${config.pubKeyHex})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(balanceOfPromise, 'Could not call balanceOf');
					const balanceOfResult = await balanceOfPromise;

					//Assert
					const decodedBalanceOfResult = await balanceOfResult.decode("int");
					assert.equal(decodedBalanceOfResult.value, expectedBalance)
				})

				it('shouldn`t burn token from non-owner', async () => {
					//Arrange

					//Act
					const unauthorizedBurnPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "burn", {
						args: `(${firstTokenId})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					})

					//Assert
					assert.isRejected(unauthorizedBurnPromise, 'bad_call_data');
				})
			})

			describe('Transfer', () => {
				it('should transfer token successfully', async () => {
					//Arrange
					const expectedBalanceOfNotOwner = 1;
					const expectedBalanceOfOwner = 0;

					//Act
					const setApprovalForAllPromise = deployedContract.call('setApprovalForAll', {
						args: `(${config.pubKeyHex},${true})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(setApprovalForAllPromise, 'Could not call setApprovalForAll');
					const setApprovalForAllResult = await setApprovalForAllPromise;

					const approvePromise = deployedContract.call('approve', {
						args: `(${firstTokenId}, ${config.notOwnerPubKeyHex})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(approvePromise, 'Could not call approve');
					const approveResult = await approvePromise;

					const transferFromPromise = deployedContract.call('transferFrom', {
						args: `(${config.pubKeyHex}, ${config.notOwnerPubKeyHex}, ${firstTokenId})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(transferFromPromise, 'Could not call transferFrom');
					const transferFromResult = await transferFromPromise;

					const balanceOfNotOwnerPromise = deployedContract.call('balanceOf', {
						args: `(${config.notOwnerPubKeyHex})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(balanceOfNotOwnerPromise, 'Could not call balanceOf');
					const balanceOfNotOwnerResult = await balanceOfNotOwnerPromise;

					const balanceOwnerPromise = deployedContract.call('balanceOf', {
						args: `(${config.pubKeyHex})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(balanceOwnerPromise, 'Could not call balanceOf');
					const balanceOfOwnerResult = await balanceOwnerPromise;

					const ownerOfPromise = deployedContract.call('ownerOf', {
						args: `(${firstTokenId})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					});
					assert.isFulfilled(ownerOfPromise, 'Could not call ownerOf');
					const ownerOfResult = await ownerOfPromise;

					//Assert
					const decodedBalanceOfNotOwnerResult = await balanceOfNotOwnerResult.decode("int");
					const decodedBalanceOfOwnerResult = await balanceOfOwnerResult.decode("int");
					const decodedOwnerOfResult = ownerOfResult.result.returnValue.toLowerCase()

					assert.equal(decodedBalanceOfNotOwnerResult.value, expectedBalanceOfNotOwner)
					assert.equal(decodedBalanceOfOwnerResult.value, expectedBalanceOfOwner)
					assert.equal(decodedOwnerOfResult.split('_')[1], config.notOwnerKeyPair.publicKey.split('_')[1].toLocaleLowerCase())
				})

				it('non-owner of token shouldn`t be able to call approve', async () => {
					//Arrange

					//Act
					const unauthorizedApprovePromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "approve", {
						args: `(${firstTokenId})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					})

					//Assert
					assert.isRejected(unauthorizedApprovePromise, 'bad_call_data');
				})

				it('non-owner of token shouldn`t be able to call transferFrom', async () => {
					//Arrange

					//Act
					const unauthorizedTransferPromise = secondClient.contractCall(compiledContract.bytecode, 'sophia', deployedContract.address, "transferFrom", {
						args: `(${firstTokenId})`,
						options: {
							ttl: config.ttl,
							gas: config.gas
						}
					})

					//Assert
					assert.isRejected(unauthorizedTransferPromise, 'bad_call_data');
				})
			})

			//TODO fix this test
			// describe('Metadata', () => {	
			// 	it('should write/read token metadata successfully', async () => {	
			// 		//Arrange	
			// 		const expectedTokenURI = "Token";	

			// 		//Act	
			// 		const setURIPromise = deployedContract.call('setTokenURI', { args: `(${firstTokenId}, "Token")`, options: { ttl: config.ttl, gas: config.gas } });	
			// 		assert.isFulfilled(setURIPromise, 'Could not call setTokenURI');	
			// 		await setURIPromise;	

			// 		const tokenURIPromise = deployedContract.call('tokenURI', { args: `(${firstTokenId}`, options: { ttl: config.ttl, gas: config.gas } });	
			// 		assert.isFulfilled(tokenURIPromise, 'Could not call approve');	
			// 		const tokenURIResult = await tokenURIPromise;	

			// 		//Assert	
			// 		const decodedTokenURIResult = await tokenURIResult.decode("string");	

			// 		assert.equal(decodedTokenURIResult, expectedTokenURI)	
			// 	})	
			// })
		})
	})
})