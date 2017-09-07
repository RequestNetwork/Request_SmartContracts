// return;

var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestSynchroneExtensionEscrow = artifacts.require("./RequestSynchroneExtensionEscrow.sol");


// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./TestRequestSynchroneInterfaceContinue.sol");
var TestRequestSynchroneInterfaceInterception = artifacts.require("./TestRequestSynchroneInterfaceInterception.sol");
var TestRequestSynchroneExtensionLauncher = artifacts.require("./TestRequestSynchroneExtensionLauncher.sol");
var TestRequestSynchroneSubContractLauncher = artifacts.require("./TestRequestSynchroneSubContractLauncher.sol");

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
	var testRequestSynchroneSubContractLauncher;

	var arbitraryAmount = 100000000;

    beforeEach(async () => {
			requestCore = await RequestCore.new({from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});
    	requestSynchroneExtensionEscrow = await RequestSynchroneExtensionEscrow.new(requestCore.address,{from:admin});
			testRequestSynchroneSubContractLauncher = await TestRequestSynchroneSubContractLauncher.new(1,requestCore.address,true,true,true,true,true,true,true,true,true,{from:admin});

			await requestCore.adminResume({from:admin});
			await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
			await requestCore.adminAddTrustedSubContract(fakeTrustedContract, {from:admin});
			await requestCore.adminAddTrustedSubContract(testRequestSynchroneSubContractLauncher.address, {from:admin});

			await requestCore.adminAddTrustedExtension(requestSynchroneExtensionEscrow.address, {from:admin});

			// request 1 with fakeTrustedContract
			await requestCore.createRequest(payee, payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], {from:fakeTrustedContract});
			await requestSynchroneExtensionEscrow.createRequest(1, [addressToByte32str(escrow)], {from:fakeTrustedContract})

			// request 2 with testRequestSynchroneSubContractLauncher
			await testRequestSynchroneSubContractLauncher.createRequest(payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], [addressToByte32str(escrow)], {from:payee});
    });

	// ##################################################################################################
	// ## Create Request
	// ##################################################################################################
	it("Create Escrow request by other guy impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.createRequest(3, [addressToByte32str(escrow)], {from:otherguy}));
	});

	it("Create Escrow request by escrow impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.createRequest(3, [addressToByte32str(escrow)], {from:escrow}));
	});

	it("Create Escrow request with parameters empty Impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.createRequest(3, [], {from:fakeTrustedContract}));
	});

	it("Create Escrow request by a subContract trusted by core OK", async function () {
		var r = await requestSynchroneExtensionEscrow.createRequest(3, [addressToByte32str(escrow)], {from:fakeTrustedContract})

		assert.equal(r.receipt.logs.length,0,"Wrong number of events");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(3);
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
		await requestEthereum.accept(3,{from:payer});
		await requestSynchroneExtensionEscrow.refundToPayer(3, {from:escrow});
		await expectThrow(requestEthereum.pay(3, 0,{from:payer, value:arbitraryAmount}));
	});

	it("payment request _amount >= 2^256 impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.payment(1, new BigNumber(2).pow(256), {from:fakeTrustedContract}));
	});

	it("payment request _amount+amountPaid >= 2^256 impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.payment(1, new BigNumber(2).pow(256)-arbitraryAmount+1, {from:fakeTrustedContract}));
	});

	it("payment if Escrow State Created OK", async function () {
		assert.equal(await requestSynchroneExtensionEscrow.payment.call(1, arbitraryAmount, {from:fakeTrustedContract}),false,"Escrow Extension must return false");

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

		assert.equal(await requestSynchroneExtensionEscrow.payment.call(1, arbitraryAmount, {from:fakeTrustedContract}),true,"Escrow Extension must return true");
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
		assert.equal(await requestSynchroneExtensionEscrow.payment.call(1, arbitraryAmount, {from:fakeTrustedContract}),false,"Escrow Extension must return false");
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
		await requestEthereum.accept(3,{from:payer});
		await requestSynchroneExtensionEscrow.refundToPayer(3, {from:escrow});
		await expectThrow(requestSynchroneExtensionEscrow.releaseToPayee(3, {from:escrow}));
	});


	it("release if amountPaid-amountRefunded == 0 OK nothing special", async function () {
		var newRequest = await testRequestSynchroneSubContractLauncher.createRequest(payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], [addressToByte32str(escrow)], {from:payee});
		await testRequestSynchroneSubContractLauncher.accept(3,{from:payer});

		var r = await requestSynchroneExtensionEscrow.releaseToPayee(3, {from:escrow});

		assert.equal(r.receipt.logs.length,1, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayee()");
		assert.equal(l.data[0],3,"Event EscrowReleaseRequest wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(3);
		assert.equal(newReq[0],testRequestSynchroneSubContractLauncher.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");		
	});


	it("release if amountPaid-amountRefunded > 0 OK launch payment to subContract", async function () {
		var newRequest = await testRequestSynchroneSubContractLauncher.createRequest(payee, payer, arbitraryAmount, [requestSynchroneExtensionEscrow.address], [addressToByte32str(escrow)], {from:payee});
		await testRequestSynchroneSubContractLauncher.accept(3,{from:payer});
		await testRequestSynchroneSubContractLauncher.launchPayment(3, arbitraryAmount);

		var r = await requestSynchroneExtensionEscrow.releaseToPayee(3, {from:escrow});

		assert.equal(r.receipt.logs.length,3, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayee()");
		assert.equal(l.data[0],3,"Event EscrowReleaseRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneSubContractLauncher.abi);
		assert.equal(l.name,"LogTestPayment","Event LogTestPayment is missing after releaseToPayee()");
		assert.equal(l.data[0],3,"Event LogTestPayment wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestPayment wrong args constant_id");
		assert.equal(l.data[2],arbitraryAmount,"Event LogTestPayment wrong args _amount");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestPayment","Event LogRequestPayment is missing after releaseToPayee()");
		assert.equal(l.data[0],3,"Event LogRequestPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event LogRequestPayment wrong args _amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(3);
		assert.equal(newReq[0],testRequestSynchroneSubContractLauncher.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");		
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ## Escrow Refund
	// ##################################################################################################

	it("escrow refund if request is Created Impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow}));
	});

	it("escrow refund if request is Declined Impossible", async function () {
		await testRequestSynchroneSubContractLauncher.decline(2,{from:payer});
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow}));
	});

	it("escrow refund if request is Canceled Impossible", async function () {
		await testRequestSynchroneSubContractLauncher.cancel(2,{from:payer});
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow}));
	});

	it("escrow refund if request is Accepted OK", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});

		var r = await requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow});

		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowRefundRequest","Event EscrowRefundRequest is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event EscrowRefundRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneSubContractLauncher.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args constant_id");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestCanceled","Event LogRequestCanceled is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event LogRequestCanceled wrong args requestId");


		var newReq = await requestSynchroneExtensionEscrow.escrows.call(2);
		assert.equal(newReq[0],testRequestSynchroneSubContractLauncher.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],1,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");
	});

	it("escrow refund by random guy Impossible", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:otherguy}));
	});

	it("escrow refund by subContract Impossible", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:fakeTrustedContract}));
	});

	it("escrow refund by payee Impossible", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:payee}));
	});

	it("escrow refund if escrow is Released Impossible", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});
		await requestSynchroneExtensionEscrow.releaseToPayee(2, {from:escrow});
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow}));
	});

	it("escrow refund if escrow is Refunded Impossible", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});
		await requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow});
		await expectThrow(requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow}));
	});

	it("escrow refund if amountPaid-amountRefunded == 0 OK nothing special", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});
		var r = await requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow});

		assert.equal(r.receipt.logs.length,3, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowRefundRequest","Event EscrowRefundRequest is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event EscrowRefundRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneSubContractLauncher.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args constant_id");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestCanceled","Event LogRequestCanceled is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event LogRequestCanceled wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(2);
		assert.equal(newReq[0],testRequestSynchroneSubContractLauncher.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],1,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : amountPaid");
		assert.equal(newReq[4],0,"new request wrong data : amountRefunded");		
	});

	it("escrow refund if amountPaid-amountRefunded > 0 OK launch fundOrder to subContract", async function () {
		await testRequestSynchroneSubContractLauncher.accept(2,{from:payer});
		await testRequestSynchroneSubContractLauncher.launchPayment(2, arbitraryAmount);
		var r = await requestSynchroneExtensionEscrow.refundToPayer(2, {from:escrow});

		assert.equal(r.receipt.logs.length,4, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowRefundRequest","Event EscrowRefundRequest is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event EscrowRefundRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneSubContractLauncher.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args constant_id");
		assert.equal(l.data[2],payer,"Event LogTestFundOrder wrong args _recipient");
		assert.equal(l.data[3],arbitraryAmount,"Event LogTestFundOrder wrong args _amount");

		var l = getEventFromReceipt(r.receipt.logs[2], testRequestSynchroneSubContractLauncher.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args constant_id");

		var l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestCanceled","Event LogRequestCanceled is missing after refundToPayer()");
		assert.equal(l.data[0],2,"Event LogRequestCanceled wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(2);
		assert.equal(newReq[0],testRequestSynchroneSubContractLauncher.address,"new request wrong data : subContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],1,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[4],arbitraryAmount,"new request wrong data : amountRefunded");		
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

	// ##################################################################################################
	// ## Escrow Cancel
	// ##################################################################################################
	it("cancel by other guy impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.cancel(2, {from:otherguy}));
	});

	it("cancel by other trusted contract impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.cancel(2, {from:fakeTrustedContract}));
	});

	it("cancel by escrow impossible", async function () {
		await expectThrow(requestSynchroneExtensionEscrow.cancel(2, {from:escrow}));
	});

	it("cancel if amountPaid-amountRefunded == 0  OK (return true)", async function () {
		assert.equal(await requestSynchroneExtensionEscrow.cancel.call(1, {from:fakeTrustedContract}),true,'return of cancel must be true');
	});

	it("cancel if amountPaid-amountRefunded != 0  Intercepted (return false)", async function () {
		await requestCore.accept(1,{from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.payment(1, arbitraryAmount, {from:fakeTrustedContract})
		assert.equal(await requestSynchroneExtensionEscrow.cancel.call(1, {from:fakeTrustedContract}),false,'return of cancel must be true');
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################
});

