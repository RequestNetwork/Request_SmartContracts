var RequestCore = artifacts.require("./RequestCore.sol");
var RequestEthereum = artifacts.require("./RequestEthereum.sol");


module.exports = function(deployer) {
  deployer.deploy(RequestCore);
  // deployer.deploy(RequestExtensionEscrow);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);
};
