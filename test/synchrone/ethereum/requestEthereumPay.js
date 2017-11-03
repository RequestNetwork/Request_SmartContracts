var config = require("../../config.js");
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


contract('RequestEthereum Pay', function(accounts) {
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

	var fakeExtentionLauncherPaymentFalse1;
	var fakeExtentionLauncherFundOrderFalse1;
	var fakeExtentionLauncherFundOrderFalseAndPaymentFalse1;

	var fakeExtentionLauncherPaymentFalse2;
	var fakeExtentionLauncherFundOrderFalse2;
	var fakeExtentionLauncherFundOrderFalseAndPaymentFalse2;

	var fakeExtentionLauncherPaymentFalse3;
	var fakeExtentionLauncherFundOrderFalse3;
	var fakeExtentionLauncherFundOrderFalseAndPaymentFalse3;

	var requestCore;
	var requestEthereum;
	var newRequest;

	var arbitraryAmount = 1000;
	var arbitraryAmount2 = 300;
	var arbitraryAmount3 = 100;
	var arbitraryTips = 100;


    beforeEach(async () => {
    	fakeExtentionContinue1 = await TestRequestSynchroneInterfaceContinue.new(1);
    	fakeExtentionContinue2 = await TestRequestSynchroneInterfaceContinue.new(2);
    	fakeExtentionContinue3 = await TestRequestSynchroneInterfaceContinue.new(3);

    	fakeExtentionInterception1 = await TestRequestSynchroneInterfaceInterception.new(11);
    	fakeExtentionInterception2 = await TestRequestSynchroneInterfaceInterception.new(12);
    	fakeExtentionInterception3 = await TestRequestSynchroneInterfaceInterception.new(13);

    	fakeExtentionLauncherPaymentFalse1 = await TestRequestSynchroneExtensionLauncher.new(21,true,true,true,true,true,false,true,true,true);
    	fakeExtentionLauncherFundOrderFalse1 = await TestRequestSynchroneExtensionLauncher.new(22,true,true,true,true,false,true,true,true,true);
    	fakeExtentionLauncherFundOrderFalseAndPaymentFalse1 = await TestRequestSynchroneExtensionLauncher.new(23,true,true,true,true,false,false,true,true,true);

    	fakeExtentionLauncherPaymentFalse2 = await TestRequestSynchroneExtensionLauncher.new(31,true,true,true,true,true,false,true,true,true);
    	fakeExtentionLauncherFundOrderFalse2 = await TestRequestSynchroneExtensionLauncher.new(32,true,true,true,true,false,true,true,true,true);
    	fakeExtentionLauncherFundOrderFalseAndPaymentFalse2 = await TestRequestSynchroneExtensionLauncher.new(33,true,true,true,true,false,false,true,true,true);

    	fakeExtentionLauncherPaymentFalse3 = await TestRequestSynchroneExtensionLauncher.new(41,true,true,true,true,true,false,true,true,true);
    	fakeExtentionLauncherFundOrderFalse3 = await TestRequestSynchroneExtensionLauncher.new(42,true,true,true,true,false,true,true,true,true);
    	fakeExtentionLauncherFundOrderFalseAndPaymentFalse3 = await TestRequestSynchroneExtensionLauncher.new(43,true,true,true,true,false,false,true,true,true);


		requestCore = await RequestCore.new({from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtentionContinue1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionContinue2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionContinue3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionInterception3.address, {from:admin});
		
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherPaymentFalse1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalse1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalseAndPaymentFalse1.address, {from:admin});
		
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherPaymentFalse2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalse2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalseAndPaymentFalse2.address, {from:admin});
		
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherPaymentFalse3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalse3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherFundOrderFalseAndPaymentFalse3.address, {from:admin});

		var newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, 0, [], {from:payee});
		await requestEthereum.accept(1, {from:payer});
    });

	// ##################################################################################################
	// ### Pay test unit #############################################################################
	// ##################################################################################################
	it("impossible to pay if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await expectThrow(requestEthereum.pay(1,0, {value:arbitraryAmount, from:payer}));
	});

	// it("impossible to pay if Core Deprecated", async function () {
	// 	await requestCore.adminDeprecate({from:admin});
	// 	await expectThrow(requestEthereum.pay(1,0, {value:arbitraryAmount, from:payer}));
	// });

	it("pay request not exist impossible", async function () {
		await expectThrow(requestEthereum.pay(666,0, {value:arbitraryAmount, from:payer}));
	});



	it("pay request just created Impossible", async function () {
		await requestEthereum.createRequest(payee, payer, arbitraryAmount, 0, [], {from:payee});
		await expectThrow(requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer}));
	});

	it("pay request declined impossible", async function () {
		await requestEthereum.createRequest(payee, payer, arbitraryAmount, 0, [], {from:payee});
		await requestEthereum.decline(2, {from:payer});
		await expectThrow(requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer}));
	});
	it("pay request canceled impossible", async function () {
		await requestEthereum.createRequest(payee, payer, arbitraryAmount, 0, [], {from:payee});
		await requestEthereum.cancel(2, {from:payee});
		await expectThrow(requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer}));
	});


	it("pay request from payee OK", async function () {
		var r = await requestEthereum.pay(1,0, {value:arbitraryAmount, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event Payment wrong args amountPaid");

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

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("pay request from a random guy OK", async function () {
		var r = await requestEthereum.pay(1,0, {value:arbitraryAmount, from:otherguy});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event Payment wrong args amountPaid");

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

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("pay request created OK - without extension", async function () {
		var r = await requestEthereum.pay(1,0, {value:arbitraryAmount, from:payer});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event Payment wrong args amountPaid");

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

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("pay request accepted OK - with 1 extension, continue: [{true,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, fakeExtentionContinue1.address, [], {from:payee});
		await requestEthereum.accept(2, {from:payer});

		var r = await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});

		assert.equal(r.receipt.logs.length,3,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestPayment","Event LogTestPayment is missing after pay()");
		assert.equal(l.data[0],2,"Event LogTestPayment wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestPayment wrong args ID");
		assert.equal(l.data[2],arbitraryAmount,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after pay()");
		assert.equal(l.data[0],2,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event Payment wrong args amountPaid");

		l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionContinue1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after pay()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2].toLowerCase(),payee,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount,"Event LogTestFundOrder wrong args amount");

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

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("pay request accepted OK - with 1 extension, continue: [{false,true}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, fakeExtentionLauncherPaymentFalse1.address, [], {from:payee});
		await requestEthereum.accept(2, {from:payer});

		var r = await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherPaymentFalse1.abi);
		assert.equal(l.name,"LogTestPayment","Event LogTestPayment is missing after pay()");
		assert.equal(l.data[0],2,"Event LogTestPayment wrong args requestId");
		assert.equal(l.data[1],21,"Event LogTestPayment wrong args ID");
		assert.equal(l.data[2],arbitraryAmount,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,0,"new request wrong data : amount to withdraw payee");
	});

	it("pay request accepted OK - with 1 extension, continue: [{true,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, fakeExtentionLauncherFundOrderFalse1.address, [], {from:payee});
		await requestEthereum.accept(2, {from:payer});

		var r = await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,3,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestPayment","Event LogTestPayment is missing after pay()");
		assert.equal(l.data[0],2,"Event LogTestPayment wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestPayment wrong args ID");
		assert.equal(l.data[2],arbitraryAmount,"Event LogTestRefund wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after pay()");
		assert.equal(l.data[0],2,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event Payment wrong args amountPaid");

		var l = getEventFromReceipt(r.receipt.logs[2], fakeExtentionLauncherFundOrderFalse1.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after pay()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],22,"Event LogTestFundOrder wrong args ID");
		assert.equal(l.data[2].toLowerCase(),payee,"Event LogTestFundOrder wrong args recipient");
		assert.equal(l.data[3],arbitraryAmount,"Event LogTestFundOrder wrong args amount");

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

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,0,"new request wrong data : amount to withdraw payee");
	});

		it("pay request accepted OK - with 1 extension, continue: [{false,false}]", async function () {
		newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, fakeExtentionLauncherFundOrderFalseAndPaymentFalse1.address, [], {from:payee});
		await requestEthereum.accept(2, {from:payer});

		var r = await requestEthereum.pay(2,0, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], fakeExtentionLauncherFundOrderFalseAndPaymentFalse1.abi);
		assert.equal(l.name,"LogTestPayment","Event LogTestPayment is missing after pay()");
		assert.equal(l.data[0],2,"Event LogTestPayment wrong args requestId");
		assert.equal(l.data[1],23,"Event LogTestPayment wrong args ID");
		assert.equal(l.data[2],arbitraryAmount,"Event LogTestRefund wrong args amount");

		var newReq = await requestCore.requests.call(2);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,0,"new request wrong data : amount to withdraw payee");
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

	it("msg.value == 0 OK", async function () {
		var r = await requestEthereum.pay(1,0, {value:0, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],0,"Event Payment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,0,"new request wrong data : amount to withdraw payee");
	});

	it("3 pay request ", async function () {
		var r = await requestEthereum.pay(1,0, {value:arbitraryAmount3, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount3,"Event Payment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount3,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount3,"new request wrong data : amount to withdraw payee");

		// second
		var r = await requestEthereum.pay(1,0, {value:arbitraryAmount2, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount2,"Event Payment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount3+arbitraryAmount2,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount3+arbitraryAmount2,"new request wrong data : amount to withdraw payee");

		// third
		var r = await requestEthereum.pay(1,0, {value:arbitraryAmount, from:payee});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event Payment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount3+arbitraryAmount2+arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount3+arbitraryAmount2+arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});


	it("pay with tips OK", async function () {
		var r = await requestEthereum.pay(1,arbitraryTips, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"AddAdditional","Event AddAdditional is missing after pay()");
		assert.equal(l.data[0],1,"Event AddAdditional wrong args requestId");
		assert.equal(l.data[1],arbitraryTips,"Event AddAdditional wrong args amountAdditional");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after pay()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event Payment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],arbitraryTips,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("pay with more tips than msg.value Impossible", async function () {
		var r = await expectThrow(requestEthereum.pay(1,arbitraryAmount, {value:arbitraryTips, from:payer}));
	});

	it("pay more than amountExpected (without tips) Impossible", async function () {
		var r = await expectThrow(requestEthereum.pay(1,0, {value:arbitraryAmount+1, from:payer}));
	});

	it("pay more than amountExpected (without tips but still to much) Impossible", async function () {
		var r = await expectThrow(requestEthereum.pay(1,1, {value:arbitraryAmount+2, from:payer}));
	});

	it("pay more than amountExpected (with tips that make the payment under expected) OK", async function () {
		var r = await requestEthereum.pay(1,arbitraryTips, {value:arbitraryAmount+1, from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"AddAdditional","Event AddAdditional is missing after pay()");
		assert.equal(l.data[0],1,"Event AddAdditional wrong args requestId");
		assert.equal(l.data[1],arbitraryTips,"Event AddAdditional wrong args amountAdditional");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Payment","Event Payment is missing after pay()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount+1,"Event Payment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount+1,"new request wrong data : amountPaid");
		assert.equal(newReq[6],arbitraryTips,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount+1,"new request wrong data : amount to withdraw payee");
	});


	// turn down the node
	// it("msg.value >= 2^256 Impossible", async function () {
	// 	var r = await expectThrow(requestEthereum.pay(1,0, {value:new BigNumber(2).pow(256), from:payee}));
	// });

});

