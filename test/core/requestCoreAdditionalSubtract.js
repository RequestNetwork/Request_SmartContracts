var config = require("../config.js");
var utils = require("../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

var BigNumber = require('bignumber.js');

contract('RequestCore Additional & Subtract Request', function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var creator = accounts[5];
	var fakeContract2 = accounts[6];

	var arbitraryAmount = 100000000;
	var arbitraryAmount10percent = 10000000;
	var arbitraryAmount20percent = 20000000;
	var arbitraryAmount30percent = 30000000;
	var arbitraryAmount40percent = 40000000;
	var arbitraryAmount60percent = 60000000;

	var requestCore;
	var newRequest;

    beforeEach(async () => {
		requestCore = await RequestCore.new();

		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract2, {from:admin});

		var newRequest = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, 0, "", {from:fakeContract});
    })

	// ##################################################################################################
	// ### Additional test unit #############################################################################
	// ##################################################################################################
	it("additional on request created OK", async function () {
		var r = await requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount+arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});
	// additional on request already accepted OK
	it("additional on request accepted OK", async function () {
		await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount+arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],1,"new request wrong data : state");
	});

	// addAdditional request already canceled OK
	it("addAdditional request canceled OK", async function () {
		await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount+arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],2,"new request wrong data : state");
	});

	it("addAdditional if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount+arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("addAdditional request not exist impossible", async function () {
		await utils.expectThrow(requestCore.addAdditional(utils.getHashRequest(2), arbitraryAmount10percent, {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(2), {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : amountExpected");
		assert.equal(r[4],0,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("addAdditional request from a random guy impossible", async function () {
		await utils.expectThrow(requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:otherguy}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("addAdditional request from other subcontract impossible", async function () {
		await utils.expectThrow(requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract2}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new subtract after a other additional", async function () {
		await requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});
		await requestCore.addAdditional(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount+arbitraryAmount20percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new addAdditional _amount==0 OK", async function () {
		var r = await requestCore.addAdditional(utils.getHashRequest(1), 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,0,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new addAdditional _amount >= 2^256 impossible", async function () {
		await utils.expectThrow(requestCore.addAdditional(utils.getHashRequest(1), new BigNumber(2).pow(256), {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});



	it("new additional balance + amountAdditional >= 2^255 (overflow) impossible", async function () {
		await utils.expectThrow(requestCore.addAdditional(utils.getHashRequest(1), new BigNumber(2).pow(255), {from:fakeContract}));
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################





	// ##################################################################################################
	// ### Subtract test unit #############################################################################
	// ##################################################################################################
	it("subtract on request created OK", async function () {
		var r = await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount-arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});
	// subtract on request already accepted OK
	it("subtract on request accepted OK", async function () {
		await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount-arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],1,"new request wrong data : state");
	});

	// addSubtract request already canceled OK
	it("addSubtract request canceled OK", async function () {
		await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount-arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],2,"new request wrong data : state");
	});

	it("addSubtract if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount-arbitraryAmount10percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
	});

	it("addSubtract request not exist impossible", async function () {
		await utils.expectThrow(requestCore.addSubtract(utils.getHashRequest(2), arbitraryAmount10percent, {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(2), {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : amountExpected");
		assert.equal(r[4],0,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("addSubtract request from a random guy impossible", async function () {
		await utils.expectThrow(requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:otherguy}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("addSubtract request from other subcontract impossible", async function () {
		await utils.expectThrow(requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract2}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new addSubtract _amount==0 OK", async function () {
		var r = await requestCore.addSubtract(utils.getHashRequest(1), 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,0,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new addSubtract _amount >= 2^256 impossible", async function () {
		await utils.expectThrow(requestCore.addSubtract(utils.getHashRequest(1), new BigNumber(2).pow(256), {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new subtract after a other subtract", async function () {
		await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});
		await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount-arbitraryAmount20percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});

	// seems buggy -> issue on truffle
	// it("new subtract balance - amountSubtract >= 2^255 (overflow) impossible", async function () {
	// 	newRequest = await requestCore.createRequest(creator, payee, payer, 0, 0, "", {from:fakeContract});
	// 	await requestCore.addSubtract(utils.getHashRequest(2), new BigNumber(2).pow(254), {from:fakeContract});
	// 	await utils.expectThrow(requestCore.addSubtract(utils.getHashRequest(2), new BigNumber(2).pow(254), {from:fakeContract}));

	// 	var r = await requestCore.requests.call(utils.getHashRequest(2), {from:fakeContract});
	// 	assert.equal(r[0],creator,"request wrong data : creator");
	// 	assert.equal(r[1],payee,"request wrong data : payee");
	// 	assert.equal(r[2],payer,"request wrong data : payer");
	// 	assert.equal(new BigNumber(0).minus(new BigNumber(2).pow(254)).comparedTo(r[3]),0,"request wrong data : amountExpected");
	// 	assert.equal(r[4],fakeContract,"new request wrong data : subContract");
	// 	assert.equal(r[5],0,"new request wrong data : balance");
	// 	assert.equal(r[6],0,"new request wrong data : state");
	// });


	it("new subtract amountExpected - _amount - amountsubtract < 0 OK", async function () {
		var r = await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount60percent, {from:fakeContract});

		await requestCore.addSubtract(utils.getHashRequest(1), arbitraryAmount60percent, {from:fakeContract});

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount-arbitraryAmount60percent-arbitraryAmount60percent,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		assert.equal(r[6],0,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################
});


