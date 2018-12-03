/*
 * ISC License (ISC)
 * Copyright (c) 2018 aeternity developers
 *
 *  Permission to use, copy, modify, and/or distribute this software for any
 *  purpose with or without fee is hereby granted, provided that the above
 *  copyright notice and this permission notice appear in all copies.
 *
 *  THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
 *  REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
 *  AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
 *  INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
 *  LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
 *  OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
 *  PERFORMANCE OF THIS SOFTWARE.
 */
const Ae = require('@aeternity/aepp-sdk').Universal;
const Deployer = require('aeproject').Deployer;
const gasLimit = 1000000;

const deploy = async (network, privateKey) => {
	let deployer = new Deployer(network, privateKey)

	let deployedContract = await deployer.deploy("./contracts/multisig/test.aes", 200000, "1")
	// const result = await deployedContract.call('addTransaction', { args: `"vote"`, options: { ttl: 123, gas: 200000 } });
	// const result21 = await deployedContract.call('approve', { args: `0`, options: { ttl: 123, gas: 200000 } });
	// const result3 = await deployedContract.call('getConfirmations', { args: `0`, options: { ttl: 123, gas: 200000 } });
	const result3 = await deployedContract.call('execute', { args: `0`, options: { ttl: 123, gas: 200000 } });
	
	// const result3Decode = await result3.decode("int");
	
	// console.log(result3Decode)
	// deployer.deploy("./contracts/ExampleContract.aes", gasLimit)
	// deployer.deploy("./contracts/ExampleContract.aes", gasLimit, {tokenName: "tkn"})

	//todo edit package.json
	//todo command keypair rework
};

module.exports = {
	deploy
};
