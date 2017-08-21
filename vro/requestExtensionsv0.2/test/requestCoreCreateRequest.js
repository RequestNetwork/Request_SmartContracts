return;

var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestExtensionEscrow = artifacts.require("./RequestExtensionEscrow.sol");
var RequestExtensionTax = artifacts.require("./RequestExtensionTax.sol");

var SolidityCoder = require("web3/lib/solidity/coder.js");
var BigNumber = require('bignumber.js');

var expectThrow = async function(promise) {
  try {
    await promise;
  } catch (error) {
    // TODO: Check jump destination to destinguish between a throw
    //       and an actual invalid jump.
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    const invalidJump = error.message.search('invalid JUMP') >= 0;
    // TODO: When we contract A calls contract B, and B throws, instead
    //       of an 'invalid jump', we get an 'out of gas' error. How do
    //       we distinguish this from an actual out of gas event? (The
    //       testrpc log actually show an 'invalid jump' event.)
    const outOfGas = error.message.search('out of gas') >= 0;
    assert(
      invalidOpcode || invalidJump || outOfGas,
      "Expected throw, got '" + error + "' instead",
    );
    return;
  }
  assert.fail('Expected throw not received');
};


contract('RequestCore Create Request', function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];
	var creator = accounts[5];
	var fakeExtention1 = accounts[6];
	var fakeExtention2 = accounts[7];
	var fakeExtention3 = accounts[8];
	var fakeExtention4 = accounts[9];

	var arbitraryAmount = 100000000;


	// requestId start at 1 when Core is created
	it("Creation Core, requestId start at 1", async function () {
		var requestCore = await RequestCore.new();
		assert.equal(await requestCore.numRequests.call(),"1","RequestId start by 1");
	});

	// new request from non trustable sender (contract trusted) impossible
	it("request from non trustable sender (contract trusted) impossible", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [], {from:fakeContract}));
	});

	// impossible to createRequest if Core Paused
	it("impossible to createRequest if Core Paused", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminPause({from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [], {from:fakeContract}));
	});

	// impossible to createRequest if Core Deprecated
	it("impossible to createRequest if Core Deprecated", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminDeprecate({from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [], {from:fakeContract}));
	});

	// new request _creator==0 impossible
	// new request payee==0 impossible
	// new request payer==0 impossible
	// new request payee==payer impossible
	it("Actors not null and payee!=payer", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await expectThrow(requestCore.createRequest(0, payee, payer, arbitraryAmount, [], {from:fakeContract}));
		await expectThrow(requestCore.createRequest(creator, 0, payer, arbitraryAmount, [], {from:fakeContract}));
		await expectThrow(requestCore.createRequest(creator, payee, 0, arbitraryAmount, [], {from:fakeContract}));
		await expectThrow(requestCore.createRequest(creator, payee, payee, arbitraryAmount, [], {from:fakeContract}));
	});


	// new request _amountExpected == 0 impossible
	// new request _amountExpected < 0 impossible TODO /!\
	// new request _amountExpected > 2^256 impossible
	it("amountExpected more than zero and not more than 2^256", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, 0, [], {from:fakeContract}));
		// problem here : how to test it ? TODO /!\
		// await expectThrow(requestCore.createRequest(payee, payee, payer, -1, [], {from:fakeContract}));
		await expectThrow(requestCore.createRequest(creator, payee, payer, new BigNumber(2).pow(256), [], {from:fakeContract}));
	});


	// new request without extensions
	it("new request without extensions", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		var r = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, [], {from:fakeContract});

		assert.equal(r.logs[0].event,"LogRequestCreated","Event LogRequestCreated is missing after createRequest()");
		assert.equal(r.logs[0].args.requestId,"1","Event LogRequestCreated wrong args requestId");
		assert.equal(r.logs[0].args.payee,payee,"Event LogRequestCreated wrong args payee");
		assert.equal(r.logs[0].args.payer,payer,"Event LogRequestCreated wrong args payer");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],creator,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],fakeContract,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],0,"new request wrong data : state");

		var newReqExtension = await requestCore.getExtensions.call(1);
		assert.equal(newReqExtension[0],0,"new request wrong data : Extension[0]");
		assert.equal(newReqExtension[1],0,"new request wrong data : Extension[1]");
		assert.equal(newReqExtension[2],0,"new request wrong data : Extension[2]");
	});

	// new request with 1 extension trusted
	it("new request with 1 extension valid", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});

		var r = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1], {from:fakeContract});

		assert.equal(r.logs[0].event,"LogRequestCreated","Event LogRequestCreated is missing after createRequest()");
		assert.equal(r.logs[0].args.requestId,"1","Event LogRequestCreated wrong args requestId");
		assert.equal(r.logs[0].args.payee,payee,"Event LogRequestCreated wrong args payee");
		assert.equal(r.logs[0].args.payer,payer,"Event LogRequestCreated wrong args payer");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],creator,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],fakeContract,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],0,"new request wrong data : state");


		var newReqExtension = await requestCore.getExtensions.call(1);
		assert.equal(newReqExtension[0],fakeExtention1,"new request wrong data : Extension[0]");
	});

	// new request with 3 extensions trusted
	it("new request with 2 extensions valid", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention2, {from:admin});

		var r = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1,fakeExtention2], {from:fakeContract});

		assert.equal(r.logs[0].event,"LogRequestCreated","Event LogRequestCreated is missing after createRequest()");
		assert.equal(r.logs[0].args.requestId,"1","Event LogRequestCreated wrong args requestId");
		assert.equal(r.logs[0].args.payee,payee,"Event LogRequestCreated wrong args payee");
		assert.equal(r.logs[0].args.payer,payer,"Event LogRequestCreated wrong args payer");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],creator,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],fakeContract,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],0,"new request wrong data : state");

		var newReqExtension = await requestCore.getExtensions.call(1);
		assert.equal(newReqExtension[0],fakeExtention1,"new request wrong data : Extension[0]");
		assert.equal(newReqExtension[1],fakeExtention2,"new request wrong data : Extension[1]");
	});

	// new request with 3 extensions trusted
	it("new request with 3 extensions valid", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention2, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention3, {from:admin});

		var r = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1,fakeExtention2,fakeExtention3], {from:fakeContract});

		assert.equal(r.logs[0].event,"LogRequestCreated","Event LogRequestCreated is missing after createRequest()");
		assert.equal(r.logs[0].args.requestId,"1","Event LogRequestCreated wrong args requestId");
		assert.equal(r.logs[0].args.payee,payee,"Event LogRequestCreated wrong args payee");
		assert.equal(r.logs[0].args.payer,payer,"Event LogRequestCreated wrong args payer");

		var newReq = await requestCore.requests.call(1);
		assert.equal(newReq[0],creator,"new request wrong data : creator");
		assert.equal(newReq[1],payee,"new request wrong data : payee");
		assert.equal(newReq[2],payer,"new request wrong data : payer");
		assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
		assert.equal(newReq[4],fakeContract,"new request wrong data : subContract");
		assert.equal(newReq[5],0,"new request wrong data : amountPaid");
		assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
		assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
		assert.equal(newReq[8],0,"new request wrong data : state");


		var newReqExtension = await requestCore.getExtensions.call(1);
		assert.equal(newReqExtension[0],fakeExtention1,"new request wrong data : Extension[0]");
		assert.equal(newReqExtension[1],fakeExtention2,"new request wrong data : Extension[1]");
		assert.equal(newReqExtension[2],fakeExtention3,"new request wrong data : Extension[2]");
	});


	// new request with 1 extension not trusted
	it("new request with 1 extension not trusted", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1], {from:fakeContract}));
	});

	// new request with 1 extension not trusted
	it("new request with 2 trusted and 1 extension not trusted", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention2, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1,fakeExtention2,fakeExtention3], {from:fakeContract}));
	});

	// new request with 2 same extensions trusted
	it("new request with 2 same extensions trusted", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1,fakeExtention1], {from:fakeContract}));
	});

	// new request with 3 same extensions trusted
	it("new request with 3 same extensions trusted", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1,fakeExtention1,fakeExtention1], {from:fakeContract}));
	});

	// Extensions [0,0,notTrusted] impossible
	it("Extensions [0,0,notTrusted] impossible", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [0,0,fakeExtention1], {from:fakeContract}));
	});

	// Extensions [0,0,trusted] impossible
	it("Extensions [0,0,trusted] impossible", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [0,0,fakeExtention1], {from:fakeContract}));
	});

	// Extensions [0,trusted,0] impossible
	it("Extensions [0,trusted,0] impossible", async function () {
		var requestCore = await RequestCore.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});
		await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});

		await expectThrow(requestCore.createRequest(creator, payee, payer, arbitraryAmount, [0,fakeExtention1,0], {from:fakeContract}));
	});


	// TODO new request with 4 extensions trusted - not possible to test ? /!\
	// it("new request with 4 extensions valid", async function () {
	// 	var requestCore = await RequestCore.new();
	// 	await requestCore.adminResume({from:admin});
	// 	await requestCore.adminAddTrustedSubContract(fakeContract, {from:admin});

	// 	await requestCore.adminAddTrustedExtension(fakeExtention1, {from:admin});
	// 	await requestCore.adminAddTrustedExtension(fakeExtention2, {from:admin});
	// 	await requestCore.adminAddTrustedExtension(fakeExtention3, {from:admin});
	// 	await requestCore.adminAddTrustedExtension(fakeExtention4, {from:admin});

	// 	var r = await requestCore.createRequest(creator, payee, payer, arbitraryAmount, [fakeExtention1,fakeExtention2,fakeExtention3,fakeExtention4], {from:fakeContract});

	// 	assert.equal(r.logs[0].event,"LogRequestCreated","Event LogRequestCreated is missing after createRequest()");
	// 	assert.equal(r.logs[0].args.requestId,"1","Event LogRequestCreated wrong args requestId");
	// 	assert.equal(r.logs[0].args.payee,payee,"Event LogRequestCreated wrong args payee");
	// 	assert.equal(r.logs[0].args.payer,payer,"Event LogRequestCreated wrong args payer");

	// 	var newReq = await requestCore.requests.call(1);
	// 	assert.equal(newReq[0],creator,"new request wrong data : creator");
	// 	assert.equal(newReq[1],payee,"new request wrong data : payee");
	// 	assert.equal(newReq[2],payer,"new request wrong data : payer");
	// 	assert.equal(newReq[3],arbitraryAmount,"new request wrong data : amountExpected");
	// 	assert.equal(newReq[4],fakeContract,"new request wrong data : subContract");
	// 	assert.equal(newReq[5],0,"new request wrong data : amountPaid");
	// 	assert.equal(newReq[6],0,"new request wrong data : amountAdditional");
	// 	assert.equal(newReq[7],0,"new request wrong data : amountSubtract");
	// 	assert.equal(newReq[8],0,"new request wrong data : state");


	// 	var newReqExtension = await requestCore.getExtensions.call(1);
	// 	console.log('newReqExtension')
	// 	console.log(newReqExtension)
	// 	assert.equal(newReqExtension[0],fakeExtention1,"new request wrong data : Extension[0]");
	// 	assert.equal(newReqExtension[1],fakeExtention2,"new request wrong data : Extension[1]");
	// 	assert.equal(newReqExtension[2],fakeExtention3,"new request wrong data : Extension[2]");
	// });

});


