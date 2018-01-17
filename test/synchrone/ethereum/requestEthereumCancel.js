var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}


var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

// contract for test
var RequestBurnManagerSimple = artifacts.require("./collect/RequestBurnManagerSimple.sol");
var BigNumber = require('bignumber.js');


contract('RequestEthereum Cancel',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];

	var requestCore;
	var requestEthereum;
	var newRequest;

	var arbitraryAmount = 1000;

    beforeEach(async () => {
		requestCore = await RequestCore.new({from:admin});
		var requestBurnManagerSimple = await RequestBurnManagerSimple.new(0); 
		await requestCore.setBurnManager(requestBurnManagerSimple.address, {from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

		await requestCore.adminAddTrustedCurrencyContract(requestEthereum.address, {from:admin});

		var newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, 0, [], "", {from:payee});
    });

	// ##################################################################################################
	// ### Cancel test unit #############################################################################
	// ##################################################################################################
	it("cancel if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = utils.getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.receipt.logs[0].topics[1],utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		
		
		assert.equal(newReq[6],2,"new request wrong data : state");
	});	

	it("cancel if untrusted currencyContract", async function () {
		await requestCore.adminRemoveTrustedCurrencyContract(requestEthereum.address, {from:admin});

		var r = await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = utils.getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.receipt.logs[0].topics[1],utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		
		
		assert.equal(newReq[6],2,"new request wrong data : state");
	});

	it("cancel request Ethereum pause impossible", async function () {
		await requestEthereum.pause({from:admin});
		await utils.expectThrow(requestEthereum.cancel(utils.getHashRequest(1), {from:payee}));
	});

	it("cancel request not exist impossible", async function () {
		await utils.expectThrow(requestEthereum.cancel(666, {from:payer}));
	});

	it("cancel request from a random guy impossible", async function () {
		await utils.expectThrow(requestEthereum.cancel(utils.getHashRequest(1), {from:otherguy}));
	});

	it("cancel by payee request canceled impossible", async function () {
		await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		await utils.expectThrow(requestEthereum.cancel(utils.getHashRequest(1), {from:payee}));
	});

	it("cancel by payee request already accepted OK if amount == 0", async function () {
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		
		
		assert.equal(newReq[6],2,"new request wrong data : state");
	});

	it("cancel request amountPaid != 0 Impossible", async function () {
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await requestEthereum.paymentAction(utils.getHashRequest(1), 0, {from:payer,value:10});
		await utils.expectThrow(requestEthereum.cancel(utils.getHashRequest(1), {from:payee}));

		var newReq = await requestCore.requests.call(utils.getHashRequest(1), {from:fakeContract});
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],10,"new request wrong data : balance");
		
		
		assert.equal(newReq[6],1,"new request wrong data : state");
	});

	it("cancel request created OK", async function () {
		var r = await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = utils.getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(r.receipt.logs[0].topics[1],utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		
		
		assert.equal(newReq[6],2,"new request wrong data : state");
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################
});

