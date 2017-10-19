var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestSynchroneExtensionEscrow = artifacts.require("./RequestSynchroneExtensionEscrow.sol");

// Copy & Paste this
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }


var requestCoreContract;

module.exports = function(deployer) {
    return RequestCore.new().then(function(result){
    	requestCoreContract = result;
        console.log("requestCore: "+requestCoreContract.address);
        RequestEthereum.new(requestCoreContract.address).then(function(result){
	        console.log("requestEthereum: "+result.address);
	        RequestSynchroneExtensionEscrow.new(requestCoreContract.address).then(function(result){
		        console.log("RequestSynchroneExtensionEscrow: "+result.address);
		    });
	    });
    });
};

