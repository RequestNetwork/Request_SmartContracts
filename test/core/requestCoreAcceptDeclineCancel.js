var config = require("../config.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

var BigNumber = require('bignumber.js');

var expectThrow = async function(promise) {
  try {
    await promise;
  } catch (error) {
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    const invalidJump = error.message.search('invalid JUMP') >= 0;
    const outOfGas = error.message.search('out of gas') >= 0;
    assert(
      invalidOpcode || invalidJump || outOfGas,
      "Expected throw, got '" + error + "' instead",
    );
    return;
  }
  assert.fail('Expected throw not received');
};


contract('RequestCore Accept Decline & Cancel Request', function(accounts) {
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

		var newRequest = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, [], {from:fakeContract});
    })


	// ##################################################################################################
	// ### Accept test unit #############################################################################
	// ##################################################################################################

	// accept request created OK - check event log and request status
	it("accept request created OK - check event log and request status", async function () {
		var r = await requestCore.accept(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});

	// accept request already accepted OK
	it("accept request accepted OK - check event log and request status", async function () {
		await requestCore.accept(1, {from:fakeContract});
		var r = await requestCore.accept(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});
	// accept request already declined OK
	it("accept request declined OK - check event log and request status", async function () {
		await requestCore.decline(1, {from:fakeContract});
		var r = await requestCore.accept(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});
	// accept request already canceled OK
	it("accept request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		var r = await requestCore.accept(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Accepted","Event Accepted is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Accepted wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});

	it("impossible to accept if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await expectThrow(requestCore.accept(1, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("accept request not exist impossible", async function () {
		await expectThrow(requestCore.accept(2, {from:fakeContract}));

		var r = await requestCore.requests.call(2, {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : amountExpected");
		assert.equal(r[4],0,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("accept request from a random guy impossible", async function () {
		await expectThrow(requestCore.accept(1, {from:otherguy}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("accept request from other subcontract impossible", async function () {
		await expectThrow(requestCore.accept(1, {from:fakeContract2}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ### Decline test unit ############################################################################
	// ##################################################################################################

	// decline request created OK - check event log and request status
	it("decline request created OK - check event log and request status", async function () {
		var r = await requestCore.decline(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Declined","Event Declined is missing after decline()");
		assert.equal(r.logs[0].args.requestId,1,"Event Declined wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});

	// decline request already accepted OK
	it("decline request accepted OK - check event log and request status", async function () {
		await requestCore.decline(1, {from:fakeContract});
		var r = await requestCore.decline(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Declined","Event Declined is missing after decline()");
		assert.equal(r.logs[0].args.requestId,1,"Event Declined wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});
	// decline request already declined OK
	it("decline request declined OK - check event log and request status", async function () {
		await requestCore.decline(1, {from:fakeContract});
		var r = await requestCore.decline(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Declined","Event Declined is missing after decline()");
		assert.equal(r.logs[0].args.requestId,1,"Event Declined wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});
	// decline request already canceled OK
	it("decline request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		var r = await requestCore.decline(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Declined","Event Declined is missing after decline()");
		assert.equal(r.logs[0].args.requestId,1,"Event Declined wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});


	it("impossible to decline if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await expectThrow(requestCore.decline(1, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("decline request not exist impossible", async function () {
		await expectThrow(requestCore.decline(2, {from:fakeContract}));

		var r = await requestCore.requests.call(2, {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : amountExpected");
		assert.equal(r[4],0,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("decline request from a random guy impossible", async function () {
		await expectThrow(requestCore.decline(1, {from:otherguy}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("decline request from other subcontract impossible", async function () {
		await expectThrow(requestCore.decline(1, {from:fakeContract2}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

	// ##################################################################################################
	// ### Cancel test unit #############################################################################
	// ##################################################################################################

	// cancel request created OK - check event log and request status
	it("cancel request created OK - check event log and request status", async function () {
		var r = await requestCore.cancel(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,1,"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});

	// cancel request already accepted OK
	it("cancel request accepted OK - check event log and request status", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		var r = await requestCore.cancel(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,1,"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});
	// cancel request already canceld OK
	it("cancel request declined OK - check event log and request status", async function () {
		await requestCore.decline(1, {from:fakeContract});
		var r = await requestCore.cancel(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,1,"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});
	// cancel request already canceled OK
	it("cancel request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		var r = await requestCore.cancel(1, {from:fakeContract});

		assert.equal(r.logs[0].event,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.logs[0].args.requestId,1,"Event Canceled wrong args requestId");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});

	it("impossible to cancel if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await expectThrow(requestCore.cancel(1, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("cancel request not exist impossible", async function () {
		await expectThrow(requestCore.cancel(2, {from:fakeContract}));

		var r = await requestCore.requests.call(2, {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : amountExpected");
		assert.equal(r[4],0,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("cancel request from a random guy impossible", async function () {
		await expectThrow(requestCore.cancel(1, {from:otherguy}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("cancel request from other subcontract impossible", async function () {
		await expectThrow(requestCore.cancel(1, {from:fakeContract2}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("cancel request amountPaid != 0 Impossible", async function () {
		await requestCore.accept(1, {from:fakeContract});
		await requestCore.payment(1, 1, {from:fakeContract});
		await expectThrow(requestCore.cancel(1, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],1,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################
});


