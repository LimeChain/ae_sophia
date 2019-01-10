const fs = require('fs');
const path = require('path');
const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const chain = AeSDK.Chain; // require('@aeternity/aepp-sdk/es/chain');
const config = require("./config.json")
const utils = require('./utils');
const errorMessages = require('./error-messages');

const sourceFile = "./../contracts/crowdsale/crowdsale.aes";
const erc20Path = "./../contracts/erc20/erc20.aes";

const getDeployedContractInstance = utils.getDeployedContractInstance;
const executeSmartContractFunction = utils.executeSmartContractFunction;
const executeSmartContractFunctionFromAnotherClient = utils.executeSmartContractFunctionFromAnotherClient;
const getAEClient = utils.getAEClient;
const publicKeyToHex = utils.publicKeyToHex;
const decodedHexAddressToPublicAddress = utils.decodedHexAddressToPublicAddress;
const execute = utils.execute;

let RANDOM_ADDRESS_1 = 'ak_gLYH5tAexTCvvQA6NpXksrkPJKCkLnB9MTDFTVCBuHNDJ3uZv';
let RANDOM_ADDRESS_2 = 'ak_zPoY7cSHy2wBKFsdWJGXM7LnSjVt6cn1TWBDdRBUMC7Tur2NQ';
let RANDOM_ADDRESS_3 = 'ak_tWZrf8ehmY7CyB1JAoBmWJEeThwWnDpU4NadUdzxVSbzDgKjP';

async function getContractInstance(contractPath) {
    let notOwnerConfig = JSON.parse(JSON.stringify(config));
    notOwnerConfig.ownerKeyPair = config.notOwnerKeyPair;

    const sf = fs.readFileSync(path.resolve(__dirname, contractPath), 'utf8');
    let contractInfo = await getDeployedContractInstance(Universal, notOwnerConfig, sf);
    return contractInfo.deployedContract;
}

function extractBalance(accountInfo) {
    if (!accountInfo) {
        throw new Error('Account info cannot be null or empty string.')
    }

    let match = accountInfo.match(/(?:balance_+\s+(\d+))/m);
    if (match.length >= 2) {
        return match[1];
    }

    throw new Error('Missing balance or invalid has been changed!')
}

//let result = await executeSmartContractFunction(contractInstance, 'tknRaised');
// let aa  = await chain.compose(EpochContract)({
//     url: 'https://sdk-testnet.aepps.com',
//     internalUrl: 'https://sdk-testnet.aepps.com',
// });

// let accountInfo = await execute('aecli', 'inspect', [`${config.ownerKeyPair.publicKey}`, `-u`, 'http://localhost:3001']);
// console.log(extractBalance(accountInfo));

describe('Crowdsale', () => {

    describe('Simple crowdsale', async () => {
        let contractInstance;
        let anotherClientConfiguration;
        let erc20Instance;
        let DEFAULT_RATE = 1;

        beforeEach(async () => {
            erc20Instance = await getContractInstance(erc20Path);

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

        it("Wallet should be same as inited owner.", async () => {
            let result = await executeSmartContractFunction(contractInstance, 'getWallet');
            let addressAsHex = (await result.decode('address')).value;

            let publicKey = decodedHexAddressToPublicAddress(addressAsHex);
            //console.log(assert);
            assert.equal(publicKey, config.ownerKeyPair.publicKey, "Inited wallet address is not the same!");
        });

        it("Rate should be same as inited rate.", async () => {
            let result = await executeSmartContractFunction(contractInstance, 'getRate');
            let value = (await result.decode('int')).value;

            assert.equal(DEFAULT_RATE, value, "Inited rate is not the same!");
        });

        it("Token raised should be 0.", async () => {
            let result = await executeSmartContractFunction(contractInstance, 'tknRaised', null);                                                        
            let value = (await result.decode('int')).value;

            assert.equal(0, value, "Token raised is different from 0!");
        });

        it.only("Should buy tokens with rate 1 and token raised should be the same.", async () => {
            // let result = await executeSmartContractFunction(contractInstance, 'get'); 
            // let addressAsHex = (await result.decode('address')).value;
            // let publicKey = decodedHexAddressToPublicAddress(addressAsHex);
            // console.log(publicKey);
            // console.log(erc20Instance);

            let aes = 100;
            result = await executeSmartContractFunction(contractInstance, 'buyTokens', `(${publicKeyToHex(config.ownerKeyPair.publicKey)}, ${publicKeyToHex(erc20Instance.address)})`, aes); 
            
            console.log('==> check for token raise...');
            result = await executeSmartContractFunction(contractInstance, 'tknRaised', null);                                                        
            let value = (await result.decode('int')).value;

            assert.equal(aes, value, "Token raised is different from 0!");
        });
    });
});