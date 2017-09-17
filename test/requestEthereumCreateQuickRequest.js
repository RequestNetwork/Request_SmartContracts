var ethUtil = require("ethereumjs-util");

// var ethABI = require("ethereumjs-abi");
// waiting for Solidity pack Array support (vrolland did a pull request)
var ethABI = require("../lib/ethereumjs-abi-perso.js"); 

const BN = require('bn.js')

var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");

// contract for test
var TestRequestSynchroneInterfaceContinue = artifacts.require("./TestRequestSynchroneInterfaceContinue.sol");

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

var hashRequest = function(contract, payee, payer, arbitraryAmount, extensions, extParams) {
	const requestParts = [
        {value: contract, type: "address"},
        {value: payee, type: "address"},
        {value: payer, type: "address"},
        {value: arbitraryAmount, type: "uint256"},
        {value: extensions, type: "address[3]"},
        {value: extParams, type: "bytes32[9]"},
    ];
    var types = [];
    var values = [];
    requestParts.forEach(function(o,i) {
    	types.push(o.type);
    	values.push(o.value);
    });
    return ethABI.soliditySHA3(types, values);
}

var signHashRequest = function(hash,privateKey) {
	return ethUtil.ecsign(ethUtil.hashPersonalMessage(hash), privateKey);
}



contract('RequestEthereum',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var privateKeyOtherGuy = "1ba414a85acdd19339dacd7febb40893458433bee01201b7ae8ca3d6f4e90994";
	var privateKeyPayer = "b383a09e0c750bcbfe094b9e17ee31c6a9bb4f2fcdc821d97a34cf3e5b7f5429";
	var privateKeyPayee = "5f1859eee362d44b90d4f3cdd14a8775f682e08d34ff7cdca7e903d7ee956b6a";
	// var creator = accounts[5];
	var fakeExtention1;
	var fakeExtention2;
	var fakeExtention3;
	var fakeExtention4Untrusted = accounts[9];

	var requestCore;
	var requestEthereum;

	var arbitraryAmount = 100000000;
	var arbitraryAmount10percent = 10000000;

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

	it("new quick request more than amountExpected (with tips that make the new quick requestment under expected) OK", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													arbitraryAmount10percent, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:arbitraryAmount+1});

		assert.equal(r.receipt.logs.length,4,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestCreated","Event LogRequestCreated is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestCreated wrong args requestId");
		assert.equal(l.data[1],payee,"Event LogRequestCreated wrong args payee");
		assert.equal(l.data[2],payer,"Event LogRequestCreated wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestAccepted","Event LogRequestAccepted is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestAccepted wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestAddAdditional","Event LogRequestAddAdditional is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestAddAdditional wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestAddAdditional wrong args amount");

		var l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestPayment","Event LogRequestPayment is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount+1,"Event LogRequestPayment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payer,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount+1,"new request wrong data : amountPaid");
		assert.equal(newReq[6],arbitraryAmount10percent,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount+1,"new request wrong data : amount to withdraw payee");
	});

	it("new quick request pay more than amountExpected (without tips) Impossible", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													1, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:arbitraryAmount+2}));
	});

	it("new quick request more than amountExpected (with tips but still too much) Impossible", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													1, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:arbitraryAmount+2}));
	});

	it("new quick request pay more than amountExpected (without tips) Impossible", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													0, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:arbitraryAmount+1}));
	});

	it("new quick request with more tips than msg.value Impossible", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													arbitraryAmount10percent, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:0}));
	});

	it("new quick request with tips OK", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													arbitraryAmount10percent, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:arbitraryAmount});

		assert.equal(r.receipt.logs.length,4,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestCreated","Event LogRequestCreated is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestCreated wrong args requestId");
		assert.equal(l.data[1],payee,"Event LogRequestCreated wrong args payee");
		assert.equal(l.data[2],payer,"Event LogRequestCreated wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestAccepted","Event LogRequestAccepted is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestAccepted wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestAddAdditional","Event LogRequestAddAdditional is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestAddAdditional wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount10percent,"Event LogRequestAddAdditional wrong args amount");

		var l = getEventFromReceipt(r.receipt.logs[3], requestCore.abi);
		assert.equal(l.name,"LogRequestPayment","Event LogRequestPayment is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event LogRequestPayment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payer,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],requestEthereum.address,"new request wrong data : subContract");
		assert.equal(newReq[5],arbitraryAmount,"new request wrong data : amountPaid");
		assert.equal(newReq[6],arbitraryAmount10percent,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],1,"new request wrong data : state");

		var r = await requestEthereum.ethToWithdraw.call(payee);
		assert.equal(r,arbitraryAmount,"new request wrong data : amount to withdraw payee");
	});

	it("new quick request _amountExpected == 0 impossible", async function () {
		await requestCore.adminDeprecate({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, 0, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, 0, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:0}));
	});

	it("new quick request payee==payer impossible", async function () {
		await requestCore.adminDeprecate({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payee, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payee, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request payee==0 impossible", async function () {
		await requestCore.adminDeprecate({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, 0, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(0, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request payer==0 impossible", async function () {
		await requestCore.adminDeprecate({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, 0, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, 0, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request msg.sender==payee impossible", async function () {
		await requestCore.adminDeprecate({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payee, value:arbitraryAmount}));
	});

	it("new quick request msg.sender==otherguy impossible", async function () {
		await requestCore.adminDeprecate({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:otherguy, value:arbitraryAmount}));
	});

	it("impossible to createQuickquick request if Core Deprecated", async function () {
		await requestCore.adminDeprecate({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

	it("impossible to createQuickquick request if Core Paused", async function () {
		await requestCore.adminPause({from:admin});

		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request msg.value > 0 OK", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													0, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:arbitraryAmount});

		assert.equal(r.receipt.logs.length,3,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestCreated","Event LogRequestCreated is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestCreated wrong args requestId");
		assert.equal(l.data[1],payee,"Event LogRequestCreated wrong args payee");
		assert.equal(l.data[2],payer,"Event LogRequestCreated wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestAccepted","Event LogRequestAccepted is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestAccepted wrong args requestId");

		var l = getEventFromReceipt(r.receipt.logs[2], requestCore.abi);
		assert.equal(l.name,"LogRequestPayment","Event LogRequestPayment is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestPayment wrong args requestId");
		assert.equal(l.data[1],arbitraryAmount,"Event LogRequestPayment wrong args amountPaid");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payer,"new request wrong data : creator");
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

	it("new quick request signed by payee and data match signature OK", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];

		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
													listExtensions,
													listParamsExtensions, 
													0, 
													sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
													{from:payer, value:0});

		assert.equal(r.receipt.logs.length,2,"Wrong number of events");

		var l = getEventFromReceipt(r.receipt.logs[0], requestCore.abi);
		assert.equal(l.name,"LogRequestCreated","Event LogRequestCreated is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestCreated wrong args requestId");
		assert.equal(l.data[1],payee,"Event LogRequestCreated wrong args payee");
		assert.equal(l.data[2],payer,"Event LogRequestCreated wrong args payer");

		var l = getEventFromReceipt(r.receipt.logs[1], requestCore.abi);
		assert.equal(l.name,"LogRequestAccepted","Event LogRequestAccepted is missing after createQuickRequest()");
		assert.equal(l.data[0],1,"Event LogRequestAccepted wrong args requestId");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],payer,"new request wrong data : creator");
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

	it("new quick request signed by payer Impossible", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayer, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request signed by otherguy Impossible", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyOtherGuy, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

	it("new quick request signature doest match data impossible", async function () {
		var listExtensions = [];
		var listParamsExtensions = [];
		var hash = hashRequest(requestEthereum.address, payee, payer, arbitraryAmount, listExtensions, listParamsExtensions);
		
		var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
		var sig = signHashRequest(hash,ecprivkey);

		var r = await expectThrow(requestEthereum.createQuickRequest(otherguy, payer, arbitraryAmount, 
									listExtensions,
									listParamsExtensions, 
									0, 
									sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
									{from:payer, value:arbitraryAmount}));
	});

});

