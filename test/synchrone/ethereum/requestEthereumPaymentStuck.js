var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}
var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");
// contract for test
var TestRequestPaymentStuckRevert = artifacts.require("./test/synchrone/TestRequestPaymentStuckRevert.sol");
var TestRequestPaymentStuckAssert = artifacts.require("./test/synchrone/TestRequestPaymentStuckAssert.sol");
var TestRequestPaymentStuckNonPayable = artifacts.require("./test/synchrone/TestRequestPaymentStuckNonPayable.sol");

var BigNumber = require('bignumber.js');

var abiUtils = require("web3-eth-abi");
var getEventFromReceipt = function(log, abi) {
	var event = null;

	for (var i = 0; i < abi.length; i++) {
	  var item = abi[i];
	  if (item.type != "event") continue;
	  var signature = item.name + "(" + item.inputs.map(function(input) {return input.type;}).join(",") + ")";
	  var hash = web3.sha3(signature);
	  if (hash == log.topics[0]) {
	    event = item;
	    break;
	  }
	}

	if (event != null) {
	  var inputs = event.inputs.map(function(input) {return input.type;});
	  var data = abiUtils.decodeParameters(inputs, log.data.replace("0x", ""));
	  // Do something with the data. Depends on the log and what you're using the data for.
	  return {name:event.name , data:data};
	}
	return null;
}

contract('RequestEthereum Payment stuck',  function(accounts) {
	var admin = accounts[0];
	var hacker = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];

	var requestCore;
	var requestEthereum;
	var newRequest;

	var arbitraryAmount = 1000;
	var arbitraryAmount10percent = 100;
	var testRequestPaymentStuckRevert;
	var testRequestPaymentStuckAssert;

    beforeEach(async () => {
		requestCore = await RequestCore.new({from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});
    	testRequestPaymentStuckRevert = await TestRequestPaymentStuckRevert.new({from:payee});
    	testRequestPaymentStuckAssert = await TestRequestPaymentStuckAssert.new({from:payee});
    	testRequestPaymentStuckNonPayable = await TestRequestPaymentStuckNonPayable.new({from:payee});

		await requestCore.adminAddTrustedCurrencyContract(requestEthereum.address, {from:admin});
    });

	it("Payee REVERT fund sending => withdraw pattern", async function () {
		await requestEthereum.createRequestAsPayer(testRequestPaymentStuckRevert.address, 
										arbitraryAmount, 
										0,
										[], 
										0,
										'', 
										{from:payer});
		var r = await requestEthereum.pay(utils.getHashRequest(1),0, {value:arbitraryAmount, from:payer});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after pay()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amountPaid");

		var l = getEventFromReceipt(r.receipt.logs[1], requestEthereum.abi);
		assert.equal(l.name,"EtherAvailableToWithdraw","Event EtherAvailableToWithdraw is missing after pay()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EtherAvailableToWithdraw wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),testRequestPaymentStuckRevert.address,"Event EtherAvailableToWithdraw wrong args recipient");
		assert.equal(l.data[2],arbitraryAmount,"Event EtherAvailableToWithdraw wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new request wrong data : creator");
		assert.equal(newReq[1],testRequestPaymentStuckRevert.address,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(testRequestPaymentStuckRevert.address);
		assert(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");

	});

	it("Payee ASSERT fund sending => withdraw pattern", async function () {
		await requestEthereum.createRequestAsPayer(testRequestPaymentStuckAssert.address, 
										arbitraryAmount, 
										0,
										[], 
										0,
										'', 
										{from:payer});
		var r = await requestEthereum.pay(utils.getHashRequest(1),0, {value:arbitraryAmount, from:payer});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after pay()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amountPaid");

		var l = getEventFromReceipt(r.receipt.logs[1], requestEthereum.abi);
		assert.equal(l.name,"EtherAvailableToWithdraw","Event EtherAvailableToWithdraw is missing after pay()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EtherAvailableToWithdraw wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),testRequestPaymentStuckAssert.address,"Event EtherAvailableToWithdraw wrong args recipient");
		assert.equal(l.data[2],arbitraryAmount,"Event EtherAvailableToWithdraw wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new request wrong data : creator");
		assert.equal(newReq[1],testRequestPaymentStuckAssert.address,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(testRequestPaymentStuckAssert.address);
		assert(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");

	});

	it("Payee non payable fund sending => withdraw pattern", async function () {
		await requestEthereum.createRequestAsPayer(testRequestPaymentStuckNonPayable.address, 
										arbitraryAmount, 
										0,
										[], 
										0,
										'', 
										{from:payer});
		var r = await requestEthereum.pay(utils.getHashRequest(1),0, {value:arbitraryAmount, from:payer});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after pay()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amountPaid");

		var l = getEventFromReceipt(r.receipt.logs[1], requestEthereum.abi);
		assert.equal(l.name,"EtherAvailableToWithdraw","Event EtherAvailableToWithdraw is missing after pay()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EtherAvailableToWithdraw wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),testRequestPaymentStuckNonPayable.address,"Event EtherAvailableToWithdraw wrong args recipient");
		assert.equal(l.data[2],arbitraryAmount,"Event EtherAvailableToWithdraw wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new request wrong data : creator");
		assert.equal(newReq[1],testRequestPaymentStuckNonPayable.address,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(testRequestPaymentStuckNonPayable.address);
		assert(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");

	});
});

