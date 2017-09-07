// return;

var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestSynchroneExtensionEscrow = artifacts.require("./RequestSynchroneExtensionEscrow.sol");


// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./TestRequestSynchroneInterfaceContinue.sol");
var TestRequestSynchroneInterfaceInterception = artifacts.require("./TestRequestSynchroneInterfaceInterception.sol");
var TestRequestSynchroneExtensionLauncher = artifacts.require("./TestRequestSynchroneExtensionLauncher.sol");
var BigNumber = require('bignumber.js');

var SolidityCoder = require("web3/lib/solidity/coder.js");

function addressToByte32str(str) {
	return str.indexOf('0x') == 0 ?  str.replace('0x','0x000000000000000000000000') : '0x000000000000000000000000'+str;
}

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



contract('RequestEthereum with Escrow Accept',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var escrow = accounts[5];

	var requestCore;
	var requestEthereum;
	var newRequest;
	var requestSynchroneExtensionEscrow;

	var arbitraryAmount = 100000000;

    beforeEach(async () => {
			requestCore = await RequestCore.new({from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});
    	requestSynchroneExtensionEscrow = await RequestSynchroneExtensionEscrow.new(requestCore.address,{from:admin});

			await requestCore.adminResume({from:admin});
			await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
			await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
			await requestCore.adminAddTrustedExtension(requestSynchroneExtensionEscrow.address, {from:admin});

			var newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], [addressToByte32str(escrow)], [], [], {from:payee});			
    });

	// ##################################################################################################
	// ##################################################################################################
	it("Create Escrow request by other guy impossible", async function () {
		var newRequest = await requestEthereum.createRequest(1, [addressToByte32str(escrow)], {from:otherguy});

		var r = await requestEthereum.accept(1, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestAccepted","Event LogRequestAccepted is missing after accept()");
		assert.equal(l.data[0],1,"Event LogRequestAccepted wrong args requestId");

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
	});

	it("accept request created OK", async function () {
		var r = await requestEthereum.accept(1, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestAccepted","Event LogRequestAccepted is missing after accept()");
		assert.equal(l.data[0],1,"Event LogRequestAccepted wrong args requestId");

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
	});

	it("decline request created OK", async function () {
		var r = await requestEthereum.decline(1, {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestDeclined","Event LogRequestDeclined is missing after decline()");
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

	it("cancel request created OK", async function () {
		var r = await requestEthereum.cancel(1, {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestCanceled","Event LogRequestCanceled is missing after cancel()");
		assert.equal(l.data[0],1,"Event LogRequestCanceled wrong args requestId");

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
	// ##################################################################################################
	// ##################################################################################################
	it("pay request not released by escrow OK", async function () {
		await requestEthereum.accept(1, {from:payer});
		var r = await requestEthereum.pay(1, 0, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"LogRequestEscrowPayment","Event LogRequestEscrowPayment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event LogRequestEscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event LogRequestEscrowPayment wrong args amount");

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

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(1);
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,0,"new request wrong data : amount to withdraw payee");
	});

	it("pay request already released by escrow OK", async function () {
		await requestEthereum.accept(1, {from:payer});
		await requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow});
		var r = await requestEthereum.pay(1, 0, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"LogRequestEscrowPayment","Event LogRequestEscrowPayment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event LogRequestEscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event LogRequestEscrowPayment wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestPayment","Event LogRequestPayment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event LogRequestPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event LogRequestPayment wrong args amount");

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

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(1);
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2   ,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");
		
		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("release request by escrow after payment OK", async function () {
		await requestEthereum.accept(1, {from:payer});
		await requestEthereum.pay(1, 0+10, {value:arbitraryAmount+10, from:payer});
		var r = await requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow});


		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestPayment","Event LogRequestPayment is missing after createRequest()");
		assert.equal(l.data[0],1,"Event LogRequestPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount+10,"Event LogRequestPayment wrong args amount");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount+10,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0+10,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(1);
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount+10,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount+10,"new request wrong data : amount to withdraw payee");
	});
	// ##################################################################################################
	// ##################################################################################################
});

