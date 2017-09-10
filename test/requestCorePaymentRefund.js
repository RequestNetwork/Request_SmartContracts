// return;
var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");


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


contract('RequestCore Payment & Refund Request', function(accounts) {
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

	var requestCore;
	var newRequest;

    beforeEach(async () => {
		requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract2, {from:admin});

		var newRequest = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, [], {from:fakeContract});
    })

	// ##################################################################################################
	// ### Payment test unit #############################################################################
	// ##################################################################################################
	// payment request already accepted OK
	it("payment request accepted OK - check event log and request status", async function () {
		await requestCore.accept(1, {from:fakeContract});
		var r = await requestCore.payment(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount10percent,"Event Payment wrong args amountPaid");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});
	// payment request already declined OK
	it("payment request declined OK - check event log and request status", async function () {
		await requestCore.decline(1, {from:fakeContract});
		var r = await requestCore.payment(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after payment()");
		assert.equal(r.logs[0].args.requestId,1,"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount10percent,"Event Payment wrong args amountPaid");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});
	// payment request already canceled OK
	it("payment request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		var r = await requestCore.payment(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after payment()");
		assert.equal(r.logs[0].args.requestId,1,"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount10percent,"Event Payment wrong args amountPaid");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});

	it("impossible to payment if Core Paused", async function () {
		await requestCore.adminPause({from:admin});
		await expectThrow(requestCore.payment(1, arbitraryAmount10percent, {from:fakeContract}));

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
	it("impossible to payment if Core Deprecated", async function () {
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestCore.payment(1, arbitraryAmount10percent, {from:fakeContract}));

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

	it("payment request not exist impossible", async function () {
		await expectThrow(requestCore.payment(2, arbitraryAmount10percent, {from:fakeContract}));

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

	it("payment request from a random guy impossible", async function () {
		await expectThrow(requestCore.payment(1, arbitraryAmount10percent, {from:otherguy}));

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

	it("payment request from other subcontract impossible", async function () {
		await expectThrow(requestCore.payment(1, arbitraryAmount10percent, {from:fakeContract2}));

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


	it("new payment _amount==0 OK", async function () {
		var r = await requestCore.payment(1, 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,0,"Event Payment wrong args amountPaid");

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

	it("new payment _amount >= 2^256 impossible", async function () {
		await expectThrow(requestCore.payment(1, new BigNumber(2).pow(256), {from:fakeContract}));

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

	it("new payment _amount+request.amounPaid > 2^256 (overflow) impossible", async function () {
		await requestCore.payment(1, new BigNumber(2).pow(255), {from:fakeContract});

		await expectThrow(requestCore.payment(1, new BigNumber(2).pow(255), {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(new BigNumber(2).pow(255).comparedTo(r[5]),0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});


	it("new payment _amount+request.amounPaid == amountExpected-request.amountSubtract+request.amountAdditional", async function () {
		var r = await requestCore.payment(1, arbitraryAmount, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount,"Event Payment wrong args amountPaid");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("new payment _amount+request.amounPaid > amountExpected-request.amountSubtract+request.amountAdditional", async function () {
		var r = await requestCore.payment(1, arbitraryAmount*2, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount*2,"Event Payment wrong args amountPaid");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount*2,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ### Refund test unit #############################################################################
	// ##################################################################################################
	it("refund request created OK - check event log and request status", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		var r = await requestCore.refund(1, arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	// refund request already accepted OK
	it("refund request accepted OK - check event log and request status", async function () {
		await requestCore.accept(1, {from:fakeContract});
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});

		var r = await requestCore.refund(1, arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});
	// refund request already declined OK
	it("refund request declined OK - check event log and request status", async function () {
		await requestCore.decline(1, {from:fakeContract});
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});

		var r = await requestCore.refund(1, arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});
	// refund request already canceled OK
	it("refund request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});

		var r = await requestCore.refund(1, arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});

	it("impossible to refund if Core Paused", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		await requestCore.adminPause({from:admin});

		await expectThrow(requestCore.refund(1, arbitraryAmount10percent, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	it("impossible to refund if Core Deprecated", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestCore.refund(1, arbitraryAmount10percent, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("refund request not exist impossible", async function () {
		await expectThrow(requestCore.refund(2, arbitraryAmount10percent, {from:fakeContract}));

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

	it("refund request from a random guy impossible", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		await expectThrow(requestCore.refund(1, arbitraryAmount10percent, {from:otherguy}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("refund request from other subcontract impossible", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		await expectThrow(requestCore.refund(1, arbitraryAmount10percent, {from:fakeContract2}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("new refund _amount==0 OK", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		var r = await requestCore.refund(1, 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,0,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	// new refund _amount >= 2^256 impossible
	it("new refund _amount >= 2^256 impossible", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		await expectThrow(requestCore.refund(1, new BigNumber(2).pow(256), {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("new refund r.amounPaid - _amount < 0 (underflow) impossible", async function () {
		await expectThrow(requestCore.refund(1, 1, {from:fakeContract}));

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

	it("new refund r.amounPaid - _amount == 0 OK", async function () {
		await requestCore.payment(1, arbitraryAmount30percent, {from:fakeContract});
		var r = await requestCore.refund(1, arbitraryAmount30percent, {from:fakeContract});
		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount30percent,"Event Refunded wrong args amountRefunded");

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

	it("new refund after a other refund", async function () {
		await requestCore.payment(1, arbitraryAmount40percent, {from:fakeContract});
		await requestCore.refund(1, arbitraryAmount10percent, {from:fakeContract});
		var r = await requestCore.refund(1, arbitraryAmount20percent, {from:fakeContract});
		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,1,"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


});


