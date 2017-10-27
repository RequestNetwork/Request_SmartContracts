var config = require("../../config.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./test/synchrone/TestRequestSynchroneInterfaceContinue.sol");

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


contract('RequestEthereum createRequest',  function(accounts) {
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

	var arbitraryAmount = 100000000;

    beforeEach(async () => {
    	fakeExtention1 = await TestRequestSynchroneInterfaceContinue.new(1);
    	fakeExtention2 = await TestRequestSynchroneInterfaceContinue.new(2);
    	fakeExtention3 = await TestRequestSynchroneInterfaceContinue.new(3);

		requestCore = await RequestCore.new();
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtention1.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention2.address, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention3.address, {from:admin});
    });


	it("basic check on payee payer creator", async function () {
		// new request msg.sender!=payee and != payer impossible	
		await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:otherguy}));
		// new request payee==0 impossible
		await expectThrow(requestEthereum.createRequest(0, payer, arbitraryAmount, [], [], {from:payer}));
		// new request payer==0 impossible
		await expectThrow(requestEthereum.createRequest(payee, 0, arbitraryAmount, [], [], {from:payee}));
		// new request payee==payer impossible
		await expectThrow(requestEthereum.createRequest(payer, payer, arbitraryAmount, [], [], {from:payee}));
	});

	it("basic check on amountExpected", async function () {
		// new request _amountExpected == 0 impossible
		await expectThrow(requestEthereum.createRequest(payee, payer, 0, [], [], {from:payee}));
		// new request _amountExpected >= 2^256 impossible
		await expectThrow(requestEthereum.createRequest(payee, payer, new BigNumber(2).pow(256), [], [], {from:payee}));
	});

	it("impossible to createRequest if Core Paused", async function () {
		await requestCore.adminPause({from:admin});
		await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee}));
	});

	it("impossible to createRequest if Core Deprecated", async function () {
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee}));
	});


	it("new request msg.sender==payee without extensions OK", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Created wrong args requestId");
		assert.equal(l.data[1],payee,"Event Created wrong args payee");
		assert.equal(l.data[2],payer,"Event Created wrong args payer");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],0,"new request wrong data : extension1");
		assert.equal(e[1],0,"new request wrong data : extension2");
		assert.equal(e[2],0,"new request wrong data : extension3");
	});

	it("new request msg.sender==payer without extensions OK", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [], [], {from:payer});
		
		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Created wrong args requestId");
		assert.equal(l.data[1],payee,"Event Created wrong args payee");
		assert.equal(l.data[2],payer,"Event Created wrong args payer");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payer,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],0,"new request wrong data : extension1");
		assert.equal(e[1],0,"new request wrong data : extension2");
		assert.equal(e[2],0,"new request wrong data : extension3");
	});

	it("new request with 1 trustable extension without parameters", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address], [], {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Created wrong args requestId");
		assert.equal(l.data[1],payee,"Event Created wrong args payee");
		assert.equal(l.data[2],payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][2],0,"Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],fakeExtention1.address,"new request wrong data : extension1");
		assert.equal(e[1],0,"new request wrong data : extension2");
		assert.equal(e[2],0,"new request wrong data : extension3");
	});


	it("new request with 2 trustable extensions without parameters", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address, fakeExtention2.address], [], {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Created wrong args requestId");
		assert.equal(l.data[1],payee,"Event Created wrong args payee");
		assert.equal(l.data[2],payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][2],0,"Event LogTestCreateRequest wrong args params");
		var l = getEventFromReceipt(r.receipt.logs[2], fakeExtention2.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][3],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][4],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][5],0,"Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],fakeExtention1.address,"new request wrong data : extension1");
		assert.equal(e[1],fakeExtention2.address,"new request wrong data : extension2");
		assert.equal(e[2],0,"new request wrong data : extension3");
	});


	it("new request with 3 trustable extensions without parameters", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address, fakeExtention2.address, fakeExtention3.address], [], {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Created wrong args requestId");
		assert.equal(l.data[1],payee,"Event Created wrong args payee");
		assert.equal(l.data[2],payer,"Event Created wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][2],0,"Event LogTestCreateRequest wrong args params");

		var l = getEventFromReceipt(r.receipt.logs[2], fakeExtention2.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][3],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][4],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][5],0,"Event LogTestCreateRequest wrong args params");

		var l = getEventFromReceipt(r.receipt.logs[3], fakeExtention3.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][6],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][7],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][8],0,"Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],fakeExtention1.address,"new request wrong data : extension1");
		assert.equal(e[1],fakeExtention2.address,"new request wrong data : extension2");
		assert.equal(e[2],fakeExtention3.address,"new request wrong data : extension3");
	});


	it("new request with 1 trustable extension with parameters", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address], [otherguy,payee,123456789], {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],payee,"Event Payment wrong args payee");
		assert.equal(l.data[2],payer,"Event Payment wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0],otherguy+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1],payee+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][2],"0x75bcd15000000000000000000000000000000000000000000000000000000000","Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],fakeExtention1.address,"new request wrong data : extension1");
		assert.equal(e[1],0,"new request wrong data : extension2");
		assert.equal(e[2],0,"new request wrong data : extension3");
	});

	it("new request with 2 trustable extensions with parameters", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address,fakeExtention2.address], [otherguy,payee,123456789,9999999999,otherguy], {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],payee,"Event Payment wrong args payee");
		assert.equal(l.data[2],payer,"Event Payment wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0],otherguy+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1],payee+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(parseInt(l.data[2][2]),"0x75bcd15000000000000000000000000000000000000000000000000000000000","Event LogTestCreateRequest wrong args params");

		var l = getEventFromReceipt(r.receipt.logs[2], fakeExtention2.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][3],'0x2540be3ff0000000000000000000000000000000000000000000000000000000',"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][4],otherguy+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][5],0,"Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],fakeExtention1.address,"new request wrong data : extension1");
		assert.equal(e[1],fakeExtention2.address,"new request wrong data : extension2");
		assert.equal(e[2],0,"new request wrong data : extension3");
	});


	it("new request with 3 trustable extensions with parameters", async function () {
		var r = await requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address,fakeExtention2.address,fakeExtention3.address], [otherguy,payee,123456789,9999999999,otherguy,0,"chopchop"], {from:payee});

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"Created","Event Created is missing after createRequest()");
		assert.equal(l.data[0],1,"Event Payment wrong args requestId");
		assert.equal(l.data[1],payee,"Event Payment wrong args payee");
		assert.equal(l.data[2],payer,"Event Payment wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], fakeExtention1.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],1,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][0],otherguy+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][1],payee+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][2],"0x75bcd15000000000000000000000000000000000000000000000000000000000","Event LogTestCreateRequest wrong args params");

		var l = getEventFromReceipt(r.receipt.logs[2], fakeExtention2.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],2,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][3],'0x2540be3ff0000000000000000000000000000000000000000000000000000000',"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][4],otherguy+"000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][5],0,"Event LogTestCreateRequest wrong args params");

		var l = getEventFromReceipt(r.receipt.logs[3], fakeExtention3.abi);
		assert.equal(l.name,"LogTestCreateRequest","Event LogTestCreateRequest is missing from extension after createRequest()");
		assert.equal(l.data[0],1,"Event LogTestCreateRequest wrong args requestId");
		assert.equal(l.data[1],3,"Event LogTestCreateRequest wrong args ID");
		assert.equal(l.data[2][6],"0x63686f7063686f70000000000000000000000000000000000000000000000000","Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][7],0,"Event LogTestCreateRequest wrong args params");
		assert.equal(l.data[2][8],0,"Event LogTestCreateRequest wrong args params");

		var r = await requestCore.requests.call(1);
		assert.equal(r[0],payee,"request wrong data : creator");
		assert.equal(r[1],payee,"request wrong data : payee");
		assert.equal(r[2],payer,"request wrong data : payer");
		assert.equal(r[3],arbitraryAmount,"request wrong data : amountExpected");
		assert.equal(r[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(r[5],0,"new request wrong data : amountPaid");
		assert.equal(r[6],0,"new request wrong data : amountAdditional");
		assert.equal(r[7],0,"new request wrong data : amountSubtract");
		assert.equal(r[8],0,"new request wrong data : state");

		var e = await requestCore.getExtensions.call(1);
		assert.equal(e[0],fakeExtention1.address,"new request wrong data : extension1");
		assert.equal(e[1],fakeExtention2.address,"new request wrong data : extension2");
		assert.equal(e[2],fakeExtention3.address,"new request wrong data : extension3");
	});
	it("new request with 1 non trustable extension impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention4Untrusted], [otherguy,payee,123456789], {from:payee}));
	});
	it("new request with 1 non trustable extension and 2 trusted impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address,fakeExtention4Untrusted,fakeExtention2.address], [], {from:payee}));
	});
	it("2 same extensions impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address,fakeExtention1.address], [], {from:payee}));
	});
	it("3 same extension impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address,fakeExtention1.address,fakeExtention1.address], [], {from:payee}));
	});
	it("1 extension + 2 same extension impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [fakeExtention1.address,fakeExtention2.address,fakeExtention1.address], [], {from:payee}));
	});

	it("Extensions [0,notTrusted] impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [0,fakeExtention4Untrusted], [], {from:payee}));
	});
	it("Extensions [0,0,notTrusted] impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [0,0,fakeExtention4Untrusted], [], {from:payee}));
	});
	it("Extensions [0,trusted,0] impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [0,fakeExtention1.address,0], [], {from:payee}));
	});
	it("Extensions [0,0,trusted] impossible", async function () {
		var r = await expectThrow(requestEthereum.createRequest(payee, payer, arbitraryAmount, [0,0,fakeExtention1.address], [], {from:payee}));
	});
});

