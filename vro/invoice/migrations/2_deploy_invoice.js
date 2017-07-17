
var Invoice = artifacts.require("./Invoice.sol");
var ListInvoices = artifacts.require("./Invoices.sol");

module.exports = function(deployer) {
  deployer.deploy(ListInvoices);
  //deployer.deploy(Invoice,account[1], 666);
};

/*
(0) 0x4296403ccbb777caff8e6181e66fbbf7e8e98a2d
(1) 0x1b93b5c46cfcdfdec1a694d92ab984c1c18c8e6d
(2) 0xdbac745b3d5ca376eec78afcafed5d50b80b2656
(3) 0x26d30ae182e7cb1460ba65668e9e0ba45fe61120
(4) 0x11562165d88290977fa346baab3a7657544180a9
(5) 0x33fbdef59f99c5886bd6e6aab3a3993d99d8f5d5
(6) 0x867060e7e5daa5a397e817e51b82cc3bf49345a6
(7) 0x0fd218d4019b2b229a3403bc8e13a03b8fde6d35
(8) 0x1f50f9b750295614cce393d303b9fc79878d8f35
(9) 0x4ab6e6e72d3d47eb4199f84b425684d0b96f2773
*/