var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

// contract for test
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

contract('RequestEthereum Accept',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];

	var fakeExtentionContinue1;
    var fakeExtentionContinue2;
    var fakeExtentionContinue3;

    var fakeExtentionInterception1;
    var fakeExtentionInterception2;
    var fakeExtentionInterception3;

	var fakeExtentionLauncher1;
	var fakeExtentionLauncher2;
	var fakeExtentionLauncher3;

	var requestCore;
	var requestEthereum;
	var newRequest;

	var arbitraryAmount = 1000;

    beforeEach(async () => {
    	fakeExtentionContinue1 = await TestRequestSynchroneInterfaceContinue.new(1);
    	fakeExtentionContinue2 = await TestRequestSynchroneInterfaceContinue.new(2);
    	fakeExtentionContinue3 = await TestRequestSynchroneInterfaceContinue.new(3);

    	fakeExtentionInterception1 = await TestRequestSynchroneInterfaceInterception.new(11);
    	fakeExtentionInterception2 = await TestRequestSynchroneInterfaceInterception.new(12);
    	fakeExtentionInterception3 = await TestRequestSynchroneInterfaceInterception.new(13);

    	fakeExtentionLauncher1 = await TestRequestSynchroneExtensionLauncher.new(21,true,true,true,true,true,true,true,true,true);
    	fakeExtentionLauncher2 = await TestRequestSynchroneExtensionLauncher.new(22,true,true,true,true,true,true,true,true,true);
    	fakeExtentionLauncher3 = await TestRequestSynchroneExtensionLauncher.new(23,true,true,true,true,true,true,true,true,true);

		requestCore = await RequestCore.new({from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtentionContinue1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionContinue2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionContinue3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncher1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncher2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncher3.address, {from:admin});

		var newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, 0, [], "", {from:payee});
    });

	// ##################################################################################################
	// ### Accept test unit #############################################################################
	// ##################################################################################################
	it("accept if Core Paused OK", async function () {
		await requestCore.pause({from:admin});
		var r = await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});

	it("accept request Ethereum pause impossible", async function () {
		await requestEthereum.pause({from:admin});
		await utils.expectThrow(requestEthereum.accept(utils.getHashRequest(1), {from:payer}));
	});

	it("accept request not exist impossible", async function () {
		await utils.expectThrow(requestEthereum.accept(666, {from:payer}));
	});

	it("accept request from a random guy impossible", async function () {
		await utils.expectThrow(requestEthereum.accept(utils.getHashRequest(1), {from:otherguy}));
	});
	it("accept request from payee impossible", async function () {
		await utils.expectThrow(requestEthereum.accept(utils.getHashRequest(1), {from:payee}));
	});

	it("accept by payer request already accepted Impossible", async function () {
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await utils.expectThrow(requestEthereum.accept(utils.getHashRequest(1), {from:payer}));
	});

	it("accept by payer request declined impossible", async function () {
		await requestEthereum.decline(utils.getHashRequest(1), {from:payer});
		await utils.expectThrow(requestEthereum.accept(utils.getHashRequest(1), {from:payer}));
	});
	it("accept by payee request canceled impossible", async function () {
		await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		await utils.expectThrow(requestEthereum.accept(utils.getHashRequest(1), {from:payer}));
	});


	it("accept request created OK - without extension", async function () {
		var r = await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});


	it("accept request created OK - with 1 extension, continue: true", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionContinue1.address, [], "", {from:payee});

		var r = await requestEthereum.accept(utils.getHashRequest(2), {from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestAccept","Event LogTestAccept is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestAccept wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestAccept wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});

	it("accept request created OK - with 1 extension, continue: false", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionInterception1.address, [], "", {from:payee});

		var r = await requestEthereum.accept(utils.getHashRequest(2), {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestAccept","Event LogTestAccept is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestAccept wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestAccept wrong args ID");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],0,"new request wrong data : state");
	});

	it("accept by extension request created OK", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionLauncher1.address, [], "", {from:payee});

		var r = await fakeExtentionLauncher1.launchAccept(utils.getHashRequest(2));
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after accept()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});

	it("accept by extension request accepted OK", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionLauncher1.address, [], "", {from:payee});
		await requestEthereum.accept(utils.getHashRequest(2), {from:payer});

		var r = await fakeExtentionLauncher1.launchAccept(utils.getHashRequest(2));
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after accept()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});

	it("accept by extension request declined OK", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionLauncher1.address, [], "", {from:payee});
		await requestEthereum.decline(utils.getHashRequest(2), {from:payer});

		var r = await fakeExtentionLauncher1.launchAccept(utils.getHashRequest(2));
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after accept()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});

	it("accept by extension request canceled OK", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionLauncher1.address, [], "", {from:payee});
		await requestEthereum.cancel(utils.getHashRequest(2), {from:payee});

		var r = await fakeExtentionLauncher1.launchAccept(utils.getHashRequest(2));
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after accept()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(2));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});

	it("accept by an extension not from request impossible", async function () {
		newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtentionLauncher1.address, [], "", {from:payee});
		await utils.expectThrow(fakeExtentionLauncher2.launchCancel(utils.getHashRequest(2)));
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

});

