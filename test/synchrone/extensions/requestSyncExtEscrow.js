var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");
var RequestSynchroneExtensionEscrow = artifacts.require("./synchrone/extensions/RequestSynchroneExtensionEscrow.sol");
var RequestBurnManagerSimple = artifacts.require("./collect/RequestBurnManagerSimple.sol");


// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./test/synchrone/TestRequestSynchroneInterfaceContinue.sol");
var TestRequestSynchroneInterfaceInterception = artifacts.require("./test/synchrone/TestRequestSynchroneInterfaceInterception.sol");
var TestRequestSynchroneExtensionLauncher = artifacts.require("./test/synchrone/TestRequestSynchroneExtensionLauncher.sol");
var TestRequestSynchroneCurrencyContractLauncher = artifacts.require("./test/synchrone/TestRequestSynchroneCurrencyContractLauncher.sol");

var ethABI = require("../../../lib/ethereumjs-abi-perso.js");
var ethUtil = require("ethereumjs-util");
var BigNumber = require('bignumber.js');

function addressToByte32str(str) {
	return str.indexOf('0x') == 0 ?  str.replace('0x','0x000000000000000000000000') : '0x000000000000000000000000'+str;
}
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
	var testRequestSynchroneCurrencyContractLauncher;

	var arbitraryAmount = 1000;

    beforeEach(async () => {
		requestCore = await RequestCore.new({from:admin});
		var requestBurnManagerSimple = await RequestBurnManagerSimple.new(0); 
		await requestCore.setBurnManager(requestBurnManagerSimple.address, {from:admin});
		
		requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});
		requestSynchroneExtensionEscrow = await RequestSynchroneExtensionEscrow.new(requestCore.address,{from:admin});
		testRequestSynchroneCurrencyContractLauncher = await TestRequestSynchroneCurrencyContractLauncher.new(1,requestCore.address,true,true,true,true,true,true,true,{from:admin});

		await requestCore.adminAddTrustedCurrencyContract(requestEthereum.address, {from:admin});
		await requestCore.adminAddTrustedCurrencyContract(fakeTrustedContract, {from:admin});
		await requestCore.adminAddTrustedCurrencyContract(testRequestSynchroneCurrencyContractLauncher.address, {from:admin});

		await requestCore.adminAddTrustedExtension(requestSynchroneExtensionEscrow.address, {from:admin});

		// request 1 with fakeTrustedContract
		await requestCore.createRequest(payee, payee, payer, arbitraryAmount, requestSynchroneExtensionEscrow.address, "", {from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.createRequest(utils.getHashRequest(1), [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], {from:fakeTrustedContract})

		// request 2 with testRequestSynchroneCurrencyContractLauncher
		await testRequestSynchroneCurrencyContractLauncher.createRequest(payer, arbitraryAmount, requestSynchroneExtensionEscrow.address, [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], "", {from:payee});
    });

	// ##################################################################################################
	// ## Create Request
	// ##################################################################################################
	it("Create Escrow request by other guy impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.createRequest(utils.getHashRequest(3), [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], {from:otherguy}));
	});

	it("Create Escrow request by escrow impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.createRequest(utils.getHashRequest(3), [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], {from:escrow}));
	});

	it("Create Escrow request with parameters empty Impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.createRequest(utils.getHashRequest(3), 0, {from:fakeTrustedContract}));
	});

	it("Create Escrow request by a currencyContract trusted by core OK", async function () {
		var r = await requestSynchroneExtensionEscrow.createRequest(utils.getHashRequest(3), [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], {from:fakeTrustedContract})

		assert.equal(r.receipt.logs.length,0,"Wrong number of events");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(3));
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
		
	});

	it("Create Escrow request if escrow paused impossible", async function () {
		await requestSynchroneExtensionEscrow.pause({from:admin})
		await utils.expectThrow(requestSynchroneExtensionEscrow.createRequest(utils.getHashRequest(3), [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], {from:fakeTrustedContract}));
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

	// ##################################################################################################
	// ## Payment
	// ##################################################################################################
	it("payment Escrow by other guy impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), arbitraryAmount, {from:otherguy}));
	});

	it("payment Escrow by escrow impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), arbitraryAmount, {from:escrow}));
	});

	it("payment if Escrow State Refunded impossible", async function () {
		var newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, requestSynchroneExtensionEscrow.address, [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], "", {from:payee});
		await requestEthereum.accept(utils.getHashRequest(3),{from:payer});
		await requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(3), {from:escrow});
		await utils.expectThrow(requestEthereum.paymentAction(utils.getHashRequest(3), 0,{from:payer, value:arbitraryAmount}));
	});

	it("payment request _amount >= 2^256 impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), new BigNumber(2).pow(256), {from:fakeTrustedContract}));
	});

	it("payment request _amount+amountPaid >= 2^256 impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), new BigNumber(2).pow(256)-arbitraryAmount+1, {from:fakeTrustedContract}));
	});

	it("payment if Escrow State Created OK", async function () {
		assert.equal(await requestSynchroneExtensionEscrow.payment.call(utils.getHashRequest(1), arbitraryAmount, {from:fakeTrustedContract}),false,"Escrow Extension must return false");

		var r = await requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), arbitraryAmount, {from:fakeTrustedContract})

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after payment()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event EscrowPayment wrong args amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");
		

	});


	it("payment if Escrow State Released OK", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});

		assert.equal(await requestSynchroneExtensionEscrow.payment.call(utils.getHashRequest(1), arbitraryAmount, {from:fakeTrustedContract}),true,"Escrow Extension must return true");
		var r = await requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), arbitraryAmount, {from:fakeTrustedContract});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after payment()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event EscrowPayment wrong args amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");
		
	});

	it("payment request _amount == 0 OK", async function () {
		assert.equal(await requestSynchroneExtensionEscrow.payment.call(utils.getHashRequest(1), arbitraryAmount, {from:fakeTrustedContract}),false,"Escrow Extension must return false");
		var r = await requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), 0, {from:fakeTrustedContract})

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after payment()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],0,"Event EscrowPayment wrong args amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
		
	});

	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ## Release
	// ##################################################################################################
	it("release if request is Created Impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow}));
	});

	it("release if request is Canceled Impossible", async function () {
		await requestCore.cancel(utils.getHashRequest(1),{from:fakeTrustedContract});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow}));
	});

	it("release if escrow paused Impossible", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.pause({from:admin});
		await utils.expectThrow( requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow}));
	});

	it("release if request is Accepted OK", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowReleaseRequest wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
		
	});

	it("release by payer OK", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:payer});

		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowReleaseRequest wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],fakeTrustedContract,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
		
	});

	it("release by random guy Impossible", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:otherguy}));
	});

	it("release by currencyContract Impossible", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:fakeTrustedContract}));
	});

	it("release by payee Impossible", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:payee}));
	});

	it("release if escrow is Released Impossible", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow}));
	});

	it("release if escrow is Refunded Impossible", async function () {
		var newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, requestSynchroneExtensionEscrow.address, [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], "", {from:payee});
		await requestEthereum.accept(utils.getHashRequest(3),{from:payer});
		await requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(3), {from:escrow});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(3), {from:escrow}));
	});

	it("release if amountPaid-amountRefunded == 0 OK nothing special", async function () {
		var newRequest = await testRequestSynchroneCurrencyContractLauncher.createRequest(payer, arbitraryAmount, requestSynchroneExtensionEscrow.address, [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], "", {from:payee});
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(3),{from:payer});

		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(3), {from:escrow});

		assert.equal(r.receipt.logs.length,1, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(3),"Event EscrowReleaseRequest wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(3));
		assert.equal(newReq[0],testRequestSynchroneCurrencyContractLauncher.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
				
	});


	it("release if amountPaid-amountRefunded > 0 OK launch payment to currencyContract", async function () {
		var newRequest = await testRequestSynchroneCurrencyContractLauncher.createRequest(payer, arbitraryAmount, requestSynchroneExtensionEscrow.address, [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], "", {from:payee});
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(3),{from:payer});
		await testRequestSynchroneCurrencyContractLauncher.launchPayment(utils.getHashRequest(3), arbitraryAmount);

		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(3), {from:escrow});

		assert.equal(r.receipt.logs.length,3, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(3),"Event EscrowReleaseRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneCurrencyContractLauncher.abi);
		assert.equal(l.name,"LogTestPayment","Event LogTestPayment is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(3),"Event LogTestPayment wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestPayment wrong args constant_id");
		assert.equal(l.data[2],arbitraryAmount,"Event LogTestPayment wrong args _amount");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(3),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args _amount");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(3));
		assert.equal(newReq[0],testRequestSynchroneCurrencyContractLauncher.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");
				
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################


	// ##################################################################################################
	// ## Escrow Refund
	// ##################################################################################################

	it("escrow refund if request is Created Impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow}));
	});

	it("escrow refund if request is Canceled Impossible", async function () {
		await testRequestSynchroneCurrencyContractLauncher.cancel(utils.getHashRequest(2),{from:payer});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow}));
	});

	it("refund if escrow paused Impossible", async function () {
		await requestSynchroneExtensionEscrow.pause({from:admin});
		await utils.expectThrow( requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow}));
	});


	it("escrow refund if request is Accepted OK", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});

		var r = await requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow});

		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowRefundRequest","Event EscrowRefundRequest is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event EscrowRefundRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneCurrencyContractLauncher.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args constant_id");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Canceled wrong args requestId");


		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(2));
		assert.equal(newReq[0],testRequestSynchroneCurrencyContractLauncher.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],1,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
		
	});

	it("refund by payee OK", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});

		var r = await requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:payee});

		assert.equal(r.receipt.logs.length,3,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowRefundRequest","Event EscrowRefundRequest is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event EscrowRefundRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneCurrencyContractLauncher.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args constant_id");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Canceled wrong args requestId");


		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(2));
		assert.equal(newReq[0],testRequestSynchroneCurrencyContractLauncher.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],1,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
		
	});

	it("escrow refund by random guy Impossible", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:otherguy}));
	});

	it("escrow refund by currencyContract Impossible", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:fakeTrustedContract}));
	});

	it("escrow refund if escrow is Released Impossible", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});
		await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(2), {from:escrow});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow}));
	});

	it("escrow refund if escrow is Refunded Impossible", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});
		await requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow});
		await utils.expectThrow(requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow}));
	});

	it("escrow refund if amountPaid-amountRefunded == 0 OK nothing special", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});
		var r = await requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow});

		assert.equal(r.receipt.logs.length,3, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowRefundRequest","Event EscrowRefundRequest is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event EscrowRefundRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneCurrencyContractLauncher.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args constant_id");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Canceled wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(2));
		assert.equal(newReq[0],testRequestSynchroneCurrencyContractLauncher.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],1,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");
				
	});

	it("escrow refund if amountPaid-amountRefunded > 0 OK launch fundOrder to currencyContract", async function () {
		await testRequestSynchroneCurrencyContractLauncher.accept(utils.getHashRequest(2),{from:payer});
		await testRequestSynchroneCurrencyContractLauncher.launchPayment(utils.getHashRequest(2), arbitraryAmount);
		var r = await requestSynchroneExtensionEscrow.releaseToPayerAction(utils.getHashRequest(2), {from:escrow});

		assert.equal(r.receipt.logs.length,4, "Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowRefundRequest","Event EscrowRefundRequest is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event EscrowRefundRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], testRequestSynchroneCurrencyContractLauncher.abi);
		assert.equal(l.name,"LogTestFundOrder","Event LogTestFundOrder is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestFundOrder wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestFundOrder wrong args constant_id");
		assert.equal(l.data[2].toLowerCase(),payer,"Event LogTestFundOrder wrong args _recipient");
		assert.equal(l.data[3],arbitraryAmount,"Event LogTestFundOrder wrong args _amount");

		var l = getEventFromReceipt(r.receipt.logs[2], testRequestSynchroneCurrencyContractLauncher.abi);
		assert.equal(l.name,"LogTestCancel","Event LogTestCancel is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event LogTestCancel wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCancel wrong args constant_id");

		var l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after releaseToPayerAction()");
		assert.equal(l.data[0],utils.getHashRequest(2),"Event Canceled wrong args requestId");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(2));
		assert.equal(newReq[0],testRequestSynchroneCurrencyContractLauncher.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],1,"new request wrong data : state");
		assert.equal(newReq[3],0,"new request wrong data : balance");	
	});
	// ##################################################################################################
	// ##################################################################################################
	// ##################################################################################################

	// ##################################################################################################
	// ## Escrow Cancel
	// ##################################################################################################
	it("cancel by other guy impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.cancel(utils.getHashRequest(2), {from:otherguy}));
	});

	it("cancel by other trusted contract impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.cancel(utils.getHashRequest(2), {from:fakeTrustedContract}));
	});

	it("cancel by escrow impossible", async function () {
		await utils.expectThrow(requestSynchroneExtensionEscrow.cancel(utils.getHashRequest(2), {from:escrow}));
	});

	it("cancel if amountPaid-amountRefunded == 0  OK (return true)", async function () {
		assert.equal(await requestSynchroneExtensionEscrow.cancel.call(utils.getHashRequest(1), {from:fakeTrustedContract}),true,'return of cancel must be true');
	});

	it("cancel if amountPaid-amountRefunded != 0  Intercepted (return false)", async function () {
		await requestCore.accept(utils.getHashRequest(1),{from:fakeTrustedContract});
		await requestSynchroneExtensionEscrow.payment(utils.getHashRequest(1), arbitraryAmount, {from:fakeTrustedContract})
		assert.equal(await requestSynchroneExtensionEscrow.cancel.call(utils.getHashRequest(1), {from:fakeTrustedContract}),false,'return of cancel must be true');
	});

});

