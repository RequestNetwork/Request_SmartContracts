var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");
var RequestSynchroneExtensionEscrow = artifacts.require("./RequestSynchroneExtensionEscrow.sol");
var RequestBurnManagerSimple = artifacts.require("./RequestBurnManagerSimple.sol");

var addressContractBurner = 0;
var feesPerTenThousand = 10; // 0.1 %


var requestCore;
var requestEthereum;
var requestEscrow;
var requestBurnManagerSimple;

module.exports = function(deployer) {
    deployer.deploy(RequestCore).then(function() {
        return deployer.deploy(RequestEthereum, RequestCore.address).then(function() {
            return deployer.deploy(RequestBurnManagerSimple, addressContractBurner).then(function() {
                return deployer.deploy(RequestSynchroneExtensionEscrow, RequestCore.address).then(function() {
                    createInstances().then(function() {
                        setupContracts().then(function() {
                            checks()
                        });
                    });
                });
            });
        });
    });
};

var createInstances = function() {
    return RequestCore.deployed().then(function(instance) {
        requestCore = instance;
        return RequestEthereum.deployed().then(function(instance) {
            requestEthereum = instance;
            return RequestBurnManagerSimple.deployed().then(function(instance) {
                requestBurnManagerSimple = instance;
                return RequestSynchroneExtensionEscrow.deployed().then(function(instance) {
                    requestEscrow = instance;
                    console.log("Instances set.")
                });
            });
        });
    });
}

var setupContracts = function() {
    return requestBurnManagerSimple.setFeesPerTenThousand(feesPerTenThousand).then(function() {
        return requestCore.setBurnManager(requestBurnManagerSimple.address).then(function() {
            return requestCore.adminAddTrustedCurrencyContract(requestEthereum.address).then(function() {
                return requestCore.adminAddTrustedExtension(requestEscrow.address).then(function() {
                    console.log("Contracts set up.")
                });
            });
        });
    });
}

var checks = function() {
  requestCore.getStatusContract(requestEthereum.address).then(function(d) {
    console.log("getStatusContract: " + requestEthereum.address + " => " + d)
  });
  requestCore.getStatusExtension(requestEscrow.address).then(function(d) {
    console.log("getStatusExtension: " + requestEscrow.address + " => " + d)
  });
  requestBurnManagerSimple.feesPer10000().then(function(d) {
    console.log("trustedNewBurnManager %% => " + d);
  });
  requestCore.trustedNewBurnManager().then(function(d) {
    console.log("trustedNewBurnManager manager => " + d);
    console.log("Checks complete")
  });
}
