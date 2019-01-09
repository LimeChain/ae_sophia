const fs = require('fs');
const path = require('path');
const Crypto = require('@aeternity/aepp-sdk').Crypto;
const DEFAULT_MAX_GAS = 1000000001;
						
const readFile = (path, encoding = null, errTitle = 'READ FILE ERR') => {
	try {
		return fs.readFileSync(
			path,
			encoding
		)
	} catch (e) {
		console.log(e);
		switch (e.code) {
			case 'ENOENT':
				throw new Error('File not found', e)
				break
			default:
				throw e
		}
	}
}

const writeFile = (path, content) => {
	// try {
	// 	return fs.writeFile(
	// 		path,
	// 		content,
	// 		callBack
	// 	)
	// } catch (e) {
	// 	console.log(e);
	// 	switch (e.code) {
	// 		case 'ENOENT':
	// 			throw new Error('File not found', e)
	// 			break
	// 		default:
	// 			throw e
	// 	}
	// }
	// console.log("from fs: " + content)
	fs.writeFileSync(path, content);
}

const writeFileRelative = async (relativePath, content = null) => {
	return writeFile(path.resolve(process.cwd(), relativePath), content);
}

const readFileRelative = (relativePath, encoding = null, errTitle = 'READ FILE ERR') => {
	return readFile(path.resolve(process.cwd(), relativePath), encoding, errTitle);
}

const fileExists = (relativePath) => {
	return fs.existsSync(path.resolve(process.cwd(), relativePath));
}

const trimAddresses = (addressToTrim) => {
	return addressToTrim.substring(3)
}

// contract source should be => const contractSource = fs.readFileSync('./path/to/contract.aes', 'utf8');
const getDeployedContractInstance = async function (Universal, clientConfig, contractSource, initState) {
	client = await Universal({
		url: clientConfig.host,
		internalUrl: clientConfig.internalHost,
		keypair: clientConfig.ownerKeyPair,
		nativeMode: true,
		networkId: "ae_devnet"
	});

	compiledContract = await client.contractCompile(contractSource, {
		gas: clientConfig.gas
	});
	
	let deployOptions = {
		options: {
			ttl: clientConfig.ttl,
			//gas: clientConfig.gas
		},
		abi: "sophia"
	}

	if (initState) {
		deployOptions.initState = initState;
	}
	
	deployedContract = await compiledContract.deploy(deployOptions);

	// printResultWithDelimiter(['Deployed Contract Info:', deployedContract])

	let result = {
		deployedContract,
		compiledContract
	}

	return result;
};

// args that you pass, should be something like this => `("${INIT_CONTRACT_NAME}", ${INIT_AGE})`
const executeSmartContractFunction = async function (deployedContract, functionName, args, ttl = 345345, gas = DEFAULT_MAX_GAS) {
	let configuration = {
		options: {
			ttl: ttl,
			gas: gas
		},
		abi: "sophia",
	};

	if (args) {
		configuration.args = args
	}

	let result = await deployedContract.call(functionName, configuration);

	return result
}

const executeSmartContractFunctionFromAnotherClient = async function (clientConfiguration, functionName, args, ttl = 345345, gas = DEFAULT_MAX_GAS) {

	let configuration = {
		options: {
			ttl: ttl,
			gas: gas
		},
		abi: "sophia",
	};

	if (args) {
		configuration.args = args
	}

	let result = await clientConfiguration.client.contractCall(clientConfiguration.byteCode, 'sophia', clientConfiguration.contractAddress, functionName, configuration);

	return result;
}

const getAEClient = async function (Ae, clientConfig, keyPair) {
	let client = await Ae({
		url: clientConfig.host,
		internalUrl: clientConfig.internalHost,
		keypair: keyPair,
		nativeMode: true,
		networkId: "ae_devnet"
	});

	return client;
}

function printResultWithDelimiter (array) {
	const delimiter = '-'.repeat(80);
    console.log(delimiter);
    array.forEach(x => console.log(x));
    console.log(delimiter);
}

function publicKeyToHex (publicKey) {
	let byteArray = Crypto.decodeBase58Check(publicKey.split('_')[1]); // const Crypto = require('@aeternity/aepp-sdk').Crypto
	let asHex = '0x' + byteArray.toString('hex');
	return asHex;
}

module.exports = {
	readFile,
	readFileRelative,
	writeFileRelative,
	fileExists,
	trimAddresses,
	getDeployedContractInstance,
	executeSmartContractFunction,
	publicKeyToHex,
	getAEClient,
	executeSmartContractFunctionFromAnotherClient
}