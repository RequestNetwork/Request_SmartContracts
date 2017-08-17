var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestExtensionEscrow = artifacts.require("./RequestExtensionEscrow.sol");
var RequestExtensionTax = artifacts.require("./RequestExtensionTax.sol");

var SolidityCoder = require("web3/lib/solidity/coder.js");


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


contract('RequestCore', function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];


	// Creation and event
	it("Creation Core, Resume, Pause, Deprecate", async function () {
		var requestCore = await RequestCore.new();
		assert.equal(await requestCore.systemState.call(),"0","Core must be Paused at the begging");

		var r = await requestCore.adminResume({from:admin});
		assert.equal(r.logs[0].event,"LogSystemResumed","Event LogSystemResumed is missing after adminResume()");
		assert.equal(await requestCore.systemState.call(),"1","Core must be Resumed after adminResume()");

		var r = await requestCore.adminPause({from:admin});
		assert.equal(r.logs[0].event,"LogSystemPaused","Event LogSystemPaused is missing after adminPause()");
		assert.equal(await requestCore.systemState.call(),"0","Core must be Paused after adminPause()");

		var r = await requestCore.adminDeprecate({from:admin});
		assert.equal(r.logs[0].event,"LogSystemDeprecated","Event LogSystemDeprecated is missing after adminDeprecate()");
		assert.equal(await requestCore.systemState.call(),"2","Core must be Deprecated after adminDeprecate()");
	});


	// right to resume, pause, deprecate
	it("Core cannot be resumed by someone else than admin", async function() {
		var requestCore = await RequestCore.new();
		await expectThrow(requestCore.adminResume({from:otherguy}));
		assert.equal(await requestCore.systemState.call(),"0","Core must remain Paused");
	});
	it("Core cannot be paused by someone else than admin", async function() {
		var requestCore = await RequestCore.new();
		var r = await requestCore.adminResume({from:admin});
		await expectThrow(requestCore.adminPause({from:otherguy}));
		assert.equal(await requestCore.systemState.call(),"1","Core must remain Resumed");
	});
	it("Core cannot be Deprecate by someone else than admin", async function() {
		var requestCore = await RequestCore.new();
		await expectThrow(requestCore.adminDeprecate({from:otherguy}));
		assert.equal(await requestCore.systemState.call(),"0","Core must remain Paused");
	});

	// adminAddTrustedSubContract adminRemoveTrustedSubContract
	it("adminAddTrustedSubContract add a new contract as trusted", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});

		var r = await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"LogSystemNewTrustedContracted","Event LogSystemNewTrustedContracted is missing after adminAddTrustedSubContract()");
		assert.equal(r.logs[0].args.newContract,requestEthereum.address,"Event LogSystemNewTrustedContracted wrong args");
		assert.equal(await requestCore.getStatusContract.call(requestEthereum.address),"1","New contract should be added");
	});
	it("adminRemoveTrustedSubContract remove trusted contract", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		var r = await requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"LogSystemRemoveTrustedContracted","Event LogSystemRemoveTrustedContracted is missing after adminAddTrustedSubContract()");
		assert.equal(r.logs[0].args.oldContract,requestEthereum.address,"Event LogSystemRemoveTrustedContracted wrong args");
		assert.equal(await requestCore.getStatusContract.call(requestEthereum.address),"0","New contract should be added");
	});

	// adminAddTrustedExtension adminRemoveTrustedSubContract
	it("adminAddTrustedExtension add a new extension as trusted", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});

		var r = await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"LogSystemNewExtension","Event LogSystemNewExtension is missing after adminAddTrustedExtension()");
		assert.equal(r.logs[0].args.newExtension,requestEthereum.address,"Event LogSystemNewExtension wrong args");
		assert.equal(await requestCore.getStatusExtension.call(requestEthereum.address),"1","New extension should be added");
	});
	it("adminRemoveTrustedSubContract remove trusted contract", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});

		var r = await requestCore.adminRemoveExtension(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"LogSystemRemoveExtension","Event LogSystemRemoveExtension is missing after adminRemoveExtension()");
		assert.equal(r.logs[0].args.oldExtension,requestEthereum.address,"Event LogSystemRemoveExtension wrong args");
		assert.equal(await requestCore.getStatusExtension.call(requestEthereum.address),"0","New extension should be added");
	});



	// right on adminAddTrustedSubContract adminRemoveTrustedSubContract adminAddTrustedExtension adminRemoveExtension
	it("adminAddTrustedSubContract can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await expectThrow(requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:otherguy}));
	});
	it("adminAddTrustedExtension can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await expectThrow(requestCore.adminAddTrustedExtension(requestEthereum.address, {from:otherguy}));
	});
	it("adminRemoveTrustedSubContract can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		await expectThrow(requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:otherguy}));
	});
	it("adminRemoveExtension can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});
		await expectThrow(requestCore.adminRemoveExtension(requestEthereum.address, {from:otherguy}));
	});


	// cannot adminAddTrustedSubContract adminAddTrustedExtension adminRemoveTrustedSubContract adminRemoveExtension if core paused
	it("adminAddTrustedSubContract cannot be done if core paused", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await expectThrow(requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin}));
	});
	it("adminAddTrustedExtension cannot be done if core paused", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await expectThrow(requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin}));
	});
	it("adminRemoveTrustedSubContract cannot be done if core paused", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		await requestCore.adminPause({from:admin});
		await expectThrow(requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:admin}));
	});
	it("adminRemoveExtension cannot be done if core paused", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});
		await requestCore.adminPause({from:admin});
		await expectThrow(requestCore.adminRemoveExtension(requestEthereum.address, {from:admin}));
	});


	// cannot adminAddTrustedSubContract adminAddTrustedExtension adminRemoveTrustedSubContract adminRemoveExtension if core deprecated
	it("adminAddTrustedSubContract cannot be done if core deprecated", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin}));
	});
	it("adminAddTrustedExtension cannot be done if core deprecated", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin}));
	});
	it("adminRemoveTrustedSubContract cannot be done if core deprecated", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:admin}));
	});
	it("adminRemoveExtension cannot be done if core deprecated", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();
		await requestCore.adminResume({from:admin});
		await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});
		await requestCore.adminDeprecate({from:admin});
		await expectThrow(requestCore.adminRemoveExtension(requestEthereum.address, {from:admin}));
	});

});


