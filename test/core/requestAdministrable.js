var config = require("../config.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}

var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");

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


contract('RequestCore Administrative part', function(accounts) {
	var admin = accounts[0];
	var otherguy = accounts[1];


	// Creation and event
	it("Creation Core, pause, unpause", async function () {
		var requestCore = await RequestCore.new();
		assert.equal(await requestCore.paused.call(),false,"Core must not be paused at the begging");

		var r = await requestCore.pause({from:admin});
		assert.equal(r.logs[0].event,"Pause","Event Pause is missing after pause()");
		assert.equal(await requestCore.paused.call(),true,"Core must be Paused after pause()");

		var r = await requestCore.unpause({from:admin});
		assert.equal(r.logs[0].event,"Unpause","Event Unpause is missing after unpause()");
		assert.equal(await requestCore.paused.call(),false,"Core must not be paused after unpause()");
	});

	// right to resume, pause
	it("Core cannot be pause by someone else than admin", async function() {
		var requestCore = await RequestCore.new();
		await expectThrow(requestCore.pause({from:otherguy}));
		assert.equal(await requestCore.paused.call(),false,"Core must remain not Paused");
	});
	it("Core cannot be unpause by someone else than admin", async function() {
		var requestCore = await RequestCore.new();
		var r = await requestCore.pause({from:admin});
		await expectThrow(requestCore.unpause({from:otherguy}));
		assert.equal(await requestCore.paused.call(),true,"Core must remain Paused");
	});

	// adminAddTrustedSubContract adminRemoveTrustedSubContract
	it("adminAddTrustedSubContract add a new contract as trusted", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		var r = await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"NewTrustedContract","Event NewTrustedContract is missing after adminAddTrustedSubContract()");
		assert.equal(r.logs[0].args.newContract,requestEthereum.address,"Event NewTrustedContract wrong args");
		assert.equal(await requestCore.getStatusContract.call(requestEthereum.address),"1","New contract should be added");
	});
	it("adminRemoveTrustedSubContract remove trusted contract", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		var r = await requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"RemoveTrustedContract","Event RemoveTrustedContract is missing after adminAddTrustedSubContract()");
		assert.equal(r.logs[0].args.oldContract,requestEthereum.address,"Event RemoveTrustedContract wrong args");
		assert.equal(await requestCore.getStatusContract.call(requestEthereum.address),"0","New contract should be added");
	});

	// adminAddTrustedExtension adminRemoveTrustedSubContract
	it("adminAddTrustedExtension add a new extension as trusted", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		var r = await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"NewTrustedExtension","Event NewTrustedExtension is missing after adminAddTrustedExtension()");
		assert.equal(r.logs[0].args.newExtension,requestEthereum.address,"Event NewTrustedExtension wrong args");
		assert.equal(await requestCore.getStatusExtension.call(requestEthereum.address),"1","New extension should be added");
	});
	it("adminRemoveTrustedSubContract remove trusted contract", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});

		var r = await requestCore.adminRemoveExtension(requestEthereum.address, {from:admin});
		assert.equal(r.logs[0].event,"RemoveTrustedExtension","Event RemoveTrustedExtension is missing after adminRemoveExtension()");
		assert.equal(r.logs[0].args.oldExtension,requestEthereum.address,"Event RemoveTrustedExtension wrong args");
		assert.equal(await requestCore.getStatusExtension.call(requestEthereum.address),"0","New extension should be added");
	});



	// right on adminAddTrustedSubContract adminRemoveTrustedSubContract adminAddTrustedExtension adminRemoveExtension
	it("adminAddTrustedSubContract can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await expectThrow(requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:otherguy}));
	});
	it("adminAddTrustedExtension can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await expectThrow(requestCore.adminAddTrustedExtension(requestEthereum.address, {from:otherguy}));
	});
	it("adminRemoveTrustedSubContract can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		await expectThrow(requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:otherguy}));
	});
	it("adminRemoveExtension can be done only by admin", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});
		await expectThrow(requestCore.adminRemoveExtension(requestEthereum.address, {from:otherguy}));
	});

});


