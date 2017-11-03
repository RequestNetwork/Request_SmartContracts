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

		var newRequest = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, 0, {from:fakeContract});
    })

	// ##################################################################################################
	// ### Additional test unit #############################################################################
	// ##################################################################################################
	it("additional on request created OK", async function () {
		var r = await requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],arbitraryAmount10percent,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	// additional on request already accepted OK
	it("additional on request accepted OK", async function () {
		await requestCore.accept(1, {from:fakeContract});
		var r = await requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],arbitraryAmount10percent,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});
	// addAdditional request already declined OK
	it("addAdditional request declined OK", async function () {
		await requestCore.decline(1, {from:fakeContract});
		var r = await requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],arbitraryAmount10percent,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});
	// addAdditional request already canceled OK
	it("addAdditional request canceled OK", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		var r = await requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,arbitraryAmount10percent,"Event AddAdditional wrong args amountAdded");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],arbitraryAmount10percent,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});

	it("impossible to addAdditional if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await expectThrow(requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract}));

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

	it("addAdditional request not exist impossible", async function () {
		await expectThrow(requestCore.addAdditional(2, arbitraryAmount10percent, {from:fakeContract}));

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

	it("addAdditional request from a random guy impossible", async function () {
		await expectThrow(requestCore.addAdditional(1, arbitraryAmount10percent, {from:otherguy}));

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

	it("addAdditional request from other subcontract impossible", async function () {
		await expectThrow(requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract2}));

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

	it("new subtract after a other additional", async function () {
		await requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract});
		await requestCore.addAdditional(1, arbitraryAmount10percent, {from:fakeContract});

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],arbitraryAmount20percent,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("new addAdditional _amount==0 OK", async function () {
		var r = await requestCore.addAdditional(1, 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"AddAdditional","Event AddAdditional is missing after addAdditional()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddAdditional wrong args requestId");
		assert.equal(r.logs[0].args.amountAdded,0,"Event AddAdditional wrong args amountAdded");

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

	it("new addAdditional _amount >= 2^256 impossible", async function () {
		await expectThrow(requestCore.addAdditional(1, new BigNumber(2).pow(256), {from:fakeContract}));

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



	it("new additional _amount+request.amountAdditional >= 2^256 (overflow) impossible", async function () {
		await requestCore.addAdditional(1, new BigNumber(2).pow(255), {from:fakeContract});

		await expectThrow(requestCore.addAdditional(1, new BigNumber(2).pow(255), {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(new BigNumber(2).pow(255).comparedTo(r[6]),0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

// 


	it("new additional _amount+request.amountAdditional+amountExpected >= 2^256 (overflow) impossible", async function () {
		var r = await requestCore.addAdditional(1, new BigNumber(2).pow(256).minus(arbitraryAmount*2), {from:fakeContract});

		await expectThrow(requestCore.addAdditional(1, arbitraryAmount, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(new BigNumber(2).pow(256).minus(arbitraryAmount*2).comparedTo(r[6]),0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################





	// ##################################################################################################
	// ### Subtract test unit #############################################################################
	// ##################################################################################################
	it("subtract on request created OK", async function () {
		var r = await requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],arbitraryAmount10percent,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	// subtract on request already accepted OK
	it("subtract on request accepted OK", async function () {
		await requestCore.accept(1, {from:fakeContract});
		var r = await requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],arbitraryAmount10percent,"new request wrong data : amountSubtract");
		assert.equal(r[8],1,"new request wrong data : state");
	});
	// addSubtract request already declined OK
	it("addSubtract request declined OK", async function () {
		await requestCore.decline(1, {from:fakeContract});
		var r = await requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],arbitraryAmount10percent,"new request wrong data : amountSubtract");
		assert.equal(r[8],2,"new request wrong data : state");
	});
	// addSubtract request already canceled OK
	it("addSubtract request canceled OK", async function () {
		await requestCore.cancel(1, {from:fakeContract});
		var r = await requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,arbitraryAmount10percent,"Event AddSubtract wrong args amountSubtracted");

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],arbitraryAmount10percent,"new request wrong data : amountSubtract");
		assert.equal(r[8],3,"new request wrong data : state");
	});

	it("impossible to addSubtract if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await expectThrow(requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract}));

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

	it("addSubtract request not exist impossible", async function () {
		await expectThrow(requestCore.addSubtract(2, arbitraryAmount10percent, {from:fakeContract}));

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

	it("addSubtract request from a random guy impossible", async function () {
		await expectThrow(requestCore.addSubtract(1, arbitraryAmount10percent, {from:otherguy}));

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

	it("addSubtract request from other subcontract impossible", async function () {
		await expectThrow(requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract2}));

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

	it("new addSubtract _amount==0 OK", async function () {
		var r = await requestCore.addSubtract(1, 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"AddSubtract","Event AddSubtract is missing after addSubtract()");
		assert.equal(r.logs[0].args.requestId,1,"Event AddSubtract wrong args requestId");
		assert.equal(r.logs[0].args.amountSubtracted,0,"Event AddSubtract wrong args amountSubtracted");

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

	it("new addSubtract _amount >= 2^256 impossible", async function () {
		await expectThrow(requestCore.addSubtract(1, new BigNumber(2).pow(256), {from:fakeContract}));

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

	it("new subtract after a other subtract", async function () {
		await requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract});
		await requestCore.addSubtract(1, arbitraryAmount10percent, {from:fakeContract});

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],arbitraryAmount20percent,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});

	it("new subtract _amount+request.amountSubtract >= 2^256 (overflow) impossible", async function () {
		newRequest = await requestCore.createRequest(creator, payee, payer, new BigNumber(2).pow(256).minus(1), 0, {from:fakeContract});
		await requestCore.addSubtract(2, new BigNumber(2).pow(255), {from:fakeContract});
		await expectThrow(requestCore.addSubtract(2, new BigNumber(2).pow(255), {from:fakeContract}));

		var r = await requestCore.requests.call(2, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(new BigNumber(2).pow(256).minus(1).comparedTo(r[3]),0,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(new BigNumber(2).pow(255).comparedTo(r[7]),0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});


	it("new subtract amountExpected - _amount - request.amountsubtract < 0 (underflow) impossible", async function () {
		var r = await requestCore.addSubtract(1, arbitraryAmount60percent, {from:fakeContract});

		await expectThrow(requestCore.addSubtract(1, arbitraryAmount60percent, {from:fakeContract}));

		var r = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],fakeContract,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],arbitraryAmount60percent,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################
});


