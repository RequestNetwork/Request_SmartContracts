var config = require("../config.js");
var utils = require("../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}
var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");
var BigNumber = require('bignumber.js');


contract('RequestCore Create Request', function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var creator = accounts[5];
	var fakeExtention1 = accounts[6];
	var fakeExtention2 = accounts[7];
	var fakeExtention3 = accounts[8];
	var fakeExtention4 = accounts[9];

	var arbitraryAmount = 100000000;


	// requestId start at 1 when Core is created
	it("Creation Core, requestId start at 0", async function () {
		var requestCore = await RequestCore.new();
		assert.equal(await requestCore.numRequests.call(),"0","RequestId start by 0");
	});

	// new request from non trustable sender (contract trusted) impossible
	it("request from non trustable sender (contract trusted) impossible", async function () {
		var requestCore = await RequestCore.new();
		await utils.expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, 0, {from:fakeContract}));
	});

	// impossible to createRequest if Core Paused
	it("impossible to createRequest if Core Paused", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.pause({from:admin});

		await utils.expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, 0, {from:fakeContract}));
	});

	// new request _creator==0 impossible
	// new request payee==0 impossible
	// new request payer==0 impossible
	// new request payee==payer impossible
	it("Actors not null and payee!=payer", async function () {
		var requestCore = await RequestCore.new();

		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await utils.expectThrow(requestCore.createRequest(0, payee, payer, arbitraryAmount, 0, {from:fakeContract}));
		await utils.expectThrow(requestCore.createRequest(creator, 0, payer, arbitraryAmount, 0, {from:fakeContract}));
		await utils.expectThrow(requestCore.createRequest(creator, payee, 0, arbitraryAmount, 0, {from:fakeContract}));
		await utils.expectThrow(requestCore.createRequest(creator, payee, payee, arbitraryAmount, 0, {from:fakeContract}));
	});


	// new request _amountExpected == 0 impossible
	// new request _amountExpected < 0 impossible /!\
	// new request _amountExpected > 2^256 impossible
	it("amountExpected more than zero and not more than 2^256", async function () {
		var requestCore = await RequestCore.new();

		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await utils.expectThrow(requestCore.createRequest(creator, payee, payer, 0, 0, {from:fakeContract}));
		// problem here : how to test it ? /!\
		// await utils.expectThrow(requestCore.createRequest(payee, payee, payer, -1, [], {from:fakeContract}));
		await utils.expectThrow(requestCore.createRequest(creator, payee, payer, new BigNumber(2).pow(256), 0, {from:fakeContract}));
	});


	// new request without extensions
	it("new request without extensions", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		var r = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"Created","Event Created is missing after createRequest()");
		assert.equal(r.logs[0].args.requestId, utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(r.logs[0].args.payee,payee,"Event Created wrong args payee");
		assert.equal(r.logs[0].args.payer,payer,"Event Created wrong args payer");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],creator,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],fakeContract,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],0,"new request wrong data : state");

		var newReqExtension = await requestCore.getExtension.call(utils.getHashRequest(1));
		assert.equal(newReqExtension,0,"new request wrong data : Extension[0]");
	});

	// new request with 1 extension trusted
	it("new request with 1 extension valid", async function () {
		var requestCore = await RequestCore.new();

		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});

		var r = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, fakeExtention1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Created","Event Created is missing after createRequest()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(r.logs[0].args.payee,payee,"Event Created wrong args payee");
		assert.equal(r.logs[0].args.payer,payer,"Event Created wrong args payer");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],creator,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],fakeContract,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],0,"new request wrong data : state");


		var newReqExtension = await requestCore.getExtension.call(utils.getHashRequest(1));
		assert.equal(newReqExtension,fakeExtention1,"new request wrong data : Extension");
	});


	// new request with 1 extension not trusted
	it("new request with 1 extension not trusted", async function () {
		var requestCore = await RequestCore.new();

		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await utils.expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, fakeExtention1, {from:fakeContract}));
	});

});


