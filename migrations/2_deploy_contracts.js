var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestSynchroneExtensionEscrow = artifacts.require("./RequestSynchroneExtensionEscrow.sol");

// Copy & Paste this
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }


var requestCoreContract;
var requestEthereum;
var requestEscrow;

module.exports = function(deployer) {
    return RequestCore.new().then(function(result){
    	requestCoreContract = result;
        console.log("requestCore: "+requestCoreContract.address);
        RequestEthereum.new(requestCoreContract.address).then(function(result){
        	requestEthereum=result;
	        console.log("requestEthereum: "+result.address);
		        requestCoreContract.adminAddTrustedCurrencyContract(requestEthereum.address).then(function(r) {
					RequestSynchroneExtensionEscrow.new(requestCoreContract.address).then(function(result){
						requestEscrow=result;
			        	console.log("RequestSynchroneExtensionEscrow: "+result.address);
				        requestCoreContract.adminAddTrustedExtension(result.address).then(function(r) {
				        	
				        	requestCoreContract.getStatusContract(requestEthereum.address).then(function(d) {
				        		console.log("getStatusContract: "+requestEthereum.address+" => "+d)
				        	})
				        	requestCoreContract.getStatusExtension(requestEscrow.address).then(function(d) {
				        		console.log("getStatusExtension: "+requestEscrow.address+" => "+d)
				        	})


				        });

			    });
	        });
	    });
    });
};

