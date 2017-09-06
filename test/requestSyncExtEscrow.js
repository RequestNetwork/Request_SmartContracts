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



contract('Request Synchrone extension Escrow',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeTrustedContract = accounts[2];
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
			await requestCore.adminAddTrustedSubContract(fakeTrustedContract, {from:admin});
			await requestCore.adminAddTrustedExtension(requestSynchroneExtensionEscrow.address, {from:admin});

			await requestCore.createRequest(payee, payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], {from:fakeTrustedContract});
			await requestSynchroneExtensionEscrow.createRequest(1, [addressToByte32str(escrow)], {from:fakeTrustedContract})
    });

	// ##################################################################################################
	// ## Create Request
	// ##################################################################################################
	it("Create Escrow request by other guy impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.createRequest(2, [addressToByte32str(escrow)], {from:otherguy}));
	});

	it("Create Escrow request by escrow impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.createRequest(2, [addressToByte32str(escrow)], {from:escrow}));
	});

	it("Create Escrow request with parameters empty Impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.createRequest(2, [], {from:fakeTrustedContract}));
	});

	it("Create Escrow request by a subContract trusted by core OK", async function () {
		var r = await requestSynchroneExtensionEscrow.createRequest(2, [addressToByte32str(escrow)], {from:fakeTrustedContract})

		assert.equal(r.receipt.logs.length,0,"Wrong number of events");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(2);
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ## Payment
	// ##################################################################################################
	it("payment Escrow by other guy impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.payment(1, arbitraryAmount, {from:otherguy}));
	});

	it("payment Escrow by escrow impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.payment(1, arbitraryAmount, {from:escrow}));
	});

	it("payment if Escrow State Refunded impossible", async function () {
		var newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], [addressToByte32str(escrow)], [], [], {from:payee});
		await requestEthereum.accept(2,{from:payer});
		await requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow});
		await expectThrow(requestEthereum.pay(2, 0,{from:payer, value:arbitraryAmount}));
	});

	it("payment request _amount >= 2^256 impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.payment(1, new BigNumber(2).pow(256), {from:fakeTrustedContract}));
	});

	it("payment request _amount+amountPaid >= 2^256 impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.payment(1, new BigNumber(2).pow(256)-arbitraryAmount+1, {from:fakeTrustedContract}));
	});

	it("payment if Escrow State Created OK", async function () {
		var r = await requestSynchroneExtensionEscrow.payment(1, arbitraryAmount, {from:fakeTrustedContract})

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after payment()");
		assert.equal(l.data[0],1,"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event EscrowPayment wrong args amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(1);
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");
	});


	it("payment if Escrow State Released OK", async function () {
		await requestCore.accept(1,{from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow});
		var r = await requestSynchroneExtensionEscrow.payment(1, arbitraryAmount, {from:fakeTrustedContract});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after payment()");
		assert.equal(l.data[0],1,"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event EscrowPayment wrong args amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(1);
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");
	});


	it("payment request _amount == 0 OK", async function () {
		var r = await requestSynchroneExtensionEscrow.payment(1, 0, {from:fakeTrustedContract})

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after payment()");
		assert.equal(l.data[0],1,"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],0,"Event EscrowPayment wrong args amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(1);
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ## Release
	// ##################################################################################################
	it("release if request is Created Impossible", async function () {
		// await requestCore.accept(1,{from:fakeTrustedContract});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow}));
	});

	it("release if request is Declined Impossible", async function () {
		await requestCore.decline(1,{from:fakeTrustedContract});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow}));
	});

	it("release if request is Canceled Impossible", async function () {
		await requestCore.cancel(1,{from:fakeTrustedContract});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow}));
	});


	it("release if request is Accepted OK", async function () {
		await requestCore.accept(1,{from:fakeTrustedContract});
		var r = await requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayee()");
		assert.equal(l.data[0],1,"Event EscrowReleaseRequest wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(1);
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");
	});

	it("release by random guy Impossible", async function () {
		await requestCore.accept(1,{from:fakeTrustedContract});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(1, {from:otherguy}));
	});

	it("release by subContract Impossible", async function () {
		await requestCore.accept(1,{from:fakeTrustedContract});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(1, {from:fakeTrustedContract}));
	});

	it("release by payee Impossible", async function () {
		await requestCore.accept(1,{from:fakeTrustedContract});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(1, {from:payee}));
	});

	it("release if escrow is Released Impossible", async function () {
		await requestCore.accept(1,{from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(1, {from:escrow}));
	});

	it("release if escrow is Refunded Impossible", async function () {
		var newRequest = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], [addressToByte32str(escrow)], [], [], {from:payee});
		await requestEthereum.accept(2,{from:payer});
		await requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(2, {from:escrow}));
	});


});

