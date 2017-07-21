
var Request = artifacts.require("../contracts/Request.sol");
var RequestFactory = artifacts.require("../contracts/RequestFactory.sol");
var StandardRequest = artifacts.require("../contracts/StandardRequest.sol");
var StandardRequestFactory = artifacts.require("../contracts/StandardRequestFactory.sol");

module.exports = function(deployer) {

  deployer.deploy(StandardRequestFactory, "0x0f3549e200e276beeb05a578a723baa8611b8652", 123);
  // deployer.deploy(RequestFactory);
  // deployer.deploy(StandardRequest);
  // deployer.deploy(StandardRequestFactory);
  // deployer.deploy(Request).then(function() {
  // 	return deployer.deploy(RequestFactory, Request.address);
  // });	
};
