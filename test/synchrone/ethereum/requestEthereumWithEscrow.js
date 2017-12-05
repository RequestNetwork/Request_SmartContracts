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
var BigNumber = require('bignumber.js');

var ethABI = require("../../../lib/ethereumjs-abi-perso.js");
var ethUtil = require("ethereumjs-util");

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


contract('RequestEthereum with Escrow',  function(accounts) {
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

	var arbitraryAmount = 1000;

    beforeEach(async () => {
		requestCore = await RequestCore.new({from:admin});
		var requestBurnManagerSimple = await RequestBurnManagerSimple.new(0); 
		await requestCore.setBurnManager(requestBurnManagerSimple.address, {from:admin});
		
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});
    	requestSynchroneExtensionEscrow = await RequestSynchroneExtensionEscrow.new(requestCore.address,{from:admin});

		await requestCore.adminAddTrustedCurrencyContract(requestEthereum.address, {from:admin});
		await requestCore.adminAddTrustedCurrencyContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(requestSynchroneExtensionEscrow.address, {from:admin});

		var newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, requestSynchroneExtensionEscrow.address, [ethUtil.bufferToHex(ethABI.toSolidityBytes32("address",escrow))], "", {from:payee});
    });

	// ##################################################################################################
	// ##################################################################################################
	it("accept request created OK", async function () {
		var r = await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after accept()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");
	});
		
	it("accept request created OK - untrusted currencyContract", async function () {
		await requestCore.adminRemoveTrustedCurrencyContract(requestEthereum.address, {from:admin});
		var r = await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after accept()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");
	});

	it("cancel request created OK", async function () {
		var r = await requestEthereum.cancel(utils.getHashRequest(1), {from:payee});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Canceled","Event Canceled is missing after cancel()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Canceled wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],2,"new request wrong data : state");
	});
	// ##################################################################################################
	// ##################################################################################################
	it("pay request not released by escrow OK", async function () {
		var balancePayeeBefore = await web3.eth.getBalance(payee);
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		var r = await requestEthereum.paymentAction(utils.getHashRequest(1), 0, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,1,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after paymentAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event EscrowPayment wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],0,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");
		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),0,"new request wrong data : amount to withdraw payee");
	});

	it("pay request already released by escrow OK", async function () {
		var balancePayeeBefore = await web3.eth.getBalance(payee);
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});
		var r = await requestEthereum.paymentAction(utils.getHashRequest(1), 0, {value:arbitraryAmount, from:payer});
		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowPayment","Event EscrowPayment is missing after paymentAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event EscrowPayment wrong args amount");

		l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after paymentAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2   ,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");		
		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("release request by escrow after payment OK", async function () {
		var balancePayeeBefore = await web3.eth.getBalance(payee);
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await requestEthereum.paymentAction(utils.getHashRequest(1), 0+10, {value:arbitraryAmount+10, from:payer});
		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowReleaseRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount+10,"Event UpdateBalance wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount+10,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount+10,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount+10,"new request wrong data : balance");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount+10,"new request wrong data : amount to withdraw payee");
	});
	// ##################################################################################################
	// ##################################################################################################


	it("Emergency drain money if core is paused OK", async function () {
		var balancePayeeBefore = await web3.eth.getBalance(payee);
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await requestEthereum.paymentAction(utils.getHashRequest(1), 0, {value:arbitraryAmount, from:payer});

		await requestCore.pause({from:admin});

		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowReleaseRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("Emergency drain money if requestEthereum is not trusted anymore OK", async function () {
		var balancePayeeBefore = await web3.eth.getBalance(payee);
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await requestEthereum.paymentAction(utils.getHashRequest(1), 0, {value:arbitraryAmount, from:payer});

		await requestCore.adminRemoveTrustedCurrencyContract(requestEthereum.address, {from:admin});

		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowReleaseRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("Emergency drain money if requestSynchroneExtensionEscrow is not trusted anymore OK", async function () {

		var balancePayeeBefore = await web3.eth.getBalance(payee);
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
		await requestEthereum.paymentAction(utils.getHashRequest(1), 0, {value:arbitraryAmount, from:payer});

		await requestCore.adminRemoveExtension(requestSynchroneExtensionEscrow.address, {from:admin});

		var r = await requestSynchroneExtensionEscrow.releaseToPayeeAction(utils.getHashRequest(1), {from:escrow});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestSynchroneExtensionEscrow.abi);
		assert.equal(l.name,"EscrowReleaseRequest","Event EscrowReleaseRequest is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event EscrowReleaseRequest wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after releaseToPayeeAction()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amount");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payee,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : balance");
		assert.equal(newReq[6],1,"new request wrong data : state");

		var newReq = await requestSynchroneExtensionEscrow.escrows.call(utils.getHashRequest(1));
		assert.equal(newReq[0],requestEthereum.address,"new request wrong data : currencyContract");
		assert.equal(newReq[1],escrow,"new request wrong data : escrow");
		assert.equal(newReq[2],2,"new request wrong data : state");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : balance");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

});

