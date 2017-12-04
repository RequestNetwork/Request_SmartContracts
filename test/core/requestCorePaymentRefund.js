var config = require("../config.js");
var utils = require("../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

var BigNumber = require('bignumber.js');
var BN = require('bn.js');

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
		
		await requestCore.adminAddTrustedCurrencyContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedCurrencyContract(fakeContract2, {from:admin});

		var newRequest = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, 0, "", {from:fakeContract});
    })

	// ##################################################################################################
	// ### Payment test unit #############################################################################
	// ##################################################################################################
	// payment request already accepted OK
	it("payment request accepted OK - check event log and request status", async function () {
		await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.payment(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount10percent,"Event Payment wrong args balance");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],1,"new request wrong data : state");
	});

	// payment request already canceled OK
	it("payment request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});
		var r = await requestCore.payment(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after payment()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount10percent,"Event Payment wrong args balance");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],2,"new request wrong data : state");
	});

	it("payment if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestCore.payment(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after payment()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount10percent,"Event Payment wrong args balance");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("payment request not exist impossible", async function () {
		await utils.expectThrow(requestCore.payment(2, arbitraryAmount10percent, {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(2), {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : expectedAmount");
		assert.equal(r[4],0,"new request wrong data : currencyContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("payment request from a random guy impossible", async function () {
		await utils.expectThrow(requestCore.payment(utils.getHashRequest(1), arbitraryAmount10percent, {from:otherguy}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("payment request from other subcontract impossible", async function () {
		await utils.expectThrow(requestCore.payment(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract2}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});


	it("new payment _amount==0 OK", async function () {
		var r = await requestCore.payment(utils.getHashRequest(1), 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,0,"Event Payment wrong args balance");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new payment _amount >= 2^256 impossible", async function () {
		await utils.expectThrow(requestCore.payment(utils.getHashRequest(1), new BigNumber(2).pow(256), {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	// seems buggy -> issue on truffle
	// it("new payment _amount+request.amounPaid > 2^255 (overflow) impossible", async function () {
		
	// 	var n = await requestCore.payment2(utils.getHashRequest(1), new BigNumber(2).pow(254), {from:fakeContract});

	// 	await utils.expectThrow(requestCore.payment(utils.getHashRequest(1), new BigNumber(2).pow(254), {from:fakeContract}));

	// 	var r = await requestCore.requests.call(utils.getHashRequest(1));

	// 	assert.equal(r[0],creator,"request wrong data : creator");
	// 	assert.equal(r[1],payee,"request wrong data : payee");
	// 	assert.equal(r[2],payer,"request wrong data : payer");
	// 	assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
	// 	assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
	// 	assert.equal(new BigNumber(2).pow(254).comparedTo(r[5]),0,"new request wrong data : balance");
	// 	assert.equal(r[6],0,"new request wrong data : state");
	// });


	it("new payment _amount+request.amounPaid == expectedAmount-request.amountSubtract+request.amountAdditional", async function () {
		var r = await requestCore.payment(utils.getHashRequest(1), arbitraryAmount, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after payment()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount,"Event Payment wrong args balance");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new payment _amount+request.amounPaid > expectedAmount-request.amountSubtract+request.amountAdditional", async function () {
		var r = await requestCore.payment(utils.getHashRequest(1), arbitraryAmount*2, {from:fakeContract});

		assert.equal(r.logs[0].event,"Payment","Event Payment is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Payment wrong args requestId");
		assert.equal(r.logs[0].args.amountPaid,arbitraryAmount*2,"Event Payment wrong args balance");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount*2,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ### Refund test unit #############################################################################
	// ##################################################################################################
	it("refund request created OK - check event log and request status", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		var r = await requestCore.refund(utils.getHashRequest(1), arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});
	// refund request already accepted OK
	it("refund request accepted OK - check event log and request status", async function () {
		await requestCore.accept(utils.getHashRequest(1), {from:fakeContract});
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});

		var r = await requestCore.refund(utils.getHashRequest(1), arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],1,"new request wrong data : state");
	});

	// refund request already canceled OK
	it("refund request canceled OK - check event log and request status", async function () {
		await requestCore.cancel(utils.getHashRequest(1), {from:fakeContract});
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});

		var r = await requestCore.refund(utils.getHashRequest(1), arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],2,"new request wrong data : state");
	});

	it("refund if Core Paused OK", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		await requestCore.pause({from:admin});

		var r = await requestCore.refund(utils.getHashRequest(1), arbitraryAmount20percent, {from:fakeContract});

		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("refund request not exist impossible", async function () {
		await utils.expectThrow(requestCore.refund(utils.getHashRequest(2), arbitraryAmount10percent, {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(2), {from:fakeContract});
		assert.equal(r[0],0,"request wrong data : creator");
		assert.equal(r[1],0,"request wrong data : payee");
		assert.equal(r[2],0,"request wrong data : payer");
		assert.equal(r[3],0,"request wrong data : expectedAmount");
		assert.equal(r[4],0,"new request wrong data : currencyContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("refund request from a random guy impossible", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		await utils.expectThrow(requestCore.refund(utils.getHashRequest(1), arbitraryAmount10percent, {from:otherguy}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("refund request from other subcontract impossible", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		await utils.expectThrow(requestCore.refund(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract2}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new refund _amount==0 OK", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		var r = await requestCore.refund(utils.getHashRequest(1), 0, {from:fakeContract});
		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,0,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	// new refund _amount >= 2^256 impossible
	it("new refund _amount >= 2^256 impossible", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		await utils.expectThrow(requestCore.refund(utils.getHashRequest(1), new BigNumber(2).pow(256), {from:fakeContract}));

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount30percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new refund r.amounPaid - _amount < 0 OK", async function () {
		await requestCore.refund(utils.getHashRequest(1), 1, {from:fakeContract});

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],-1,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new refund r.amounPaid - _amount == 0 OK", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		var r = await requestCore.refund(utils.getHashRequest(1), arbitraryAmount30percent, {from:fakeContract});
		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount30percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],0,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});

	it("new refund after a other refund", async function () {
		await requestCore.payment(utils.getHashRequest(1), arbitraryAmount40percent, {from:fakeContract});
		await requestCore.refund(utils.getHashRequest(1), arbitraryAmount10percent, {from:fakeContract});
		var r = await requestCore.refund(utils.getHashRequest(1), arbitraryAmount20percent, {from:fakeContract});
		assert.equal(r.logs[0].event,"Refunded","Event Refunded is missing after accept()");
		assert.equal(r.logs[0].args.requestId,utils.getHashRequest(1),"Event Refunded wrong args requestId");
		assert.equal(r.logs[0].args.amountRefunded,arbitraryAmount20percent,"Event Refunded wrong args amountRefunded");

		var r = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(r[0],creator,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : expectedAmount");
		assert.equal(r[4],fakeContract,"new request wrong data : currencyContract");
		assert.equal(r[5],arbitraryAmount10percent,"new request wrong data : balance");
		
		
		assert.equal(r[6],0,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


});


