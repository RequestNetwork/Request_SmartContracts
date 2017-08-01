var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestExtensionEscrow = artifacts.require("./RequestExtensionEscrow.sol");
var RequestExtensionTax = artifacts.require("./RequestExtensionTax.sol");


function addressToByte32str(str) {
	return str.indexOf('0x') == 0 ?  str.replace('0x','0x000000000000000000000000') : '0x000000000000000000000000'+str;
}

function integerToByte32str(int) {
	var hexa = int.toString(16);
	var str = '0x';
	var numberOfZero = 64-hexa.length;
	for(i=0;i<numberOfZero;i++) {
		str+='0';
	}
	str+=hexa;
	return str;
}


contract('RequestCore', function(accounts) {
	var admin = accounts[0];
	var seller1 = accounts[1];
	var buyer1 = accounts[2];
	var seller2 = accounts[3];
	var buyer2 = accounts[4];
	var random_guy = accounts[5];
  	var escrow1 = accounts[6];
  	var taxer1 = accounts[7];
	var amount1 = 1000000000000;
	var amount2 = 9999;


	// who can do what ----------------------------------------
	it("Escrow should work", function() {
		var requestCore;
		var requestExtensionEscrow;
		var requestExtensionTax;
		var requestEthereum;

		return RequestCore.deployed().then(function(coreInstance) {
			requestCore=coreInstance;

			var eventsrequestCore = requestCore.allEvents({fromBlock: 0, toBlock: 'latest'});
			eventsrequestCore.watch(function(error, result){
			   console.log('-----------------------------------------------')
			   if(error) { console.log('requestCore error'); console.log(error); }
			   console.log('eventsrequestCore')
			   console.log(result.event)
			   console.log(result.args)	
			   console.log('-----------------------------------------------')
			});


			return RequestExtensionEscrow.new(requestCore.address,{from:admin});
		}).then(function(extensionEscrowInstance) {
				requestExtensionEscrow = extensionEscrowInstance;

				var eventsrequestExtensionEscrow= requestExtensionEscrow.allEvents({fromBlock: 0, toBlock: 'latest'});
				eventsrequestExtensionEscrow.watch(function(error, result){
				   console.log('-----------------------------------------------')
				   if(error) { console.log('requestExtensionEscrow error'); console.log(error); }
				   console.log('eventsrequestExtensionEscrow')
				   console.log(result.event)
				   console.log(result.args)
				   console.log('-----------------------------------------------')
				});


			return RequestExtensionTax.new(requestCore.address,{from:admin});
		}).then(function(extensionTaxInstance) {
				requestExtensionTax = extensionTaxInstance;

				var eventsrequestExtensionTax= requestExtensionTax.allEvents({fromBlock: 0, toBlock: 'latest'});
				eventsrequestExtensionTax.watch(function(error, result){
				   console.log('-----------------------------------------------')
				   if(error) { console.log('requestExtensionTax error'); console.log(error); }
				   console.log('eventsrequestExtensionTax')
				   console.log(result.event)
				   console.log(result.args)
				   console.log('-----------------------------------------------')
				});


				return RequestEthereum.new(requestCore.address,{from:admin});
		}).then(function(ethereumInstance) {
				requestEthereum = ethereumInstance;		
				
				var eventsrequestEthereum= requestEthereum.allEvents({fromBlock: 0, toBlock: 'latest'});
				eventsrequestEthereum.watch(function(error, result){
				   console.log('-----------------------------------------------')
				   if(error) { console.log('requestEthereum error'); console.log(error); }
				   console.log('eventsrequestEthereum')
				   console.log(result.event)
				   console.log(result.args)
				   console.log('-----------------------------------------------')
				});

				return requestCore.adminResume({from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedExtension(requestExtensionEscrow.address, {from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedExtension(requestExtensionTax.address, {from:admin});
		}).then(function() {




		  var params0 = [addressToByte32str(escrow1)];
		  var params1 = [addressToByte32str(taxer1), integerToByte32str(2000) ];
		  console.log(params1);
		  return requestEthereum.createRequest(buyer1, amount1, [requestExtensionEscrow.address,requestExtensionTax.address], params0, params1, {from:seller1});
		  // return requestEthereum.createRequest(buyer1, amount1, [requestExtensionTax.address], params1, params1, {from:seller1});
		}).then(function(res) { 
		  // console.log("res.receipt.logs");
		  // console.log(res.receipt.logs);
		  // (res.logs || []).forEach(function(l) {
		  //   assert.equal(l.event, "LogRequestCreated", "LogRequestCreated must be trigger");
		  //   assert.equal(l.args.requestId.valueOf(), "1", "event should give invoideID: 1");
		  //   assert.equal(l.args.seller, seller1, "event should give seller as second arg");
		  //   assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
		  // });
		  return requestEthereum.accept(1, {from:buyer1});  
		 }).then(function(res) {
		//   return requestExtensionEscrow.escrows.call(1);
		// }).then(function(res) {
			// console.log('res')
			// console.log(res)
		  return requestEthereum.pay(1, {from:buyer1, value:amount1});
		}).then(function(res) {
		//   return requestExtensionEscrow.releaseToPayee(1, {from:escrow1});
		// }).then(function(res) {
		  return requestExtensionEscrow.refundToPayer(1, {from:escrow1});
		}).then(function(res) {
		 //  return requestExtensionEscrow.escrows.call(1)
		 // }).then(function(res) {
		 // 	console.log('escrows')
		 // 	console.log(res)
		// 	return web3.eth.getBalance(buyer1)
		// }).then(function(res) {
		//  	console.log('getBalance buyer1')
		//  	console.log(res)
			return requestEthereum.ethToWithdraw.call(1,buyer1)
		}).then(function(res) {
		 	console.log('ethToWithdraw buyer1')
		 	console.log(res)

			return requestEthereum.ethToWithdraw.call(1,seller1)
		}).then(function(res) {
		 	console.log('ethToWithdraw seller1')
		 	console.log(res)
			return requestEthereum.ethToWithdraw.call(1,taxer1)
		}).then(function(res) {
		 	console.log('ethToWithdraw taxer1')
		 	console.log(res)

		// 	return requestEthereum.ethToWithdraw.call(1,buyer1)
		// }).then(function(res) {
		//  	console.log('ethToWithdraw 2')
		//  	console.log(res)
		// 	return web3.eth.getBalance(buyer1)
		// }).then(function(res) {
		//  	console.log('getBalance2 buyer1')
		//  	console.log(res)
		//   return requestExtensionEscrow.escrows.call(1)
		//  }).then(function(res) {
		//  	console.log('escrows 22')
		//  	console.log(res)		  
		});
	});

/*
	it("Escrow should work", function() {
		var requestCore;
		var requestExtensionEscrow;
		var requestEthereum;

		return RequestCore.deployed().then(function(coreInstance) {
			requestCore=coreInstance;

			var eventsrequestCore = requestCore.allEvents({fromBlock: 0, toBlock: 'latest'});
			eventsrequestCore.watch(function(error, result){
			   console.log('-----------------------------------------------')
			   if(error) { console.log('requestCore error'); console.log(error); }
			   console.log('eventsrequestCore')
			   console.log(result.event)
			   console.log(result.args)	
			   console.log('-----------------------------------------------')
			});


			return RequestExtensionEscrow.new(requestCore.address,{from:admin});
		}).then(function(extensionEscrowInstance) {
				requestExtensionEscrow = extensionEscrowInstance;

				var eventsrequestExtensionEscrow= requestExtensionEscrow.allEvents({fromBlock: 0, toBlock: 'latest'});
				eventsrequestExtensionEscrow.watch(function(error, result){
				   console.log('-----------------------------------------------')
				   if(error) { console.log('requestExtensionEscrow error'); console.log(error); }
				   console.log('eventsrequestExtensionEscrow')
				   console.log(result.event)
				   console.log(result.args)
				   console.log('-----------------------------------------------')
				});

				return RequestEthereum.new(requestCore.address,{from:admin});
		}).then(function(ethereumInstance) {
				requestEthereum = ethereumInstance;		
				
				var eventsrequestEthereum= requestEthereum.allEvents({fromBlock: 0, toBlock: 'latest'});
				eventsrequestEthereum.watch(function(error, result){
				   console.log('-----------------------------------------------')
				   if(error) { console.log('requestEthereum error'); console.log(error); }
				   console.log('eventsrequestEthereum')
				   console.log(result.event)
				   console.log(result.args)
				   console.log('-----------------------------------------------')
				});

				return requestCore.adminResume({from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedExtension(requestExtensionEscrow.address, {from:admin});
		}).then(function() {
		  var params0 = [addressToByte32str(escrow1)];
		  return requestEthereum.createRequest(buyer1, amount1, [requestExtensionEscrow.address], params0, {from:seller1});
		}).then(function(res) { 
		  // console.log("res.receipt.logs");
		  // console.log(res.receipt.logs);
		  // (res.logs || []).forEach(function(l) {
		  //   assert.equal(l.event, "LogRequestCreated", "LogRequestCreated must be trigger");
		  //   assert.equal(l.args.requestId.valueOf(), "1", "event should give invoideID: 1");
		  //   assert.equal(l.args.seller, seller1, "event should give seller as second arg");
		  //   assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
		  // });
		  return requestEthereum.accept(1, {from:buyer1});  
		 }).then(function(res) {
		//   return requestExtensionEscrow.escrows.call(1);
		// }).then(function(res) {
			console.log('res')
			console.log(res)
		//   return requestEthereum.pay(1, {from:buyer1, value:amount1});
		// }).then(function(res) {
		  return requestExtensionEscrow.refundToPayer(1, {from:escrow1});
		}).then(function(res) {
		  return requestExtensionEscrow.escrows.call(1)
		 }).then(function(res) {
		 	console.log('escrows')
		 	console.log(res)
		// 	return web3.eth.getBalance(buyer1)
		// }).then(function(res) {
		//  	console.log('getBalance buyer1')
		//  	console.log(res)
			return requestEthereum.ethToWithdraw.call(1,buyer1)
		}).then(function(res) {
		 	console.log('ethToWithdraw')
		 	console.log(res)
		//  	return requestEthereum.withdraw(1, buyer1)
		// }).then(function(res) {
		// 	return requestEthereum.ethToWithdraw.call(1,buyer1)
		// }).then(function(res) {
		//  	console.log('ethToWithdraw 2')
		//  	console.log(res)
		// 	return web3.eth.getBalance(buyer1)
		// }).then(function(res) {
		//  	console.log('getBalance2 buyer1')
		//  	console.log(res)
		//   return requestExtensionEscrow.escrows.call(1)
		//  }).then(function(res) {
		//  	console.log('escrows 22')
		//  	console.log(res)		  
		});
	});
*/
});

