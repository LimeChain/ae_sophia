const chai = require('chai');
const assert = chai.assert;

const AeSDK = require('@aeternity/aepp-sdk');
const Aepp = AeSDK.Aepp;

describe('ERC721', () => {
	it('should test', () => {
		assert.isDefined(Aepp, 'Aepp is not defined');
	})
})