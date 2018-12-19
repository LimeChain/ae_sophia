const fs = require('fs');
const path = require('path');
const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./config.json")
const utils = require('./utils');
const errorMessages = require('./error-messages');

const sourceFile =  "./contracts/multisig/multisigwallet.aes";
const VOTING_CONTRACT_PATH = './../contracts/multisig/Voting-test.aes';

const getDeployedContractInstance = utils.getDeployedContractInstance;
const executeSmartContractFunction = utils.executeSmartContractFunction;
const executeSmartContractFunctionFromAnotherClient = utils.executeSmartContractFunctionFromAnotherClient;
const getAEClient = utils.getAEClient;
const publicKeyToHex = utils.publicKeyToHex;

/**
 * #9 ------------------------------------------------------------
	public key: ak_gLYH5tAexTCvvQA6NpXksrkPJKCkLnB9MTDFTVCBuHNDJ3uZv
	private key: ak_FUwKv5yhtZHmk2o3ZKQSHtYT7gbY7cAU11QB6RZFXDhag5n3uqez1XDPkCHpHGDmE3Nfgs7smAabRhHLsiKXvMTfcMjVT
	#10 ------------------------------------------------------------
	public key: ak_zPoY7cSHy2wBKFsdWJGXM7LnSjVt6cn1TWBDdRBUMC7Tur2NQ
	private key: ak_87QPyEAD44fZTddnHi9vP1hSPaxPpmDy7TDHUqJxbeWgSLG27oLFAQaR4VC1zVTQXzmcW9cjcjjzVwnpHxmBw9DLgcyAM
 * 
 */

let RANDOM_ADDRESS_1 = 'ak_gLYH5tAexTCvvQA6NpXksrkPJKCkLnB9MTDFTVCBuHNDJ3uZv';
let RANDOM_ADDRESS_2 = 'ak_zPoY7cSHy2wBKFsdWJGXM7LnSjVt6cn1TWBDdRBUMC7Tur2NQ';
let RANDOM_ADDRESS_3 = 'ak_tWZrf8ehmY7CyB1JAoBmWJEeThwWnDpU4NadUdzxVSbzDgKjP';
let VALID_METHOD_NAME = 'Vote';
let INVALID_METHOD_NAME = 'sayHello';

async function getVotingContractInstance () {
	let notOwnerConfig = JSON.parse(JSON.stringify(config));
	notOwnerConfig.ownerKeyPair = config.notOwnerKeyPair;
	
	const sf = fs.readFileSync(path.resolve(__dirname, VOTING_CONTRACT_PATH), 'utf8');
	let votingContractInfo = await getDeployedContractInstance(Universal, notOwnerConfig, sf);
	return votingContractInfo.deployedContract;
}

describe('MultiSig', () => {

	describe('Deploy contract', () => {

		let multiSigInstance;

		before(async () => {
			const sf = fs.readFileSync(sourceFile, 'utf8');
			let deployInfo = await getDeployedContractInstance(Universal, config, sf, '(2)');
			multiSigInstance = deployInfo.deployedContract;
		})

		// DO NOT CHANGE TEST POSITIONS
		it('deploying successfully', async () => {
			firstClient = await Universal({
				url: config.host,
				internalUrl: config.internalHost,
				keypair: config.ownerKeyPair,
				nativeMode: true,
				networkId: 'ae_devnet'
			});
	
			firstClient.setKeypair(config.ownerKeyPair)
			await firstClient.spend(1, config.notOwnerKeyPair.publicKey)
	
			ownableSource = utils.readFileRelative(sourceFile, config.filesEncoding);

			//Arrange
			const compiledContract = await firstClient.contractCompile(ownableSource, {
				gas: config.gas
			})

			//Act
			const deployPromise = compiledContract.deploy({
				options: {
					ttl: config.ttl,
				}
			});

			assert.isFulfilled(deployPromise, 'Could not deploy the Ownable Smart Contract');
			//Assert
			const deployedContract = await deployPromise;
			assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
		});

		it(`[NEGATIVE] Should not init owner.`, async () => {
			await assert.isRejected(executeSmartContractFunction(multiSigInstance, 'initOwner', `(${publicKeyToHex(multiSigInstance.address)})`), errorMessages.CANNOT_BE_SAME_ADDRESS);
		});

		it(`Should init owner correct.`, async () => {

			let funcResult = await executeSmartContractFunction(multiSigInstance, 'initOwner', `(${publicKeyToHex(config.notOwnerKeyPair.publicKey)})`);
			let resultValue = (await funcResult.decode('()')).value;
			
			assert.ok(Array.isArray(resultValue) && resultValue.length === 0, 'Expected output does not match!');
		});

		it('[NEGATIVE] Should configure correct, if it is configured correct, initOwner should throw exception.', async () => {

			let funcResult = await executeSmartContractFunction(multiSigInstance, 'configure');
			let resultValue = (await funcResult.decode('()')).value;
			assert.ok(Array.isArray(resultValue) && resultValue.length === 0, 'Expected output does not match!');
			
			await assert.isRejected(executeSmartContractFunction(multiSigInstance, 'initOwner', `("${config.ownerKeyPair.publicKey}")`), errorMessages.NOT_CONFIGURED);
		});
	});
	
	describe('Contract is not configured', function () {
		let deployedContractInstance;
		let deployInfo;
		before(async () => {
			const sf = fs.readFileSync(sourceFile, 'utf8');
			deployInfo = await getDeployedContractInstance(Universal, config, sf, '(2)');
			deployedContractInstance = deployInfo.deployedContract;
		})

		it('[NEGATIVE] NOT Configured, should NOT get confirmations', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'getConfirmations', '(0)'), errorMessages.ONLY_CONFIGURED);
		})

		it('[NEGATIVE] NOT Configured, should NOT execute tx', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'executeTransaction', `(1, "${RANDOM_ADDRESS_1}")`), errorMessages.ONLY_CONFIGURED);
		})

		it('[NEGATIVE] NOT Configured, should NOT approve', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'approve', `(1)`), errorMessages.ONLY_CONFIGURED);
		})

		it('[NEGATIVE] NOT Configured, should NOT add tx', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`), errorMessages.ONLY_CONFIGURED);
		})

		it('[NEGATIVE] NOT Configured, should NOT add owner', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'addOwner', `("${RANDOM_ADDRESS_1}", true)`), errorMessages.ONLY_CONFIGURED);
		})

		it('[NEGATIVE] NOT Configured, should NOT remove owner', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'removeOwner', `("${RANDOM_ADDRESS_1}")`), errorMessages.ONLY_CONFIGURED);
		})

		it('[NEGATIVE] NOT Configured, should NOT vote to remove owner', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `("${RANDOM_ADDRESS_1}")`), errorMessages.ONLY_CONFIGURED);
		})

		it('[NEGATIVE] NOT Configured, should NOT vote to add owner', async () => {
			await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `("${RANDOM_ADDRESS_1}")`), errorMessages.ONLY_CONFIGURED);
		})
	})

	describe('Contract is configured', function () {
		let deployedContractInstance;
		let anotherClientConfiguration;

		beforeEach(async () => {
			const sf = fs.readFileSync(sourceFile, 'utf8');
			const deployInfo = await getDeployedContractInstance(Universal, config, sf, '(2)');
			deployedContractInstance = deployInfo.deployedContract;

			// create second/another client configuration
			let anotherClient = await getAEClient(Universal, config, config.notOwnerKeyPair);

			anotherClientConfiguration = {
				client: anotherClient,
				byteCode: deployInfo.compiledContract.bytecode,
				contractAddress: deployedContractInstance.address
			}

			await executeSmartContractFunction(deployedContractInstance, 'initOwner', `(${publicKeyToHex(config.ownerKeyPair.publicKey)})`);
			await executeSmartContractFunction(deployedContractInstance, 'configure');
		})

		describe('Vote, add and remove owners', function () {
			it('should vote to add new owner correctly', async () => {
				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`));
			});
	
			it('[NEGATIVE] Not owner account should NOT vote to add new owner.', async () => {
				await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, "voteAddOwner", `(${publicKeyToHex(RANDOM_ADDRESS_2)})`), errorMessages.ONLY_OWNERS);
			});
	
			it('should add new owner correctly, without increase REQUIRED', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, false)`));
			});

			it('should add new owner correctly, increase REQUIRED', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, "true")`));
			});
	
			it('[NEGATIVE] NOT owner should NOT add new owner.', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, "addOwner", `(${publicKeyToHex(RANDOM_ADDRESS_2)}, false)`), errorMessages.ONLY_OWNERS);
			});
	
			it('[NEGATIVE] should NOT vote twice to add already existent owner', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, "true")`);
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`), errorMessages.ALREADY_VOTED);
			});
	
			it('should vote to remove an owner correctly', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, "true")`);
				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`));
			});
	
			it('[NEGATIVE] should NOT vote to remove a nonexistent owner', async () => {
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`), errorMessages.PASSED_ADDRESS_IS_NOT_OWNER);
			});
	
			it('[NEGATIVE] NOT owner should NOT vote to remove an owner.', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, "true")`);
				await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, "voteRemoveOwner", `(${publicKeyToHex(RANDOM_ADDRESS_2)})`), errorMessages.ONLY_OWNERS);
			});
	
			it('[NEGATIVE] should NOT vote twice to remove an owner', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, "true")`);
				await executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`), errorMessages.ALREADY_VOTED);
			});
	
			it('should remove an owner correctly', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`);
				await executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'removeOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);

				// try to execute func
				await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`), errorMessages.ONLY_OWNERS);
			});
	
			it('[NEGATIVE] should NOT remove nonexistent owner, owner to remove is voted correctly', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, false)`);
				await executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'removeOwner', `(${publicKeyToHex(RANDOM_ADDRESS_1)})`), errorMessages.NOT_ENOUGH_VOTES);
			});
		})

		describe('Transaction functionality', function () {

			it('should add transaction correct', async () => {
				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`));
			});

			it('[NEGATIVE] should NOT add transaction, invalid method name', async () => {
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${INVALID_METHOD_NAME}")`), errorMessages.INVALID_METHOD_NAME);
			});

			it('should add multiple transactions and increment tx id correct', async () => {
				let txId = 0;
				let funcResult = await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				let resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === txId++, "Tx id is not correct");

				funcResult = await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === txId++, "Tx id is not correct");

				funcResult = await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === txId++, "Tx id is not correct");

				funcResult = await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === txId++, "Tx id is not correct");
			});

			it('[NEGATIVE] NOT owner should NOT add transaction', async () => {
				await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'addTransaction', `("${VALID_METHOD_NAME}")`), errorMessages.ONLY_OWNERS);
			});

			it('Added transaction should have 0 confirmations', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				let funcResult = await executeSmartContractFunction(deployedContractInstance, 'getConfirmations', `(0)`);
				let resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 0, "Transaction have confirmations");
			});

			it('Add 2 transaction and approve second one', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);

				await executeSmartContractFunction(deployedContractInstance, 'approve', `(1)`);
				let funcResult = await executeSmartContractFunction(deployedContractInstance, 'getConfirmations', `(0)`);
				let resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 0, "Transaction have confirmations");

				funcResult = await executeSmartContractFunction(deployedContractInstance, 'getConfirmations', `(1)`);
				resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 1, "Transaction have confirmations");
			});

			it('Add 2 transaction and approve both', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);

				await executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`);
				await executeSmartContractFunction(deployedContractInstance, 'approve', `(1)`);
				let funcResult = await executeSmartContractFunction(deployedContractInstance, 'getConfirmations', `(0)`);
				let resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 1, "Transaction have confirmations");

				funcResult = await executeSmartContractFunction(deployedContractInstance, 'getConfirmations', `(1)`);
				resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 1, "Transaction have confirmations");
			});

			it('Add 2 transaction and approve both, first one with 2 approves, second with 1', async () => {

				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, "true")`);
				
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);

				await executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`);
				await executeSmartContractFunction(deployedContractInstance, 'approve', `(1)`);
				
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'approve', `(0)`);
				
				let funcResult = await executeSmartContractFunction(deployedContractInstance, 'getConfirmations', `(0)`);
				let resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 2, "Transaction have confirmations");
				
				funcResult = await executeSmartContractFunction(deployedContractInstance, 'getConfirmations', `(1)`);
				resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 1, "Transaction have confirmations");
			});

			it('Execute approved transaction', async () => {
				let votingContractInstance = await getVotingContractInstance();
				
				let funcResult = await executeSmartContractFunction(votingContractInstance, 'result');
				let resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 0, "Voting contract state is incorrect!");
				
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				await executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`);

				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'executeTransaction', `(0, ${publicKeyToHex(votingContractInstance.address)})`));

				funcResult = await executeSmartContractFunction(votingContractInstance, 'result');
				resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 1, "Transaction have confirmations");
			});

			it('[NEGATIVE] NOT owner should NOT execute approved transaction', async () => {
			
				let notOwnerConfig = JSON.parse(JSON.stringify(config));
				notOwnerConfig.ownerKeyPair = config.notOwnerKeyPair;

				const sf = fs.readFileSync(path.resolve(__dirname, VOTING_CONTRACT_PATH), 'utf8');
				let votingContractInfo = await getDeployedContractInstance(Universal, notOwnerConfig, sf);
				let votingContractInstance = votingContractInfo.deployedContract;

				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				await executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`);
				
				await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'executeTransaction', `(0, ${publicKeyToHex(votingContractInstance.address)})`), errorMessages.ONLY_OWNERS);
			});

			it('[NEGATIVE] Should NOT vote/approve for a transaction twice.', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);

				await executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`);
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`), errorMessages.ALREADY_VOTED);
			});
			
		})

		describe('Required validation', async function () {

			it('Should execute transaction with more votes.', async () => {

				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, "true")`);

				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);

				await executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`);
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'approve', `(0)`);

				let votingContractInstance = await getVotingContractInstance();

				await executeSmartContractFunction(deployedContractInstance, 'executeTransaction', `(0, ${publicKeyToHex(votingContractInstance.address)})`);

				let funcResult = await executeSmartContractFunction(votingContractInstance, 'result');
				let resultValue = (await funcResult.decode('int')).value;
				assert.ok(resultValue === 1, "Transaction have confirmations");
			});

			it('[NEGATIVE] Should NOT execute transaction with less require votes.', async () => {

				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, "true")`);

				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);

				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, "true")`);
				
				await executeSmartContractFunction(deployedContractInstance, 'addTransaction', `("${VALID_METHOD_NAME}")`);
				await executeSmartContractFunction(deployedContractInstance, 'approve', `(0)`);
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'approve', `(0)`);

				let votingContractInstance = await getVotingContractInstance();

				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'executeTransaction', `(0, ${publicKeyToHex(votingContractInstance.address)})`), errorMessages.NOT_ENOUGH_VOTES);
			});

			it('[NEGATIVE] should NOT add new owner, there are no votes for that address/owner', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_1)})`);
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, "true")`), errorMessages.NOT_ENOUGH_VOTES);
			});

			it('Should add new owner with more votes', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`);

				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);

				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, false)`));
			});

			it('[NEGATIVE] Should NOT add new owner twice', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`);

				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);

				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`),errorMessages.NOT_ENOUGH_VOTES);
			});

			it('Should remove owner with more votes', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`);

				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);

				await assert.isFulfilled(executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)}, false)`));

				await executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
				await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);

				await executeSmartContractFunction(deployedContractInstance, 'removeOwner', `(${publicKeyToHex(RANDOM_ADDRESS_2)})`);
			});

			it('[NEGATIVE] Should NOT remove owner without vote', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`);
				
				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'removeOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`), errorMessages.NOT_ENOUGH_VOTES);
			});

			it('[NEGATIVE] Should NOT remove owner twice', async () => {
				await executeSmartContractFunction(deployedContractInstance, 'voteAddOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'addOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)}, false)`);

				await executeSmartContractFunction(deployedContractInstance, 'voteRemoveOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
				await executeSmartContractFunction(deployedContractInstance, 'removeOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);

				await assert.isRejected(executeSmartContractFunction(deployedContractInstance, 'removeOwner', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`), errorMessages.NOT_ENOUGH_VOTES);
			});
		})
	})
})