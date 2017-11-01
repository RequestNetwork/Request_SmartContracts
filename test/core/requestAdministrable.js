var config = require("../config.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
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

var Administrable = artifacts.require("./core/Administrable.sol");
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
		var ev = getEventFromReceipt(r.receipt.logs[0], Administrable.abi);
		assert.equal(ev.name,"Pause","Event Pause is missing after pause()");
		assert.equal(await requestCore.paused.call(),true,"Core must be Paused after pause()");

		var r = await requestCore.unpause({from:admin});
		var ev = getEventFromReceipt(r.receipt.logs[0], Administrable.abi);
		assert.equal(ev.name,"Unpause","Event Unpause is missing after unpause()");
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
		var ev = getEventFromReceipt(r.receipt.logs[0], Administrable.abi);
		assert.equal(ev.name,"NewTrustedContract","Event NewTrustedContract is missing after adminAddTrustedSubContract()");
		assert.equal(ev.data[0].toLowerCase(),requestEthereum.address,"Event NewTrustedContract wrong args");
		assert.equal(await requestCore.getStatusContract.call(requestEthereum.address),"1","New contract should be added");
	});
	it("adminRemoveTrustedSubContract remove trusted contract", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		var r = await requestCore.adminRemoveTrustedSubContract(requestEthereum.address, {from:admin});
		var ev = getEventFromReceipt(r.receipt.logs[0], Administrable.abi);
		assert.equal(ev.name,"RemoveTrustedContract","Event RemoveTrustedContract is missing after adminAddTrustedSubContract()");
		assert.equal(ev.data[0].toLowerCase(),requestEthereum.address,"Event RemoveTrustedContract wrong args");
		assert.equal(await requestCore.getStatusContract.call(requestEthereum.address),"0","New contract should be added");
	});

	// adminAddTrustedExtension adminRemoveTrustedSubContract
	it("adminAddTrustedExtension add a new extension as trusted", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		var r = await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});
		var ev = getEventFromReceipt(r.receipt.logs[0], Administrable.abi);
		assert.equal(ev.name,"NewTrustedExtension","Event NewTrustedExtension is missing after adminAddTrustedExtension()");
		assert.equal(ev.data[0].toLowerCase(),requestEthereum.address,"Event NewTrustedExtension wrong args");
		assert.equal(await requestCore.getStatusExtension.call(requestEthereum.address),"1","New extension should be added");
	});
	it("adminRemoveTrustedSubContract remove trusted contract", async function() {
		var requestCore = await RequestCore.new();
		var requestEthereum = await RequestEthereum.new();

		await requestCore.adminAddTrustedExtension(requestEthereum.address, {from:admin});

		var r = await requestCore.adminRemoveExtension(requestEthereum.address, {from:admin});
		var ev = getEventFromReceipt(r.receipt.logs[0], Administrable.abi);
		assert.equal(ev.name,"RemoveTrustedExtension","Event RemoveTrustedExtension is missing after adminRemoveExtension()");
		assert.equal(ev.data[0].toLowerCase(),requestEthereum.address,"Event RemoveTrustedExtension wrong args");
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


