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
const errorMessages = require('./error-messages').crowdsale;

const sourceFile = "./../contracts/crowdsale/crowdsale-capped.aes";
const mintableCrowdsaleContractPath = './../contracts/crowdsale/crowdsale-mintable.aes'
const erc20CappedPath = "./../contracts/erc20/erc20_capped.aes";
const erc20MintablePath = "./../contracts/erc20/erc20_mintable.aes";

const getDeployedContractInstance = utils.getDeployedContractInstance;
const executeSmartContractFunction = utils.executeSmartContractFunction;
const executeSmartContractFunctionFromAnotherClient = utils.executeSmartContractFunctionFromAnotherClient;
const getAEClient = utils.getAEClient;
const publicKeyToHex = utils.publicKeyToHex;
const decodedHexAddressToPublicAddress = utils.decodedHexAddressToPublicAddress;

let RANDOM_ADDRESS_1 = 'ak_gLYH5tAexTCvvQA6NpXksrkPJKCkLnB9MTDFTVCBuHNDJ3uZv';
let RANDOM_ADDRESS_2 = 'ak_zPoY7cSHy2wBKFsdWJGXM7LnSjVt6cn1TWBDdRBUMC7Tur2NQ';
let RANDOM_ADDRESS_3 = 'ak_tWZrf8ehmY7CyB1JAoBmWJEeThwWnDpU4NadUdzxVSbzDgKjP';

async function getContractInstance(contractPath, initState = undefined) {
    let notOwnerConfig = JSON.parse(JSON.stringify(config));
    notOwnerConfig.ownerKeyPair = config.notOwnerKeyPair;

    const sf = fs.readFileSync(path.resolve(__dirname, contractPath), 'utf8');
    let contractInfo = await getDeployedContractInstance(Universal, notOwnerConfig, sf, initState);
    return contractInfo.deployedContract;
}

async function wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
}

describe('Crowdsale', () => {

    describe('Capped Crowdsale rate 1', async () => {
        let contractInstance;
        let anotherClientConfiguration;
        let erc20Instance;
        let DEFAULT_RATE = 1;
        let TOKENS_TO_MINT = 10000;

        beforeEach(async () => {
            erc20Instance = await getContractInstance(erc20CappedPath, `(${TOKENS_TO_MINT})`);

            const sf = fs.readFileSync(path.resolve(__dirname, sourceFile), 'utf8');
            let deployInfo = await getDeployedContractInstance(Universal, config, sf, `(${publicKeyToHex(erc20Instance.address)}, ${publicKeyToHex(config.ownerKeyPair.publicKey)}, ${DEFAULT_RATE})`);
            contractInstance = deployInfo.deployedContract;
            
            // mint tokens 
            await executeSmartContractFunction(erc20Instance, 'mint', `(${publicKeyToHex(contractInstance.address)}, ${TOKENS_TO_MINT - 1})`);

            // create second/another client configuration
        	let anotherClient = await getAEClient(Universal, config, config.notOwnerKeyPair);

        	anotherClientConfiguration = {
        		client: anotherClient,
        		byteCode: deployInfo.compiledContract.bytecode,
        		contractAddress: contractInstance.address
        	}
        });

        it("Wallet should be same as inited owner.", async () => {
            let result = await executeSmartContractFunction(contractInstance, 'getWallet');
            let addressAsHex = (await result.decode('address')).value;

            let publicKey = decodedHexAddressToPublicAddress(addressAsHex);
            assert.equal(publicKey, config.ownerKeyPair.publicKey, "Inited wallet address is not the same!");
        });

        it("Rate should be same as inited rate.", async () => {
            let result = await executeSmartContractFunction(contractInstance, 'getRate');
            let value = (await result.decode('int')).value;

            assert.equal(DEFAULT_RATE, value, "Inited rate is not the same!");
        });

        it("Token raised should be 0.", async () => {
            let result = await executeSmartContractFunction(contractInstance, 'aeRaised', null);                                                        
            let value = (await result.decode('int')).value;

            assert.equal(0, value, "Token raised is different from 0!");
        });

        it("Should buy tokens with rate 1 and token raised and balance should be equal to spent aes.", async () => {
            let aes = 100;
            
            await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'buyTokens', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`, aes);

            let result = await executeSmartContractFunction(contractInstance, 'aeRaised', null);                                                        
            let aeRaised = (await result.decode('int')).value;
            
            result = await executeSmartContractFunction(erc20Instance, 'balanceOf', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
            let balanceOf = (await result.decode('int')).value;

            assert.equal(aes, aeRaised, "Token raised is incorrect!");
            assert.equal(aes, balanceOf, "Balance is not equal to bought tokens!");
        });

        it("Should buy tokens for 2 different accounts with rate 1. Token raised should be a sum of buy1 and buy2 tx and balance of each address should be equal to spent aes.", async () => {
            let aesAddress1 = 100;
            let aesAddress2 = 230;

            await executeSmartContractFunction(contractInstance, 'buyTokens', `(${publicKeyToHex(RANDOM_ADDRESS_1)}, ${publicKeyToHex(erc20Instance.address)})`, aesAddress1);
            await executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'buyTokens', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`, aesAddress2);
            
            let result = await executeSmartContractFunction(contractInstance, 'aeRaised', null);                                                        
            let aeRaised = (await result.decode('int')).value;

            result = await executeSmartContractFunction(erc20Instance, 'balanceOf', `(${publicKeyToHex(RANDOM_ADDRESS_1)})`);
            let balanceOfAddress1 = (await result.decode('int')).value;

            result = await executeSmartContractFunction(erc20Instance, 'balanceOf', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
            let balanceOfAddress2 = (await result.decode('int')).value;

            assert.equal(aesAddress1 + aesAddress2, aeRaised, "Token raised is incorrect!");
            assert.equal(aesAddress1, balanceOfAddress1, "Balance is not equal to bought tokens!");
            assert.equal(aesAddress2, balanceOfAddress2, "Balance is not equal to bought tokens!");
        });
    });

    describe('Capped Crowdsale rate 5', async () => {
        let contractInstance;
        let anotherClientConfiguration;
        let erc20Instance;
        let DEFAULT_RATE = 5;
        let TOKENS_TO_MINT = 1000;

        async function mintTokens(tokenAmount) {
            await executeSmartContractFunction(erc20Instance, 'mint', `(${publicKeyToHex(contractInstance.address)}, ${tokenAmount})`);
        }

        beforeEach(async () => {
            erc20Instance = await getContractInstance(erc20CappedPath, `(${TOKENS_TO_MINT})`);

            const sf = fs.readFileSync(path.resolve(__dirname, sourceFile), 'utf8');
            let deployInfo = await getDeployedContractInstance(Universal, config, sf, `(${publicKeyToHex(erc20Instance.address)}, ${publicKeyToHex(config.ownerKeyPair.publicKey)}, ${DEFAULT_RATE})`);
            contractInstance = deployInfo.deployedContract;

            // create second/another client configuration
        	let anotherClient = await getAEClient(Universal, config, config.notOwnerKeyPair);

        	anotherClientConfiguration = {
        		client: anotherClient,
        		byteCode: deployInfo.compiledContract.bytecode,
        		contractAddress: contractInstance.address
        	}
        });

        it("[NEGATIVE] There is NO tokens mint, should NOT buy tokens.", async () => {
            let aes = 100;
            await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'buyTokens', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`, aes), errorMessages.NOT_ENOUGH_BALANCE);
        });

        it("[NEGATIVE] Should NOT buy more tokens than contract is minted (owner of tokens have).", async () => {
            await mintTokens(10);

            let aes = 100;
            
            await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'buyTokens', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`, aes), errorMessages.NOT_ENOUGH_BALANCE);
        });

        it("[NEGATIVE] Should NOT buy more tokens than cap.", async () => {
            await mintTokens(TOKENS_TO_MINT);

            let aes = TOKENS_TO_MINT + 1;
            
            await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'buyTokens', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`, aes), errorMessages.REQUESTED_AMOUNT_BIGGER_THAN_CAP);
        });

        it("Should buy tokens with rate 5, balance should be equal to spent aes multiply by 5 and ae raised should be equal to spent aes.", async () => {
            await mintTokens(TOKENS_TO_MINT);
            let aes = 100;
            
            await executeSmartContractFunction(contractInstance, 'buyTokens', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`, aes);

            let result = await executeSmartContractFunction(contractInstance, 'aeRaised');                                                        
            let aeRaised = (await result.decode('int')).value;
            
            result = await executeSmartContractFunction(erc20Instance, 'balanceOf', `(${publicKeyToHex(RANDOM_ADDRESS_3)})`);
            let balanceOf = (await result.decode('int')).value;

            assert.equal(aeRaised, aes, "Token raised is incorrect!");
            assert.equal(aes * DEFAULT_RATE, balanceOf, "Balance is not equal to bought tokens!");
        });
    });

    describe('Mintable crowdsale', async () => {
        let contractInstance;
        let anotherClientConfiguration;
        let erc20Instance;
        let deployInfo;

        const DEFAULT_RATE = 5;
        const END_TIME = 1000 * 60 * 0.5; // 30s.
        let i = 0;

        function getSeconds() {
            return END_TIME * i++;
        }

        beforeEach(async () => {
            let sf = fs.readFileSync(path.resolve(__dirname, erc20MintablePath), 'utf8');
            erc20Instance = (await getDeployedContractInstance(Universal, config, sf)).deployedContract;

            sf = fs.readFileSync(path.resolve(__dirname, mintableCrowdsaleContractPath), 'utf8');
            deployInfo = await getDeployedContractInstance(Universal, config, sf, `(${publicKeyToHex(erc20Instance.address)}, ${publicKeyToHex(config.ownerKeyPair.publicKey)}, ${DEFAULT_RATE}, ${getSeconds()})`);
            contractInstance = deployInfo.deployedContract;

            await executeSmartContractFunction(erc20Instance, 'transferOwnership', `(${publicKeyToHex(contractInstance.address)})`);
        });

        it("[NEGATIVE] Should NOT buy tokens when crowdsale has ended.", async () => {
            // end time is equal to inited time
            await assert.isRejected(executeSmartContractFunction(contractInstance, 'buyTokens', `(45)`, 100), errorMessages.CROWDSALE_HAS_ENDED);
        });

        it("[NEGATIVE] Should NOT buy tokens after crowdsale end.", async () => {
            // wait to reach end time
            await wait(getSeconds() + 1000); // add 1 second above end time limit

            await executeSmartContractFunction(contractInstance, 'endCrowdsale');
            await assert.isRejected(executeSmartContractFunction(contractInstance, 'buyTokens', `(10)`, 100), errorMessages.CROWDSALE_HAS_ENDED);

            let anotherClient = await getAEClient(Universal, config, config.notOwnerKeyPair);

        	anotherClientConfiguration = {
        		client: anotherClient,
        		byteCode: deployInfo.compiledContract.bytecode,
        		contractAddress: contractInstance.address
            }
            
            await assert.isRejected(executeSmartContractFunctionFromAnotherClient(anotherClientConfiguration, 'buyTokens', `(10)`, 100), errorMessages.CROWDSALE_HAS_ENDED);
        });
        
        it("Should return ownership to the origin owner after crowdsale end.", async () => {

            await wait(getSeconds() + 1000); // add 1 second above end time limit

            await assert.isFulfilled(executeSmartContractFunction(contractInstance, 'endCrowdsale'));
        });

        it("Should buy tokens before crowdsale end.", async () => {
            await assert.isFulfilled(executeSmartContractFunction(contractInstance, 'buyTokens', `(10)`, 100));
        });

        it("[NEGATIVE] Should NOT end crowdsale before end date.", async () => {
            await assert.isRejected(executeSmartContractFunction(contractInstance, 'endCrowdsale'), errorMessages.CROWDSALE_IS_STILL_RUNNING);
        });
    })
});