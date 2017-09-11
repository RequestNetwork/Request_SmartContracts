var ethUtil = require("ethereumjs-util");
// var ethABI = require("ethereumjs-abi");
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


var getQuickRequestHashHex = function(contract, payee, payer, arbitraryAmount /*, extensions, extParams1, extParams2, extParams3*/) {
	const requestParts = [
        {value: contract, type: "address"},
        {value: payee, type: "address"},
        {value: payer, type: "address"},
        {value: arbitraryAmount, type: "uint256"},
        // {value: extensions, type: "address[3]"},
    ];

    // requestParts.push( {value: extensions[0], type: "address"});
    // requestParts.push( {value: extensions[1], type: "address"});
    // requestParts.push( {value: extensions[2], type: "address"});

    // extParams1.forEach(function(p){
    // 	requestParts.push( {value: p, type: "bytes32"});
    // });
    // extParams2.forEach(function(p){
    // 	requestParts.push( {value: p, type: "bytes32"});
    // });
    // extParams3.forEach(function(p){
    // 	requestParts.push( {value: p, type: "bytes32"});
    // });


    const types = _.map(requestParts, o => o.type);
    const values = _.map(requestParts, o => o.value);
    const hashBuff = ethABI.soliditySHA256(types, values);
    const hashHex = ethUtil.bufferToHex(hashBuff);
    return {hashHex:hashHex, hashBuff:hashBuff};
}


contract('RequestEthereum',  function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var privateKeyPayee = "5f1859eee362d44b90d4f3cdd14a8775f682e08d34ff7cdca7e903d7ee956b6a";
	// var creator = accounts[5];
	var fakeExtention1 = accounts[6];
	var fakeExtention2 = accounts[7];
	var fakeExtention3 = accounts[8];
	var fakeExtention4Untrusted = accounts[9];

	var requestCore;
	var requestEthereum;

	// var arbitraryAmount = 0;
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


	it("new quick request msg.sender==payer without extensions OK", async function () {

// 		console.log("####################################################")
// 		console.log("####################################################")
// 		console.log("####################################################")

// console.log("getQuickRequestHashHex(payee, payer, arbitraryAmount, [payee,payee,payee], [], [], [])");
// console.log(getQuickRequestHashHex(payee, payer, arbitraryAmount, [payee,payee,payee], [], [], []));


// 		console.log("####################################################")
// 		console.log("####################################################")
// 		console.log("####################################################")	
		var hash = getQuickRequestHashHex(requestEthereum.address, payee, payer, arbitraryAmount/*, [], [], [], []*/	).hashBuff;
// 		// var hash =  ethUtil.sha256(ethUtil.intToHex(arbitraryAmount));

      	var ecprivkey = Buffer.from(privateKeyPayee, 'hex');
      	var sig = ethUtil.ecsign(hash, ecprivkey);

// 		var pubkey = ethUtil.ecrecover(hash, sig.v, sig.r, sig.s)
// 		console.log("ethUtil.pubToAddress(ethUtil.privateToPublic(ecprivkey))")
// 		console.log(ethUtil.bufferToHex(ethUtil.pubToAddress(pubkey)) == payee)


		var r = await requestEthereum.createQuickRequest(payee, payer, arbitraryAmount, 
															// [], [], [], [], 
															0, sig.v, ethUtil.bufferToHex(sig.r), ethUtil.bufferToHex(sig.s),
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
		console.log(newReq)
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

});

