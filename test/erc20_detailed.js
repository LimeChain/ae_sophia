const chai = require('chai');
let chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);
const assert = chai.assert;
const utils = require('./utils');
const AeSDK = require('@aeternity/aepp-sdk');
const Universal = AeSDK.Universal;
const config = require("./config.json")
const sourceFile = "./contracts/erc20/erc20_detailed.aes"

describe('ERC20', () => {

    let firstClient;
    let secondClient;
    let erc20Source;

    before(async () => {
        firstClient = await Universal({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: config.ownerKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        secondClient = await Universal({
            url: config.host,
            internalUrl: config.internalHost,
            keypair: config.notOwnerKeyPair,
            nativeMode: true,
            networkId: 'ae_devnet'
        });

        firstClient.setKeypair(config.ownerKeyPair)
        await firstClient.spend(1, config.notOwnerKeyPair.publicKey)

        erc20Source = utils.readFileRelative(sourceFile, config.filesEncoding);
    })

    describe('Deploy contract', () => {

        it('deploying successfully', async () => {
            //Arrange
            const expectedName = "UnitTest"
            const expectedSymbol = "TT"
            const expectedDecimals = 18;
            const compiledContract = await firstClient.contractCompile(erc20Source, {})

            //Act
            const deployPromise = compiledContract.deploy({
                initState: `("${expectedName}", "${expectedSymbol}", ${expectedDecimals})`,
                options: {
                    ttl: config.ttl
                },
                abi: "sophia"
            });
            assert.isFulfilled(deployPromise, 'Could not deploy the erc20');
            const deployedContract = await deployPromise;

            const namePromise = deployedContract.call('name', {
                options: {
                    ttl: config.ttl
                }
            });
            assert.isFulfilled(namePromise, 'Could not call name');
            const namePromiseResult = await namePromise;

            const symbolPromise = deployedContract.call('symbol', {
                options: {
                    ttl: config.ttl
                }
            });
            assert.isFulfilled(symbolPromise, 'Could not call symbol');
            const symbolPromiseResult = await symbolPromise;

            const decimalsPromise = deployedContract.call('decimals', {
                options: {
                    ttl: config.ttl
                }
            });
            assert.isFulfilled(decimalsPromise, 'Could not call decimals');
            const decimalsPromiseResult = await decimalsPromise;

            //Assert
            const decodedNamePromiseResult = await namePromiseResult.decode("string");
            const decodedSymbolPromiseResult = await symbolPromiseResult.decode("string");
            const decodedDecimalsPromiseResult = await decimalsPromiseResult.decode("int");

            assert.equal(config.ownerKeyPair.publicKey, deployedContract.owner)
            assert.equal(decodedNamePromiseResult.value, expectedName)
            assert.equal(decodedSymbolPromiseResult.value, expectedSymbol)
            assert.equal(decodedDecimalsPromiseResult.value, expectedDecimals)
        })
    })
})