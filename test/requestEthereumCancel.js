
var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");

// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./TestRequestSynchroneInterfaceContinue.sol");
var TestRequestSynchroneInterfaceInterception = artifacts.require("./TestRequestSynchroneInterfaceInterception.sol");
var TestRequestSynchroneExtensionLauncher = artifacts.require("./TestRequestSynchroneExtensionLauncher.sol");
var BigNumber = require('bignumber.js');

var SolidityCoder = require("web3/lib/solidity/coder.js");


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
	  var data = SolidityCoder.decodeParams(inputs, log.data.replace("0x", ""));
	  // Do something with the data. Depends on the log and what you're using the data for.
	  return {name:event.name , data:data};
	}
	return null;
}

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

contract('RequestEthereum Cancel',  function(accounts) {
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

	var arbitraryAmount = 100000000;

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

		await requestCore.adminResume({from:admin});
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

		var newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee});
    });

	// ##################################################################################################
	// ### Cancel test unit #############################################################################
	// ##################################################################################################
	it("impossible to cancel if Core Paused", async function () {
		await requestCore.adminPause({from:admin});
		await expectThrow(requestEthereum.cancel(1, {from:payee}));
	});

	it("impossible to cancel if Core Deprecated", async function () {
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestEthereum.cancel(1, {from:payee}));
	});

	it("cancel request not exist impossible", async function () {
		await expectThrow(requestEthereum.cancel(666, {from:payer}));
	});

	it("cancel request from a random guy impossible", async function () {
		await expectThrow(requestEthereum.cancel(1, {from:otherguy}));
	});
	it("cancel request from payer impossible", async function () {
		await expectThrow(requestEthereum.cancel(1, {from:payer}));
	});

	it("cancel by payee request declined impossible", async function () {
		await requestEthereum.cancel(1, {from:payee});
		await expectThrow(requestEthereum.cancel(1, {from:payee}));
	});
	it("cancel by payee request canceled impossible", async function () {
		await requestEthereum.cancel(1, {from:payee});
		await expectThrow(requestEthereum.cancel(1, {from:payee}));
	});

	it("cancel by payee request already accepted OK if amount == 0", async function () {
		await requestEthereum.accept(1, {from:payer});
		await requestEthereum.cancel(1, {from:payee});
		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel request amountPaid != 0 Impossible", async function () {
		await requestEthereum.accept(1, {from:payer});
		await requestEthereum.pay(1, 0, {from:payer,value:10});
		await expectThrow(requestEthereum.cancel(1, {from:payee}));

		var newReq = await requestCore.requests.call(1, {from:fakeContract});
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],10,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");
	});

	it("cancel request created OK - without extension", async function () {
		var r = await requestEthereum.cancel(1, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],1,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});


	it("cancel request created OK - with 1 extension, continue: [true]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel request created OK - with 1 extension, continue: [false]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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

	it("cancel request created OK - with 2 extensions, continue: [true,true]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args ID");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel request created OK - with 2 extensions, continue: [true,false]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionInterception1.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args ID");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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

	it("cancel request created OK - with 2 extensions, continue: [false,true]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionContinue1.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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

	it("cancel request created OK - with 2 extensions, continue: [false,false]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionInterception2.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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



	it("cancel request created OK - with 3 extensions, continue: [true,true,true]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address,fakeExtentionContinue3.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,4,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue3.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel request created OK - with 3 extensions, continue: [true,true,false]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address,fakeExtentionInterception1.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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


	it("cancel request created OK - with 3 extensions, continue: [true,false,true]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionInterception1.address,fakeExtentionContinue3.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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

	it("cancel request created OK - with 3 extensions, continue: [true,false,false]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionInterception1.address,fakeExtentionInterception2.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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


	it("cancel request created OK - with 3 extensions, continue: [false,true,true]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionContinue1.address,fakeExtentionContinue2.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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

	it("cancel request created OK - with 3 extensions, continue: [false,false,true]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionInterception2.address,fakeExtentionContinue2.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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

	it("cancel request created OK - with 3 extensions, continue: [false,true,false]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionContinue2.address,fakeExtentionInterception2.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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

	it("cancel request created OK - with 3 extensions, continue: [false,false,false]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionInterception2.address,fakeExtentionInterception3.address], [], {from:payee});

		var r = await requestEthereum.cancel(2, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after cancel()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestCancel wrong args ID");

		var newReq = await requestCore.requests.call(2);
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


	it("cancel by extension request created OK", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], {from:payee});

		var r = await fakeExtentionLauncher1.launchCancel(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel by extension request accepted OK", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});

		var r = await fakeExtentionLauncher1.launchCancel(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel by extension request declined OK", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], {from:payee});
		await requestEthereum.decline(2, {from:payer});

		var r = await fakeExtentionLauncher1.launchCancel(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel by extension request canceled OK", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], {from:payee});
		await requestEthereum.cancel(2, {from:payee});

		var r = await fakeExtentionLauncher1.launchCancel(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel by an extension not from request impossible", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], {from:payee});
		await expectThrow(fakeExtentionLauncher2.launchCancel(2));
	});

	it("cancel by extension 1 ask only extensions 2 and 3", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address,fakeExtentionLauncher2.address,fakeExtentionLauncher3.address], [], {from:payee});

		var r = await fakeExtentionLauncher1.launchCancel(2);
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after createRequest()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel by extension 2 ask only extensions 1 and 3", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address,fakeExtentionLauncher2.address,fakeExtentionLauncher3.address], [], {from:payee});

		var r = await fakeExtentionLauncher2.launchCancel(2);
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after createRequest()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});

	it("cancel by extension 3 ask only extensions 1 and 2", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address,fakeExtentionLauncher2.address,fakeExtentionLauncher3.address], [], {from:payee});

		var r = await fakeExtentionLauncher3.launchCancel(2);
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestCancel wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after createRequest()");
		assert.equal(l.data[0],2,"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],3,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################
});

