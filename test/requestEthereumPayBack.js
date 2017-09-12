
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


contract('RequestEthereum PayBack',  function(accounts) {
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

	var fakeExtentionLauncherRefundFalse1;
	var fakeExtentionLauncherFundOrderFalse1;
	var fakeExtentionLauncherFundOrderFalseAndRefundFalse1;

	var fakeExtentionLauncherRefundFalse2;
	var fakeExtentionLauncherFundOrderFalse2;
	var fakeExtentionLauncherFundOrderFalseAndRefundFalse2;

	var fakeExtentionLauncherRefundFalse3;
	var fakeExtentionLauncherFundOrderFalse3;
	var fakeExtentionLauncherFundOrderFalseAndRefundFalse3;

	var requestCore;
	var requestEthereum;
	var newRequest;

	var arbitraryAmount = 100000000;
	var arbitraryAmount10percent = 10000000;
	var arbitraryAmount20percent = 20000000;
	var arbitraryAmount30percent = 30000000;

    beforeEach(async () => {
    	fakeExtentionContinue1 = await TestRequestSynchroneInterfaceContinue.new(1);
    	fakeExtentionContinue2 = await TestRequestSynchroneInterfaceContinue.new(2);
    	fakeExtentionContinue3 = await TestRequestSynchroneInterfaceContinue.new(3);

    	fakeExtentionInterception1 = await TestRequestSynchroneInterfaceInterception.new(11);
    	fakeExtentionInterception2 = await TestRequestSynchroneInterfaceInterception.new(12);
    	fakeExtentionInterception3 = await TestRequestSynchroneInterfaceInterception.new(13);

    	fakeExtentionLauncherRefundFalse1 = await TestRequestSynchroneExtensionLauncher.new(21,true,true,true,true,true,true,false,true,true);
    	fakeExtentionLauncherFundOrderFalse1 = await TestRequestSynchroneExtensionLauncher.new(22,true,true,true,true,false,true,true,true,true);
    	fakeExtentionLauncherFundOrderFalseAndRefundFalse1 = await TestRequestSynchroneExtensionLauncher.new(23,true,true,true,true,false,true,false,true,true);

    	fakeExtentionLauncherRefundFalse2 = await TestRequestSynchroneExtensionLauncher.new(31,true,true,true,true,true,true,false,true,true);
    	fakeExtentionLauncherFundOrderFalse2 = await TestRequestSynchroneExtensionLauncher.new(32,true,true,true,true,false,true,true,true,true);
    	fakeExtentionLauncherFundOrderFalseAndRefundFalse2 = await TestRequestSynchroneExtensionLauncher.new(33,true,true,true,true,false,true,false,true,true);

    	fakeExtentionLauncherRefundFalse3 = await TestRequestSynchroneExtensionLauncher.new(41,true,true,true,true,true,true,false,true,true);
    	fakeExtentionLauncherFundOrderFalse3 = await TestRequestSynchroneExtensionLauncher.new(42,true,true,true,true,false,true,true,true,true);
    	fakeExtentionLauncherFundOrderFalseAndRefundFalse3 = await TestRequestSynchroneExtensionLauncher.new(43,true,true,true,true,false,true,false,true,true);

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
		
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherRefundFalse1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalse1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalseAndRefundFalse1.address, {from:admin});
		
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherRefundFalse2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalse2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalseAndRefundFalse2.address, {from:admin});
		
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherRefundFalse3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalse3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalseAndRefundFalse3.address, {from:admin});

		var newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee});
		await requestEthereum.accept(1, {from:payer});
		await requestEthereum.pay(1, 0, {value:arbitraryAmount, from:payer})
    });

	// ##################################################################################################
	// ### Accept test unit #############################################################################
	// ##################################################################################################
	it("impossible to payback if Core Paused", async function () {
		await requestCore.adminPause({from:admin});
		await expectThrow(requestEthereum.payback(1, {value:arbitraryAmount, from:payee}));
	});

	it("impossible to payback if Core Deprecated", async function () {
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestEthereum.payback(1, {value:arbitraryAmount, from:payee}));
	});

	it("payback request not exist impossible", async function () {
		await expectThrow(requestEthereum.payback(666, {value:arbitraryAmount, from:payee}));
	});



	it("payback request just created Impossible", async function () {
		await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee});
		await expectThrow(requestEthereum.payback(2, {value:arbitraryAmount, from:payee}));
	});

	it("payback request declined impossible", async function () {
		await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee});
		await requestEthereum.decline(2, {from:payer});
		await expectThrow(requestEthereum.payback(2, {value:arbitraryAmount, from:payee}));
	});
	it("payback request canceled impossible", async function () {
		await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee});
		await requestEthereum.cancel(2, {from:payee});
		await expectThrow(requestEthereum.payback(2, {value:arbitraryAmount, from:payee}));
	});

	it("payback request from payer Impossible", async function () {
		var r = await expectThrow(requestEthereum.payback(1, {value:arbitraryAmount, from:payer}));
	});

	it("payback request from a random guy Impossible", async function () {
		var r = await expectThrow(requestEthereum.payback(1, {value:arbitraryAmount, from:otherguy}));
	});

	it("payback request accepted OK - without extension", async function () {
		var r = await requestEthereum.payback(1, {value:arbitraryAmount10percent, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payBack()");
		assert.equal(l.data[0],1,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,arbitraryAmount10percent,"new request wrong data : amount to withdraw payer");
	});

	it("payback request accepted OK - with 1 extension, continue: [{true,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});

		assert.equal(r.receipt.logs.length,3,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,arbitraryAmount10percent,"new request wrong data : amount to withdraw payer");
	});

	it("payback request accepted OK - with 1 extension, continue: [{false,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherRefundFalse1.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request accepted OK - with 1 extension, continue: [{true,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalse1.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		var l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

		it("payback request accepted OK - with 1 extension, continue: [{false,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalseAndRefundFalse1.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalseAndRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{true,true}, {true,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,5,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[3], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[4], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,arbitraryAmount10percent,"new request wrong data : amount to withdraw payer");
	});


	it("payback request created OK - with 2 extensions, continue: [{true,true}, {true,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionLauncherFundOrderFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,5,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherFundOrderFalse2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],32,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[3], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[4], fakeExtentionLauncherFundOrderFalse2.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],32,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{true,true}, {false,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionLauncherFundOrderFalseAndRefundFalse1.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherFundOrderFalseAndRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{true,true}, {false,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionLauncherRefundFalse1.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{true,false}, {true,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalse1.address,fakeExtentionContinue2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,4,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[3], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{true,false}, {true,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalse1.address,fakeExtentionLauncherFundOrderFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,4,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherFundOrderFalse2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],32,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[3], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{true,false}, {false,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalse1.address,fakeExtentionLauncherFundOrderFalseAndRefundFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherFundOrderFalseAndRefundFalse2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],33,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});



	it("payback request created OK - with 2 extensions, continue: [{true,false}, {false,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalse1.address,fakeExtentionLauncherRefundFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherRefundFalse2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],31,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});


	it("payback request created OK - with 2 extensions, continue: [{false,true}, {true,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherRefundFalse1.address,fakeExtentionContinue2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{false,true}, {true,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherRefundFalse1.address,fakeExtentionLauncherFundOrderFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{false,true}, {false,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherRefundFalse1.address,fakeExtentionLauncherFundOrderFalseAndRefundFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{false,true}, {false,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherRefundFalse1.address,fakeExtentionLauncherRefundFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});


	it("payback request created OK - with 2 extensions, continue: [{false,false}, {true,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalseAndRefundFalse1.address,fakeExtentionContinue2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalseAndRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{false,false}, {true,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalseAndRefundFalse1.address,fakeExtentionLauncherFundOrderFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalseAndRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{false,false}, {false,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalseAndRefundFalse1.address,fakeExtentionLauncherFundOrderFalseAndRefundFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalseAndRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("payback request created OK - with 2 extensions, continue: [{false,false}, {false,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalseAndRefundFalse1.address,fakeExtentionLauncherRefundFalse2.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalseAndRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	// {true,true}, {true,true}, {true,true}
	it("payback request created OK - with 3 extensions, continue: [{true,true}, {true,true}, {true,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address,fakeExtentionContinue3.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,7,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue3.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[4], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[5], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[6], fakeExtentionContinue3.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,arbitraryAmount10percent,"new request wrong data : amount to withdraw payer");
	});

	// {true,true}, {true,true}, {true,false}
	it("payback request created OK - with 3 extensions, continue: [{true,true}, {true,true}, {true,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address,fakeExtentionLauncherFundOrderFalse3.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,7,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionLauncherFundOrderFalse3.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],42,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[4], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[5], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[6], fakeExtentionLauncherFundOrderFalse3.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],42,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});


	// {true,true}, {true,false}, {true,X}
	it("payback request created OK - with 3 extensions, continue: [{true,true}, {true,false}, {true,X}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionLauncherFundOrderFalse2.address,fakeExtentionContinue3.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,6,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherFundOrderFalse2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],32,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue3.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[4], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[5], fakeExtentionLauncherFundOrderFalse2.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],32,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	// {true,false}, {true,X}, {true,X}
	it("payback request created OK - with 3 extensions, continue: [{true,false}, {true,X}, {true,X}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherFundOrderFalse1.address,fakeExtentionContinue2.address,fakeExtentionContinue3.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,5,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue3.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payback()");
		assert.equal(l.data[0],2,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		l = getEventFromReceipt(r.receipt.logs[4], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount10percent,"Event LogTestFundOrder wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});
	

	// {true,X}, {true,X}, {false,X}
	it("payback request created OK - with 3 extensions, continue: [{true,X}, {true,X}, {false,X}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionContinue2.address,fakeExtentionLauncherRefundFalse3.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionContinue2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionLauncherRefundFalse3.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],41,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	// {true,X}, {false,X}, {X,X}
	it("payback request created OK - with 3 extensions, continue: [{true,X}, {false,X}, {X,X}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionContinue1.address,fakeExtentionLauncherRefundFalse2.address,fakeExtentionContinue3.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], fakeExtentionLauncherRefundFalse2.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],31,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	// {false,X}, {X,X}, {X,X}
	it("payback request created OK - with 3 extensions, continue: [{false,X}, {X,X}, {X,X}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtentionLauncherRefundFalse1.address,fakeExtentionContinue2.address,fakeExtentionContinue3.address], [], {from:payee});
		await requestEthereum.accept(2, {from:payer});
		await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		var r = await requestEthereum.payback(2, {value:arbitraryAmount10percent, from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherRefundFalse1.abi);
		assert.equal(l.name,"LogTestRefund","Event LogTestRefund is missing after payback()");
		assert.equal(l.data[0],2,"Event LogTestRefund wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestRefund wrong args ID");
		assert.equal(l.data[2],arbitraryAmount10percent,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

	it("msg.value == 0 OK", async function () {
		var r = await requestEthereum.payback(1, {value:0, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payBack()");
		assert.equal(l.data[0],1,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],0,"Event LogRequestRefunded wrong args amountRefunded");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,0,"new request wrong data : amount to withdraw payer");
	});

	it("3 payback request", async function () {
		var r = await requestEthereum.payback(1, {value:arbitraryAmount30percent, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payBack()");
		assert.equal(l.data[0],1,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount30percent,"Event LogRequestRefunded wrong args amountRefunded");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount30percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,arbitraryAmount30percent,"new request wrong data : amount to withdraw payer");

		// second
		var r = await requestEthereum.payback(1, {value:arbitraryAmount20percent, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payBack()");
		assert.equal(l.data[0],1,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount20percent,"Event LogRequestRefunded wrong args amountRefunded");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount30percent-arbitraryAmount20percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,arbitraryAmount30percent+arbitraryAmount20percent,"new request wrong data : amount to withdraw payer");

		// third
		var r = await requestEthereum.payback(1, {value:arbitraryAmount10percent, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestRefunded","Event LogRequestRefunded is missing after payBack()");
		assert.equal(l.data[0],1,"Event LogRequestRefunded wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestRefunded wrong args amountRefunded");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount-arbitraryAmount30percent-arbitraryAmount20percent-arbitraryAmount10percent,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payer);
		assert.equal(r,arbitraryAmount30percent+arbitraryAmount20percent+arbitraryAmount10percent,"new request wrong data : amount to withdraw payer");
	});

	// turn down the node
	// it("msg.value >= 2^256 Impossible", async function () {
	// 	var r = await expectThrow(requestEthereum.payback(1, {value:new BigNumber(2).pow(256), from:payee}));
	// });

	it("msg.value > amountAlreadyPaid Impossible", async function () {
	 	var r = await expectThrow(requestEthereum.payback(1, {value:arbitraryAmount+1, from:payee}));
	});

});

