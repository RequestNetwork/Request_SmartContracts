var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestSynchroneExtensionEscrow = artifacts.require("./RequestSynchroneExtensionEscrow.sol");
var RequestBurnManagerSimple = artifacts.require("./RequestBurnManagerSimple.sol");

// Copy & Paste this
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }


var addressContractBurner = 0;
var feesPerTenThousand = 10; // 0.1 %


var requestCoreContract;
var requestEthereum;
var requestEscrow;
var requestBurnManagerSimple;

module.exports = function(deployer) {
		return RequestCore.new().then(function(result){
			requestCoreContract = result;
				console.log("requestCore: "+requestCoreContract.address);
				RequestEthereum.new(requestCoreContract.address).then(function(result){
					requestEthereum=result;
					console.log("requestEthereum: "+result.address);

						RequestBurnManagerSimple.new(addressContractBurner).then(function(result){
							requestBurnManagerSimple=result;
							console.log("requestBurnManagerSimple: "+result.address);

							requestBurnManagerSimple.setFeesPerTenThousand(feesPerTenThousand).then(function(result){
								requestCoreContract.setBurnManager(requestBurnManagerSimple.address).then(function(result){
										requestCoreContract.adminAddTrustedCurrencyContract(requestEthereum.address).then(function(r) {
											RequestSynchroneExtensionEscrow.new(requestCoreContract.address).then(function(result){
												requestEscrow=result;

												console.log("RequestSynchroneExtensionEscrow: "+result.address);
												requestCoreContract.adminAddTrustedExtension(result.address).then(function(r) {
													requestCoreContract.getStatusContract(requestEthereum.address).then(function(d) {
												    console.log("getStatusContract: " + requestEthereum.address + " => " + d)
													})
													requestCoreContract.getStatusExtension(requestEscrow.address).then(function(d) {
												    console.log("getStatusExtension: " + requestEscrow.address + " => " + d)
													})	

													requestBurnManagerSimple.feesPer10000().then(function(d) {
												    console.log("trustedNewBurnManager %% => " + d);
													})	
													requestCoreContract.trustedNewBurnManager().then(function(d) {
												    console.log("trustedNewBurnManager manager => " + d);
													})											
												});
											});
										});
								});
							});
					});
			});
		});
};

