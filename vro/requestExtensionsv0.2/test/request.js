var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestBitcoin = artifacts.require("./RequestBitcoin.sol");
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

function strToArray(str) {
	var re = []
	for(i=str.indexOf('0x')==-1?0:2;i<str.length;i+=2) {
		re.push('0x'+str[i]+str[i+1]);
	}
	return re;
}


function strToArrayInteger(str) {
	var re = []
	for(i=str.indexOf('0x')==-1?0:2;i<str.length;i+=2) {
		re.push(parseInt('0x'+str[i]+str[i+1]));
	}
	return re;
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
  	var oracleBitCoin = accounts[8];
	var amount1 = 1000000000000;
	var amount2 = 9999;

	var againRefundToPayer = false;
	var lastOctetTxIdFake = 10;
	// for bitcoin
	var addressBitcoinPayee = '0x1111118f017bfb2bb0c03fa73e4b3ef7e3111111'; // fake one
	var addressBitcoinPayer = '0x1222228f017bfb2bb0c03fa73e4b3ef7e3222222'; // fake one
	var addressBitcoinEscrow = '0x1333338f017bfb2bb0c03fa73e4b3ef7e3333333'; // fake one

	var gasConsumption = 0;

		it("Escrow should work Bitcoin alone", function() {
		var requestCore;
		var requestExtensionEscrow;
		var requestExtensionTax;
		var requestBitcoin;

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
		}).then(function(instance) {
			requestEthereum = instance;		
			console.log('requestEthereum')		
			console.log(requestEthereum.address)
			var eventsrequestEthereum= requestEthereum.allEvents({fromBlock: 0, toBlock: 'latest'});
			eventsrequestEthereum.watch(function(error, result){
			   console.log('-----------------------------------------------')
			   if(error) { console.log('requestEthereum error'); console.log(error); }
			   console.log('eventsrequestEthereum')
			   console.log(result.event)
			   console.log(result.args)
			   console.log('-----------------------------------------------')
			});


			return RequestBitcoin.new(requestCore.address, oracleBitCoin, {from:admin});
		}).then(function(bitcoinInstance) {
			requestBitcoin = bitcoinInstance;		
			console.log('requestBitcoin')		
			console.log(requestBitcoin.address)
			var eventsrequestBitcoin= requestBitcoin.allEvents({fromBlock: 0, toBlock: 'latest'});
			eventsrequestBitcoin.watch(function(error, result){
			   console.log('-----------------------------------------------')
			   if(error) { console.log('requestBitcoin error'); console.log(error); }
			   console.log('eventsrequestBitcoin')
			   console.log(result.event)
			   console.log(result.args)
			   console.log('-----------------------------------------------')
			   if(result.event == 'OracleRequestFundReception') {
			   		var reqId = result.args.requestId;
			   		var from = result.args.from.replace('0x','');
			   		var to = result.args.to.replace('0x','');
			   		var addressBitcoinTo = result.args.addressBitcoinTo.replace('0x','');
			   		// var addressBitcoinFrom = "1010101010134567891324567891234510101010"; // faked one
			   		var txId = "01010101010134567891324567891234567891234567891234567891010101"+(lastOctetTxIdFake++); // faked one
			   		var amount = integerToByte32str(amount1/2).replace('0x',''); // faked one
			   		// console.log("'0x'+from+to+addressBitcoinTo+txId+amount");
			   		console.log('0x'+from+to+addressBitcoinTo+txId+amount);
			   		var data = '0x'+from+to+addressBitcoinTo+txId+amount;

			   		requestBitcoin.oracleFundReception(reqId, data, {from:oracleBitCoin}).then(function() {
						return requestBitcoin.bitCoinLedger.call(1)
					}).then(function(res) {
					 	console.log('bitCoinLedger 222222222222222222')
					 	console.log(res)
					// 	return requestBitcoin.bitcoinTxsHistory.call(1,0)
					// }).then(function(res) {
					//  	console.log('bitcoinTxsHistory 1 0')
					//  	console.log(res)

					 	txId = "01010101010134567891324567891234567891234567891234567891010101"+(lastOctetTxIdFake++); 
					 	data = '0x'+from+to+addressBitcoinTo+txId+amount;
					 	if(!againRefundToPayer) {
					 		againRefundToPayer = true;
				   			requestExtensionEscrow.refundToPayer(1, {from:escrow1}).then(function() {
					   		// requestBitcoin.oracleFundReception(reqId, data, {from:oracleBitCoin}).then(function() {
							// 	return requestBitcoin.bitCoinLedger.call(1)
							// }).then(function(res) {
							//  	console.log('bitCoinLedger 222222222222222222 333333333333333333333333')
							//  	console.log(res)
							// 	return requestBitcoin.bitcoinTxsHistory.call(1,0)
							// }).then(function(res) {
							//  	console.log('bitcoinTxsHistory 1 0 3333333333333333333333')
							//  	console.log(res)
					   		});
				   		}
			   		});
			   }
			});

			return requestCore.adminResume({from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedSubContract(requestBitcoin.address, {from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedExtension(requestExtensionEscrow.address, {from:admin});
		}).then(function() {
		  return requestCore.adminAddTrustedExtension(requestExtensionTax.address, {from:admin});
		}).then(function() {

			var extensions = [];
			var params = [];
			var numberExtension = 0;

			// // for escrow
			extensions.push(requestExtensionEscrow.address);
			params[numberExtension++] = [addressToByte32str(escrow1),addressToByte32str(escrow1)] // escrow and escrow deposit

			// // for tax
			// extensions.push(requestExtensionTax.address);
			// params[numberExtension++] = [addressToByte32str(taxer1), integerToByte32str(2000) ]

			for(;numberExtension<2; numberExtension++) {
				params[numberExtension] = [];
			}


		  console.log("extensions");
		  console.log(extensions);
		  console.log("params");
		  console.log(params);
		  console.log("addressBitcoinPayee");
		  console.log(addressBitcoinPayee);

		  // return requestEthereum.createRequest(buyer1, amount1, extensions, params[0], params[1], {from:seller1});
		  return requestBitcoin.createRequest(buyer1, amount1, extensions, params[0], params[1], addressBitcoinPayee, addressBitcoinPayer, {from:seller1});
		}).then(function(res) { 
		  gasConsumption += res.receipt.gasUsed;
		  // console.log('res')
		  // console.log(res)
		  // (res.logs || []).forEach(function(l) {
		  //   assert.equal(l.event, "LogRequestCreated", "LogRequestCreated must be trigger");
		  //   assert.equal(l.args.requestId.valueOf(), "1", "event should give invoideID: 1");
		  //   assert.equal(l.args.seller, seller1, "event should give seller as second arg");
		  //   assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
		  // });
		  return requestBitcoin.accept(1, {from:buyer1});  
		}).then(function(res) { 
		  gasConsumption += res.receipt.gasUsed;

		  // return requestBitcoin.payment(1, 124, {from:buyer1});  
		  // return requestExtensionEscrow.releaseToPayee(1, {from:escrow1});
		//   return requestExtensionEscrow.refundToPayer(1, {from:escrow1});
		// }).then(function(res) {
		  // gasConsumption += res.receipt.gasUsed;
		  return requestBitcoin.paymentBitcoin(1, escrow1, '0x1333338f017bfb2bb0c03fa73e4b3ef7e3333333', {from:buyer1});
		}).then(function(res) { 
		  gasConsumption += res.receipt.gasUsed;
		//   return requestBitcoin.paymentBitcoin(1, escrow1, '0x1333338f017bfb2bb0c03fa73e4b3ef7e3333333', {from:buyer1});
		// }).then(function(res) { 
		  gasConsumption += res.receipt.gasUsed;
		  // return requestExtensionEscrow.refundToPayer(1, {from:escrow1});
		// }).then(function(res) { 
		  // gasConsumption += res.receipt.gasUsed;
		 //  return requestExtensionEscrow.escrows.call(1)
		 // }).then(function(res) {
		 // 	console.log('escrows')
		 // 	console.log(res)
		// 	return web3.eth.getBalance(buyer1)
		// }).then(function(res) {
		//  	console.log('getBalance buyer1')
		//  	console.log(res)
		// 	return requestBitcoin.ethToWithdraw.call(1,buyer1)
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
		// 	return requestBitcoin.bitCoinLedger.call(1)
		// }).then(function(res) {
		//  	console.log('bitCoinLedger 1')
		//  	console.log(res)

		 	console.log('gasConsumption')
		 	console.log(gasConsumption)	  
		});
	});

/*
	// who can do what ----------------------------------------
	it("Escrow should work two extension Ethereum", function() {
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

			var extensions = [];
			var params = [];
			var numberExtension = 0;

			// // for escrow
			// extensions.push(requestExtensionEscrow.address);
			// params[numberExtension++] = [addressToByte32str(escrow1)]

			// // for tax
			// extensions.push(requestExtensionTax.address);
			// params[numberExtension++] = [addressToByte32str(taxer1), integerToByte32str(2000) ]

			for(;numberExtension<2; numberExtension++) {
				params[numberExtension] = [];
			}

		  console.log("extensions");
		  console.log(extensions);
		  console.log("params");
		  console.log(params);

		  return requestEthereum.createRequest(buyer1, amount1, extensions, params[0], params[1], {from:seller1});
		  // return requestEthereum.createRequest(buyer1, amount1, [requestExtensionTax.address], params1, params1, {from:seller1});
		}).then(function(res) { 
		  gasConsumption += res.receipt.gasUsed;
		  // (res.logs || []).forEach(function(l) {
		  //   assert.equal(l.event, "LogRequestCreated", "LogRequestCreated must be trigger");
		  //   assert.equal(l.args.requestId.valueOf(), "1", "event should give invoideID: 1");
		  //   assert.equal(l.args.seller, seller1, "event should give seller as second arg");
		  //   assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
		  // });
		  return requestEthereum.accept(1, {from:buyer1});  
		}).then(function(res) { 
		  gasConsumption += res.receipt.gasUsed;
		//   return requestExtensionEscrow.escrows.call(1);
		// }).then(function(res) {
			// console.log('res')
			// console.log(res)
		  return requestEthereum.pay(1, {from:buyer1, value:amount1});
		// }).then(function(res) { 
		//   gasConsumption += res.receipt.gasUsed;
		//   return requestExtensionEscrow.releaseToPayee(1, {from:escrow1});
		// }).then(function(res) {
		  // return requestExtensionEscrow.refundToPayer(1, {from:escrow1});
		}).then(function(res) { 
		  gasConsumption += res.receipt.gasUsed;
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
		 	console.log('gasConsumption')
		 	console.log(gasConsumption)
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

