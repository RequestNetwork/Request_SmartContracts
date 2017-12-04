var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var ethUtil = require("ethereumjs-util");

// var ethABI = require("ethereumjs-abi");
// waiting for Solidity pack Array support (vrolland did a pull request)
var ethABI = require("../../../lib/ethereumjs-abi-perso.js"); 

const BN = require('bn.js')

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./test/synchrone/TestRequestSynchroneInterfaceContinue.sol");
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

contract('RequestEthereum createRequestAsPayer',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];

	// var creator = accounts[5];
	var fakeExtention1;
	var fakeExtention2;
	var fakeExtention3;
	var fakeExtention4Untrusted = accounts[9];
	var fakeExtentionLauncherAcceptFalse;

	var requestCore;
	var requestEthereum;

	var arbitraryAmount = 1000;
	var arbitraryAmount10percent = 100;

    beforeEach(async () => {
    	fakeExtention1 = await TestRequestSynchroneInterfaceContinue.new(1);
    	fakeExtention2 = await TestRequestSynchroneInterfaceContinue.new(2);
    	fakeExtention3 = await TestRequestSynchroneInterfaceContinue.new(3);
    	fakeExtentionLauncherAcceptFalse = await TestRequestSynchroneExtensionLauncher.new(21,true,false,true,true,true,true,true,true);

		requestCore = await RequestCore.new();
		requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

		await requestCore.adminAddTrustedCurrencyContract(requestEthereum.address, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtention1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention3.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtentionLauncherAcceptFalse.address, {from:admin});
    });

	it("new quick request more than expectedAmount (with tips that make the new quick requestment under expected) OK", async function () {
		var extension = 0;
		var listParamsExtensions = [];
		var balancePayeeBefore = await web3.eth.getBalance(payee);

		var r = await requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													arbitraryAmount10percent,"", 
													{from:payer, value:arbitraryAmount+1});

		assert.equal(r.receipt.logs.length,4,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(l.data[2].toLowerCase(),payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"UpdateExpectedAmount","Event UpdateExpectedAmount is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateExpectedAmount wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event UpdateExpectedAmount wrong args amount");

		var l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount+1,"Event UpdateBalance wrong args amountPaid");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new quick request wrong data : creator");
		assert.equal(newReq[1],payee,"new quick request wrong data : payee");
		assert.equal(newReq[2],payer,"new quick request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount+arbitraryAmount10percent,"new quick request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new quick request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount+1,"new quick request wrong data : amountPaid");
		assert.equal(newReq[6],1,"new quick request wrong data : state");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount+1,"new request wrong data : amount to withdraw payee");
	});

	it("new quick request more than expectedAmount (with tips but still too much) Impossible", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var r = await (requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													1,"", 
													{from:payer, value:arbitraryAmount+2}));

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new quick request wrong data : creator");
		assert.equal(newReq[1],payee,"new quick request wrong data : payee");
		assert.equal(newReq[2],payer,"new quick request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount+1,"new quick request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new quick request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount+2,"new quick request wrong data : amountPaid");
		assert.equal(newReq[6],1,"new quick request wrong data : state");
	});

	it("new quick request pay more than expectedAmount (without tips) Impossible", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var r = await (requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													0, "", 
													{from:payer, value:arbitraryAmount+1}));

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new quick request wrong data : creator");
		assert.equal(newReq[1],payee,"new quick request wrong data : payee");
		assert.equal(newReq[2],payer,"new quick request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new quick request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new quick request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount+1,"new quick request wrong data : amountPaid");
		assert.equal(newReq[6],1,"new quick request wrong data : state");
	});

	it("new quick request with more tips than msg.value Impossible", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var r = await (requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													arbitraryAmount10percent, "", 
													{from:payer, value:0}));

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new quick request wrong data : creator");
		assert.equal(newReq[1],payee,"new quick request wrong data : payee");
		assert.equal(newReq[2],payer,"new quick request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount+arbitraryAmount10percent,"new quick request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new quick request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new quick request wrong data : amountPaid");
		assert.equal(newReq[6],1,"new quick request wrong data : state");
	});

	it("new quick request with tips OK", async function () {
		var extension = 0;
		var listParamsExtensions = [];
		var balancePayeeBefore = await web3.eth.getBalance(payee);

		var r = await requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													arbitraryAmount10percent,"", 
													{from:payer, value:arbitraryAmount});

		assert.equal(r.receipt.logs.length,4,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(l.data[2].toLowerCase(),payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"UpdateExpectedAmount","Event UpdateExpectedAmount is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateExpectedAmount wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event UpdateExpectedAmount wrong args amount");

		var l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amountPaid");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new quick request wrong data : creator");
		assert.equal(newReq[1],payee,"new quick request wrong data : payee");
		assert.equal(newReq[2],payer,"new quick request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount+arbitraryAmount10percent,"new quick request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new quick request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new quick request wrong data : amountPaid");
		assert.equal(newReq[6],1,"new quick request wrong data : state");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("new quick request payee==payer impossible", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var r = await utils.expectThrow(requestEthereum.createRequestAsPayer(payer, arbitraryAmount, 
									extension,
									listParamsExtensions, 
									0, "", 
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request payee==0 impossible", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var r = await utils.expectThrow(requestEthereum.createRequestAsPayer(0, arbitraryAmount, 
									extension,
									listParamsExtensions, 
									0, "", 
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request msg.sender==payee impossible", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var r = await utils.expectThrow(requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
									extension,
									listParamsExtensions, 
									0, "", 
									{from:payee, value:arbitraryAmount}));
	});

	it("impossible to createQuickquick request if Core Paused", async function () {
		await requestCore.pause({from:admin});

		var extension = 0;
		var listParamsExtensions = [];

		var r = await utils.expectThrow(requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
									extension,
									listParamsExtensions, 
									0, "", 
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request msg.value > 0 OK", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var balancePayeeBefore = await web3.eth.getBalance(payee);
		var r = await requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													0, "", 
													{from:payer, value:arbitraryAmount});

		assert.equal(r.receipt.logs.length,3,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(l.data[2].toLowerCase(),payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"UpdateBalance","Event UpdateBalance is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event UpdateBalance wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event UpdateBalance wrong args amountPaid");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new quick request wrong data : creator");
		assert.equal(newReq[1],payee,"new quick request wrong data : payee");
		assert.equal(newReq[2],payer,"new quick request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new quick request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new quick request wrong data : currencyContract");
		assert.equal(newReq[5],arbitraryAmount,"new quick request wrong data : amountPaid");
		assert.equal(newReq[6],1,"new quick request wrong data : state");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("new quick request signed by payee and data match signature OK", async function () {
		var extension = 0;
		var listParamsExtensions = [];

		var balancePayeeBefore = await web3.eth.getBalance(payee);
		var r = await requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													0, "", 
													{from:payer, value:0});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(l.data[2].toLowerCase(),payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"Accepted","Event Accepted is missing after createRequestAsPayer()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Accepted wrong args requestId");

		var newReq = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(newReq[0],payer,"new quick request wrong data : creator");
		assert.equal(newReq[1],payee,"new quick request wrong data : payee");
		assert.equal(newReq[2],payer,"new quick request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new quick request wrong data : expectedAmount");
		assert.equal(newReq[4],requestEthereum.address,"new quick request wrong data : currencyContract");
		assert.equal(newReq[5],0,"new quick request wrong data : amountPaid");
		assert.equal(newReq[6],1,"new quick request wrong data : state");

		assert.equal((await web3.eth.getBalance(payee)).sub(balancePayeeBefore),0,"new request wrong data : amount to withdraw payee");
	});

	// #####################################################################################
	// Extensions
	// #####################################################################################
// new quick request with 3 trustable extensions with parameters

	it("new quick request with 1 extension intercepting accept impossible", async function () {
		var extension = fakeExtentionLauncherAcceptFalse.address;
		var listParamsExtensions = [];

		await utils.expectThrow(requestEthereum.createRequestAsPayer(payee, arbitraryAmount, 
													extension,
													listParamsExtensions, 
													0, "", 
													{from:payer, value:arbitraryAmount}));
	});

	// #####################################################################################
	// #####################################################################################
	// #####################################################################################

	it("new request when currencyContract not trusted Impossible", async function () {
		var requestEthereum2 = await RequestEthereum.new(requestCore.address,{from:admin});
		await utils.expectThrow(requestEthereum2.createRequestAsPayer(payee, arbitraryAmount, 0, [], 0, "", {from:payer, value:arbitraryAmount}));
	});
});

