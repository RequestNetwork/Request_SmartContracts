
var Request = artifacts.require("../contracts/Request.sol");
var RequestFactory = artifacts.require("../contracts/RequestFactory.sol");
var StandardRequest = artifacts.require("../contracts/StandardRequest.sol");
var StandardRequestFactory = artifacts.require("../contracts/StandardRequestFactory.sol");

module.exports = function(deployer) {

  deployer.deploy(Request);
  // deployer.deploy(RequestFactory);
  // deployer.deploy(StandardRequest);
  // deployer.deploy(StandardRequestFactory);
  // deployer.deploy(Request).then(function() {
  // 	return deployer.deploy(RequestFactory, Request.address);
  // });	
};
