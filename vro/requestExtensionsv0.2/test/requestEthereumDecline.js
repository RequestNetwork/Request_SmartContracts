return;

var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestExtensionEscrow = artifacts.require("./RequestExtensionEscrow.sol");
var RequestExtensionTax = artifacts.require("./RequestExtensionTax.sol");
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
    // TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    const invalidJump = error.message.search('invalid JUMP') >= 0;
    // TODO: When we contract A calls contract B, and B throws, instead
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       testrpc log actually show an 'invalid jump' event.)
    const outOfGas = error.message.search('out of gas') >= 0;
    assert(
      invalidOpcode || invalidJump || outOfGas,
      "Expected throw, got '" + error + "' instead",
    );
    return;
  }
  assert.fail('Expected throw not received');
};


contract('RequestEthereum Decline',  function(accounts) {
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


		var newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], [], [], {from:payee});
    });

	// ##################################################################################################
	// ### Decline test unit #############################################################################
	// ##################################################################################################
	it("impossible to decline if Core Paused", async function () {
		await requestCore.adminPause({from:admin});
		await expectThrow(requestEthereum.decline(1, {from:payer}));
	});

	it("impossible to decline if Core Deprecated", async function () {
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestEthereum.decline(1, {from:payer}));
	});

	it("decline request not exist impossible", async function () {
		await expectThrow(requestEthereum.decline(666, {from:payer}));
	});

	it("decline request from a random guy impossible", async function () {
		await expectThrow(requestEthereum.decline(1, {from:otherguy}));
	});
	it("decline request from payee impossible", async function () {
		await expectThrow(requestEthereum.decline(1, {from:payee}));
	});

	it("decline request already accepted impossible", async function () {
		await requestEthereum.accept(1, {from:payer});
		await expectThrow(requestEthereum.decline(1, {from:payer}));
	});
	it("decline request declined impossible", async function () {
		await requestEthereum.decline(1, {from:payer});
		await expectThrow(requestEthereum.decline(1, {from:payer}));
	});
	it("decline request canceled impossible", async function () {
		await requestEthereum.cancel(1, {from:payee});
		await expectThrow(requestEthereum.decline(1, {from:payer}));
	});


	it("decline request created OK - without extension", async function () {
		var r = await requestEthereum.decline(1, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after createRequest()");
		assert.equal(l.data[0],1,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});


	it("decline request created OK - with 1 extension, continue: [true]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline request created OK - with 1 extension, continue: [false]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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

	it("decline request created OK - with 2 extensions, continue: [true,true]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestDecline wrong args ID");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline request created OK - with 2 extensions, continue: [true,false]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionInterception1.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestDecline wrong args ID");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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

	it("decline request created OK - with 2 extensions, continue: [false,true]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionContinue1.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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

	it("decline request created OK - with 2 extensions, continue: [false,false]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionInterception2.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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



	it("decline request created OK - with 3 extensions, continue: [true,true,true]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address,fakeExtentionContinue3.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,4,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue3.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline request created OK - with 3 extensions, continue: [true,true,false]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address,fakeExtentionInterception1.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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


	it("decline request created OK - with 3 extensions, continue: [true,false,true]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionInterception1.address,fakeExtentionContinue3.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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

	it("decline request created OK - with 3 extensions, continue: [true,false,false]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionInterception1.address,fakeExtentionInterception2.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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


	it("decline request created OK - with 3 extensions, continue: [false,true,true]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionContinue1.address,fakeExtentionContinue2.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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

	it("decline request created OK - with 3 extensions, continue: [false,false,true]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionInterception2.address,fakeExtentionContinue2.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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

	it("decline request created OK - with 3 extensions, continue: [false,true,false]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionContinue2.address,fakeExtentionInterception2.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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

	it("decline request created OK - with 3 extensions, continue: [false,false,false]", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionInterception1.address,fakeExtentionInterception2.address,fakeExtentionInterception3.address], [], [], [], {from:payee});

		var r = await requestEthereum.decline(2, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],11,"Event LogTestDecline wrong args ID");

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




	it("decline by extension request created OK", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], [], [], {from:payee});

		var r = await fakeExtentionLauncher1.launchDecline(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after decline()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline by extension request declineed OK", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], [], [], {from:payee});
		await requestEthereum.decline(2, {from:payer});

		var r = await fakeExtentionLauncher1.launchDecline(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after decline()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline by extension request declined OK", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], [], [], {from:payee});
		await requestEthereum.decline(2, {from:payer});

		var r = await fakeExtentionLauncher1.launchDecline(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after decline()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline by extension request canceled OK", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], [], [], {from:payee});
		await requestEthereum.cancel(2, {from:payee});

		var r = await fakeExtentionLauncher1.launchDecline(2);
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after decline()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline by an extension not from request impossible", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address], [], [], [], {from:payee});
		await expectThrow(fakeExtentionLauncher2.launchDecline(2));
	});


	it("decline by extension 1 ask only extensions 2 and 3", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address,fakeExtentionLauncher2.address,fakeExtentionLauncher3.address], [], [], [], {from:payee});

		var r = await fakeExtentionLauncher1.launchDecline(2);
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline by extension 2 ask only extensions 1 and 3", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address,fakeExtentionLauncher2.address,fakeExtentionLauncher3.address], [], [], [], {from:payee});

		var r = await fakeExtentionLauncher2.launchDecline(2);
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});

	it("decline by extension 3 ask only extensions 1 and 2", async function () {
		newRequest = requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncher1.address,fakeExtentionLauncher2.address,fakeExtentionLauncher3.address], [], [], [], {from:payee});

		var r = await fakeExtentionLauncher3.launchDecline(2);
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestDecline","Event LogTestDecline is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogTestDecline wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestDecline wrong args ID");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after createRequest()");
		assert.equal(l.data[0],2,"Event LogRequestDeclined wrong args requestId");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],2,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

});

