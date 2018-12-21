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

const sourceFile =  "./../contracts/crypto-hamster/crypto-hamsters.aes";

const getDeployedContractInstance = utils.getDeployedContractInstance;
const executeSmartContractFunction = utils.executeSmartContractFunction;

const randomNames = [
    'aleks',
    'gosho',
    'john',
    'peter'
]

describe('Crypto Hamsters', async () => {

    let cryptoHamsterInstance;

    beforeEach(async () => {
        const sf = fs.readFileSync(path.resolve(__dirname, sourceFile), 'utf8');
        let deployInfo = await getDeployedContractInstance(Universal, config, sf);
        cryptoHamsterInstance = deployInfo.deployedContract;
    });
    
    it('Should create hamster successfully', async () => {
        await executeSmartContractFunction(cryptoHamsterInstance, 'createHamster', `("${randomNames[0]}")`);

        let result = await executeSmartContractFunction(cryptoHamsterInstance, 'nameExists', `("${randomNames[0]}")`);
        let resultValue = (await result.decode('bool')).value;
        assert.ok(resultValue === 1, 'Hamster does not exist!');
    });

    it('Should create few hamsters successfully', async () => {
        for (let i = 0; i < randomNames.length; i++) {
            await executeSmartContractFunction(cryptoHamsterInstance, 'createHamster', `("${randomNames[i]}")`);

            let result = await executeSmartContractFunction(cryptoHamsterInstance, 'nameExists', `("${randomNames[i]}")`);
            let resultValue = (await result.decode('bool')).value;
            assert.ok(resultValue === 1, 'Hamster does not exist!');
        }
    });

    it('[NEGATIVE] Should NOT create hamster with same name', async () => {
        await executeSmartContractFunction(cryptoHamsterInstance, 'createHamster', `("${randomNames[0]}")`);
        await assert.isRejected(executeSmartContractFunction(cryptoHamsterInstance, 'createHamster', `("${randomNames[0]}")`), errorMessages.NAME_ALREADY_TAKEN);
    });

    it('Hamster (name) should NOT exist', async () => {

        for (let i = 0; i < randomNames.length; i++) {
            let result = await executeSmartContractFunction(cryptoHamsterInstance, 'nameExists', `("${randomNames[i]}")`);
            let resultValue = (await result.decode('bool')).value;
            assert.ok(resultValue === 0, 'Hamster does not exist!');
        }
    });

    it('[NEGATIVE] Should throw exception when there are not any hamsters', async () => {

        for (let i = 0; i < randomNames.length; i++) {
            await assert.isRejected(executeSmartContractFunction(cryptoHamsterInstance, 'getHamsterDNA', `("${randomNames[i]}")`), errorMessages.NONEXISTEN_HAMSTER_NAME);
        }
    });

    it('Hamsters DNA should not match', async () => {

        let dnas = [];

        for (let i = 0; i < randomNames.length; i++) {
            await executeSmartContractFunction(cryptoHamsterInstance, 'createHamster', `("${randomNames[i]}")`);

            let result = await executeSmartContractFunction(cryptoHamsterInstance, 'getHamsterDNA', `("${randomNames[i]}")`);
            let resultValue = (await result.decode('int')).value;
            
            if (dnas.includes(resultValue)) {
                assert.ok(false, 'DNA already exist!')
            } else {
                dnas.push(resultValue);
            }
        }
    });
})