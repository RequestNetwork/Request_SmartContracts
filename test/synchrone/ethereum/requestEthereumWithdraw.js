var config = require("../../config.js"); var utils = require("../../utils.js");
if(!config['all'] && !config[__filename.split('\\').slice(-1)[0]]) {
	return;
}
var RequestCore = artifacts.require("./core/RequestCore.sol");
var RequestEthereum = artifacts.require("./synchrone/RequestEthereum.sol");
// contract for test
var TestRequestReentrance = artifacts.require("./test/synchrone/TestRequestReentrance.sol");
var BigNumber = require('bignumber.js');

contract('RequestEthereum Withdraw',  function(accounts) {
	var admin = accounts[0];
	var hacker = accounts[1];
	var fakeContract = accounts[2];
	var payer = accounts[3];
	var payee = accounts[4];

	var requestCore;
	var requestEthereum;
	var newRequest;

	var arbitraryAmount = 1000;
	var arbitraryAmount10percent = 100;
	var testRequestReentrance;

    beforeEach(async () => {
		requestCore = await RequestCore.new({from:admin});
    	requestEthereum = await RequestEthereum.new(requestCore.address,{from:admin});

		await requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});

		var newRequest = await requestEthereum.createRequestAsPayee(payer, arbitraryAmount, 0, [], {from:payee});
		await requestEthereum.accept(utils.getHashRequest(1), {from:payer});
    });

	// ##################################################################################################
	// ### withdraw test unit #############################################################################
	// ##################################################################################################
	it("withdraw when amount[msg.sender] = X, msg.sender get X and amount[msg.sender] = 0", async function () {
		var balancePayee = Math.floor(await web3.eth.getBalance(payee) / arbitraryAmount);
		await requestEthereum.pay(utils.getHashRequest(1), 0, {from:payer,value:arbitraryAmount});
		assert.equal(await requestEthereum.ethToWithdraw.call(payee),arbitraryAmount,"Balance of payee must be arbitraryAmount" );
		await requestEthereum.withdraw({from:payee});
		assert.equal(await requestEthereum.ethToWithdraw.call(payee),0,"Balance of payee must be 0" );
	});

	it("challenge reentrance 2 rounds", async function () {
		await requestEthereum.pay(utils.getHashRequest(1), 0, {from:payer,value:arbitraryAmount});
		
		testRequestReentrance = await TestRequestReentrance.new(requestEthereum.address, 2,{from:hacker});
		var r = await testRequestReentrance.init(hacker,{from:hacker});

		assert.equal(r.logs[0].event,"Log","Event Log is missing");
		assert.equal(r.logs[0].args.id,utils.getHashRequest(2),"Event Payment wrong args id");

		await requestEthereum.accept(r.logs[0].args.id, {from:hacker});
		await requestEthereum.pay(r.logs[0].args.id, 0, {from:hacker,value:arbitraryAmount10percent});

		var r = await utils.expectThrow(testRequestReentrance.start({from:hacker}));
		assert.equal(await web3.eth.getBalance(testRequestReentrance.address), 0, 'Contract hacking balance must remain 0');
	});


});

