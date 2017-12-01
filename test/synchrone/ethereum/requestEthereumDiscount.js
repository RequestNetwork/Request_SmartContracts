var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

var TestRequestSynchroneInterfaceContinue = artifacts.require("./test/synchrone/TestRequestSynchroneInterfaceContinue.sol");
var TestRequestSynchroneInterfaceInterception = artifacts.require("./test/synchrone/TestRequestSynchroneInterfaceInterception.sol");
var TestRequestSynchroneExtensionLauncher = artifacts.require("./test/synchrone/TestRequestSynchroneExtensionLauncher.sol");
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

contract('RequestEthereum Discount',  function(accounts) {
	var admin = accounts[0];
	var otherGuy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];

	var requestCore;
	var requestEthereum;
	var newRequest;

	var arbitraryAmount = 1000;
	var arbitraryAmount10percent = 100;

	var fakeExtentionContinue1;
    var	fakeExtentionContinue2;
    var	fakeExtentionContinue3;

    var	fakeExtentionInterception1;
    var	fakeExtentionInterception2;
    var	fakeExtentionInterception3;

    beforeEach(async () => {
		requestCore = await RequestCore.new({from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

    	fakeExtentionContinue1 = await TestRequestSynchroneInterfaceContinue.new(1);
    	fakeExtentionContinue2 = await TestRequestSynchroneInterfaceContinue.new(2);
    	fakeExtentionContinue3 = await TestRequestSynchroneInterfaceContinue.new(3);

    	fakeExtentionInterception1 = await TestRequestSynchroneInterfaceInterception.new(11);
    	fakeExtentionInterception2 = await TestRequestSynchroneInterfaceInterception.new(12);
    	fakeExtentionInterception3 = await TestRequestSynchroneInterfaceInterception.new(13);

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtentionContinue1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionContinue2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionContinue3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception3.address, {from:admin});

		var newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, 0, [], "", {from:payee});
		
    });

	// ##################################################################################################
	// ### Accept test unit #############################################################################
	// ##################################################################################################
	it("discount if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestEthereum.discount(utils.getHashRequest(1),arbitraryAmount10percent, {from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"AddSubtract","Event AddSubtract is missing after discount()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event AddSubtract wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],0,"new request wrong data : state");
	});

	it("discount request not exist impossible", async function () {
		await utils.expectThrow(requestEthereum.discount(666, arbitraryAmount10percent, {from:payee}));
	});

	it("discount request just created OK - without extension", async function () {
		var r = await requestEthereum.discount(utils.getHashRequest(1),arbitraryAmount10percent, {from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"AddSubtract","Event AddSubtract is missing after discount()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event AddSubtract wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],0,"new request wrong data : state");
	});

	it("discount request just created OK - untrusted subContract", async function () {
		await requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:admin});
		var r = await requestEthereum.discount(utils.getHashRequest(1),arbitraryAmount10percent, {from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"AddSubtract","Event AddSubtract is missing after discount()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event AddSubtract wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],0,"new request wrong data : state");
	});

	it("discount by payee request canceled impossible", async function () {
		await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		await utils.expectThrow(requestEthereum.discount(utils.getHashRequest(1), arbitraryAmount10percent, {from:payee}));
	});

	it("discount request from a random guy Impossible", async function () {
		await utils.expectThrow(requestEthereum.discount(utils.getHashRequest(1), arbitraryAmount10percent, {from:otherGuy}));
	});

	it("discount request from payer Impossible", async function () {
		await utils.expectThrow(requestEthereum.discount(utils.getHashRequest(1), arbitraryAmount10percent, {from:payer}));
	});

	it("discount request accepted OK - without extension", async function () {
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		var r = await requestEthereum.discount(utils.getHashRequest(1),arbitraryAmount10percent, {from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"AddSubtract","Event AddSubtract is missing after discount()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event AddSubtract wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");
	});


	it("discount request created OK - with 1 extension, continue: [true]", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionContinue1.address, [], "", {from:payee});

		var r = await requestEthereum.discount(utils.getHashRequest(2), arbitraryAmount10percent, {from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestAddSubtract","Event LogTestAddSubtract is missing after cancel()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestAddSubtract wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestAddSubtract wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"AddSubtract","Event AddSubtract is missing after cancel()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event AddSubtract wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event AddSubtract wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],0,"new request wrong data : state");
	});

	it("discount request created OK - with 1 extension, continue: [false]", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionInterception1.address, [], "", {from:payee});

		var r = await requestEthereum.discount(utils.getHashRequest(2), arbitraryAmount10percent, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestAddSubtract","Event LogTestAddSubtract is missing after cancel()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestAddSubtract wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestAddSubtract wrong args ID");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],0,"new request wrong data : state");
	});

	it("discount request with amount > amountExpectedAfterAddSub - amountPaid Impossible", async function () {
		var r = await requestEthereum.discount(utils.getHashRequest(1),arbitraryAmount+1, {from:payee});

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount-arbitraryAmount-1,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],0,"new request wrong data : state");
	});

	it("discount request with amount <= amountExpectedAfterAddSub - amountPaid OK", async function () {
		var r = await requestEthereum.discount(utils.getHashRequest(1),arbitraryAmount, {from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"AddSubtract","Event AddSubtract is missing after discount()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event AddSubtract wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event AddSubtract wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount-arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],0,"new request wrong data : state");
	});

});

