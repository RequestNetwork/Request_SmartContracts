var config = require("../config.js");
var utils = require("../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

var BigNumber = require('bignumber.js');

contract('RequestCore Accept & Cancel Request', function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var creator = accounts[5];
	var fakeContract2 = accounts[6];

	var arbitraryAmount = 100000000;

	var requestCore;
	var newRequest;

    beforeEach(async () => {
		requestCore = await RequestCore.new();

		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract2, {from:admin});

		var newRequest = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, 0, "", {from:fakeContract});
    })


	// ##################################################################################################
	// ### Accept test unit #############################################################################
	// ##################################################################################################

	// accept request created OK - check event log and request status
	it("accept request created OK - check event log and request status", async function () {
		var r = await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],1,"new request wrong data : state");
	});

	// accept request already accepted OK
	it("accept request accepted OK - check event log and request status", async function () {
		await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],1,"new request wrong data : state");
	});

	// accept request already canceled OK
	it("accept request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],1,"new request wrong data : state");
	});

	it("accept if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],1,"new request wrong data : state");
	});

	it("accept request not exist impossible", async function () {
		await utils.expectThrow(requestCore.accept(utils.getHashRequest(2), {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(2), {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : amountExpected");
		assert.equal(r[4],0,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("accept request from a random guy impossible", async function () {
		await utils.expectThrow(requestCore.accept(utils.getHashRequest(1), {from:otherguy}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("accept request from other subcontract impossible", async function () {
		await utils.expectThrow(requestCore.accept(utils.getHashRequest(1), {from:fakeContract2}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],0,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ### Cancel test unit #############################################################################
	// ##################################################################################################

	// cancel request created OK - check event log and request status
	it("cancel request created OK - check event log and request status", async function () {
		var r = await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],2,"new request wrong data : state");
	});

	// cancel request already accepted OK
	it("cancel request accepted OK - check event log and request status", async function () {
		await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],2,"new request wrong data : state");
	});

	// cancel request already canceled OK
	it("cancel request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],2,"new request wrong data : state");
	});

	it("cancel if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],2,"new request wrong data : state");
	});

	it("cancel request not exist impossible", async function () {
		await utils.expectThrow(requestCore.cancel(utils.getHashRequest(2), {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(2), {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : amountExpected");
		assert.equal(r[4],0,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("cancel request from a random guy impossible", async function () {
		await utils.expectThrow(requestCore.cancel(utils.getHashRequest(1), {from:otherguy}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("cancel request from other subcontract impossible", async function () {
		await utils.expectThrow(requestCore.cancel(utils.getHashRequest(1), {from:fakeContract2}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : balance");


		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("cancel request balance != 0 OK", async function () {
		await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});
		await requestCore.payment(utils.getHashRequest(1), 1, {from:fakeContract});
		r = await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],1,"new request wrong data : balance");


		assert.equal(r[6],2,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################
});


