var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestExtensionEscrow = artifacts.require("./RequestExtensionEscrow.sol");

contract('RequestCore', function(accounts) {
	var admin = accounts[0];
	var seller1 = accounts[1];
	var buyer1 = accounts[2];
	var seller2 = accounts[3];
	var buyer2 = accounts[4];
	var random_guy = accounts[5];
  var escrow1 = accounts[6];
  
	var amount1 = 1000000000000;
	var amount2 = 9999;

	// who can do what ----------------------------------------
	it("should work", function() {
		var requestCore;
		var requestExtensionEscrow;
		var requestEthereum;

		return RequestCore.deployed().then(function(coreInstance) {
			requestCore=coreInstance;

      console.log('requestCore.address');
      console.log(requestCore.address);

			return RequestExtensionEscrow.new(requestCore.address,{from:admin});
    }).then(function(extensionEscrowInstance) {
			requestExtensionEscrow = extensionEscrowInstance;

			return RequestEthereum.new(requestCore.address,{from:admin});
    }).then(function(ethereumInstance) {
			requestEthereum = ethereumInstance;		

			return requestCore.adminResume({from:admin});
    }).then(function() {
      return requestCore.adminAddTrustedSubContract(requestEthereum.address, {from:admin});
    }).then(function() {
      return requestCore.adminAddTrustedExtension(requestExtensionEscrow.address, {from:admin});
    }).then(function() {
      var params = [10][10];
      params[0][0] = escrow1;
      return requestEthereum.createRequest(buyer1, 777, [requestExtensionEscrow.address], /*params,*/ {from:seller1});
    }).then(function(res) { 
      console.log("res.receipt.logs");
      console.log(res.receipt.logs);
      // (res.logs || []).forEach(function(l) {
      //   assert.equal(l.event, "LogRequestCreated", "LogRequestCreated must be trigger");
      //   assert.equal(l.args.requestId.valueOf(), "1", "event should give invoideID: 1");
      //   assert.equal(l.args.seller, seller1, "event should give seller as second arg");
      //   assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
      // });
      return requestEthereum.accept(1, {from:buyer1});  
    }).then(function(res) {
      // console.log("res");
      // console.log(res);
      // console.log("res.receipt.logs");
      // console.log(res.receipt.logs);
      // console.log('Finish!')  
    //   return requestExtensionEscrow.escrowAccept(1, {from:buyer1});  
    // }).then(function(res) {
      console.log("res");
      console.log(res);
		});
	});

});


			// return contract.createInvoice(buyer1, amount1, {from:seller1});
		// }).then(function(res) {
		//	 console.log('res');
		//	 console.log(res);
		//	 (res.logs || []).forEach(function(l) {
		//		 assert.equal(l.event, "InvoiceCreated", "InvoiceCreated must be trigger");
		//		 assert.equal(l.args.invoiceID.valueOf(), "0", "event should give invoideID: 0");
		//		 assert.equal(l.args.seller, seller1, "event should give seller as second arg");
		//		 assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
		//	 });
		//	 return contract.accept(0, {from:seller1});
		// }).then(function() {
		//	 assert(false, "seller should not accept, throw was expected");
		// }).catch(function(error) {
		//	 if( error.toString() == "AssertionError: seller should not accept, throw was expected" ) {	
		//		 throw error;
		//	 } else if(error.toString().indexOf("invalid opcode") == -1) {
		//		 assert(false, error.toString());
		//	 } 
		//	 return contract.accept(0, {from:random_guy});
		// }).then(function() {
		//		 assert(false, "random_guy should not accept, throw was expected");
		// }).catch(function(error) {
		//	 if( error.toString() == "AssertionError: random_guy should not accept, throw was expected" ) {	
		//		 throw error;
		//	 } else if(error.toString().indexOf("invalid opcode") == -1) {
		//		 assert(false, error.toString());
		//	 } 
		//	 return contract.accept(0, {from:buyer2});
		// }).then(function() {
		//		 assert(false, "buyer2 should not accept, throw was expected");
		// }).catch(function(error) {
		//	 if( error.toString() == "AssertionError: buyer2 should not accept, throw was expected" ) {	
		//		 throw error;
		//	 } else if(error.toString().indexOf("invalid opcode") == -1) {
		//		 assert(false, error.toString());
		//	 } 
		//	 return contract.accept(0, {from:buyer1});
		// }).then(function(res) {
		//	 assert.equal(res.logs.length, 1, "event must be trigger");
		//	 (res.logs || []).forEach(function(l) {
		//		 assert.equal(l.event, "InvoiceAccepted", "InvoiceAccepted must be trigger");
		//		 assert.equal(l.args.invoiceID.valueOf(), "0", "event should give invoideID: 0");
		//	 });
