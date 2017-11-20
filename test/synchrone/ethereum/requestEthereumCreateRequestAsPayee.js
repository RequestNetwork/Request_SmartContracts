var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./test/synchrone/TestRequestSynchroneInterfaceContinue.sol");

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

contract('RequestEthereum createRequestAsPayee',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	// var creator = accounts[5];
	var fakeExtention1 ;
	var fakeExtention2;
	var fakeExtention3 ;
	var fakeExtention4Untrusted = accounts[9];

	var requestCore;
	var requestEthereum;

	var arbitraryAmount = 1000;

    beforeEach(async () => {
    	fakeExtention1 = await TestRequestSynchroneInterfaceContinue.new(1);
    	fakeExtention2 = await TestRequestSynchroneInterfaceContinue.new(2);
    	fakeExtention3 = await TestRequestSynchroneInterfaceContinue.new(3);

		requestCore = await RequestCore.new();
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtention1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention3.address, {from:admin});
    });


	it("basic check on payee payer creator", async function () {
		// new request payer==0 OK
		await utils.expectThrow(requestEthereum.createRequestAsPayee(0, arbitraryAmount, 0, [], "", {from:payee}));
		// new request payee==payer impossible
		await utils.expectThrow(requestEthereum.createRequestAsPayee(payee, arbitraryAmount, 0, [], "", {from:payee}));
	});

	it("basic check on amountExpected", async function () {
		// new request _amountExpected >= 2^256 impossible
		await utils.expectThrow(requestEthereum.createRequestAsPayee(payer, new BigNumber(2).pow(256), 0, [], "", {from:payee}));
	});

	it("impossible to createRequest if Core Paused", async function () {
		await requestCore.pause({from:admin});
		await utils.expectThrow(requestEthereum.createRequestAsPayee(payer, arbitraryAmount, 0, [], "", {from:payee}));
	});

	it("new request msg.sender==payee without extensions OK", async function () {
		var r = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, 0, [], "", {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(l.data[2].toLowerCase(),payer,"Event Created wrong args payer");

		var r = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtension.call(utils.getHashRequest(1));
		assert.equal(e,0,"new request wrong data : extension1");
	});

	it("new request with 1 trustable extension without parameters", async function () {
		var r = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtention1.address, [], "", {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Created wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),payee,"Event Created wrong args payee");
		assert.equal(l.data[2].toLowerCase(),payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][2],0,"Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtension.call(utils.getHashRequest(1));
		assert.equal(e,fakeExtention1.address,"new request wrong data : extension1");
	});


	it("new request with 1 trustable extension with parameters", async function () {
		var r = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtention1.address, [otherguy,payee,123456789], "", {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event Payment wrong args requestId");
		assert.equal(l.data[1].toLowerCase(),payee,"Event Payment wrong args payee");
		assert.equal(l.data[2].toLowerCase(),payer,"Event Payment wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequestAsPayee()");
		assert.equal(l.data[0],utils.getHashRequest(1),"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0].toLowerCase(),otherguy+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1].toLowerCase(),payee+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][2],"0x75bcd15000000000000000000000000000000000000000000000000000000000","Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(utils.getHashRequest(1));
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtension.call(utils.getHashRequest(1));
		assert.equal(e,fakeExtention1.address,"new request wrong data : extension1");
	});

	it("new request with 1 non trustable extension impossible", async function () {
		var r = await utils.expectThrow(requestEthereum.createRequestAsPayee(payer, arbitraryAmount, fakeExtention4Untrusted, [otherguy,payee,123456789], "", {from:payee}));
	});


	it("new request when subContract not trusted Impossible", async function () {
		var requestEthereum2 = await RequestEthereum.new(requestCore.address,{from:admin});
		await utils.expectThrow(requestEthereum2.createRequestAsPayee(payer, arbitraryAmount, 0, [], "", {from:payee}));
	});
});

