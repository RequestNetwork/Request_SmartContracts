var RequestCore = artifacts.require("./RequestCore.sol");

module.exports = function(deployer) {
  deployer.deploy(RequestCore);
  // deployer.link(ConvertLib, MetaCoin);
  // deployer.deploy(MetaCoin);
};
