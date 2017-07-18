return;

var ListInvoices = artifacts.require("./Invoices.sol");
var OneInvoice = artifacts.require("./Invoice.sol");

contract('Invoices', function(accounts) {
  var seller1 = accounts[0];
  var buyer1 = accounts[1];
  var seller2 = accounts[2];
  var buyer2 = accounts[3];
  var random_guy = accounts[4];
  var amount1 = 1000000000000;
  var amount2 = 9999;
  var amount3 = 1;

  it("should be acceptable only by buyer1", function() {
    var contrat;
    return OneInvoice.new(buyer1, amount1, {from:seller1}).then(function(instance) {
      contrat=instance;
      return instance.accept({from:buyer1});
    }).then(function(res) {
      return contrat.pay({value:amount1,from:buyer1});
    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);
      return OneInvoice.new(buyer1, amount3, {from:seller1}).then(function(instance) {
        contrat=instance;
        return instance.accept({from:buyer1});
      }).then(function(res) {
        return contrat.pay({value:amount3,from:buyer1});
      }).then(function(res) {
        console.log('res ------------------- ');
        console.log(res.receipt.gasUsed);
      });
    });

  });


  // who can do what ----------------------------------------
  it("should be acceptable only by buyer1", function() {
    var contract;

    return ListInvoices.deployed().then(function(instance) {
      contract=instance;
      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer1});
    }).then(function(res) {
      return contract.pay(res.logs[0].args.invoiceID, {value:amount1, from:buyer1});
    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);



        return contract.createInvoice(buyer1, amount3, {from:seller1});
    }).then(function(res) {
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer1});
    }).then(function(res) {
      return contract.pay(res.logs[0].args.invoiceID, {value:amount3, from:buyer1});
    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);



      return contract.createInvoice(buyer1, amount3, {from:seller1});
    }).then(function(res) {
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer1});
    }).then(function(res) {
      return contract.pay(res.logs[0].args.invoiceID, {value:amount3, from:buyer1});
    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);


      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer1});
    }).then(function(res) {
      return contract.pay(res.logs[0].args.invoiceID, {value:amount1, from:buyer1});
    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);
    });    



  });


/*
  // who can do what ----------------------------------------
  it("should be acceptable only by buyer1", function() {
    var contract;

    return ListInvoices.deployed().then(function(instance) {
      contract=instance;
      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      console.log('res --------------------- ');
      console.log(res.logs[0].args.invoiceID);
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer1});

    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);
      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      console.log('res --------------------- ');
      console.log(res.logs[0].args.invoiceID);
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer1});

    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);
      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      console.log('res --------------------- ');
      console.log(res.logs[0].args.invoiceID);
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer1});

    }).then(function(res) {
      console.log('res ####################"------------------- ');
      console.log(res.receipt.gasUsed);
      return contract.createInvoice(buyer2, amount2, {from:seller2});
    }).then(function(res) {
      console.log('res --------------------- ');
      console.log(res.logs[0].args.invoiceID);
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer2});

    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);
      return contract.createInvoice(buyer2, amount2, {from:seller2});
    }).then(function(res) {
      console.log('res --------------------- ');
      console.log(res.logs[0].args.invoiceID);
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer2});

    }).then(function(res) {
      console.log('res ####################"------------------- ');
      console.log(res.receipt.gasUsed);
      return contract.createInvoice(buyer2, amount3, {from:seller2});
    }).then(function(res) {
      console.log('res --------------------- ');
      console.log(res.logs[0].args.invoiceID);
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer2});

    }).then(function(res) {
      console.log('res ------------------- ');
      console.log(res.receipt.gasUsed);
      return contract.createInvoice(buyer2, amount3, {from:seller2});
    }).then(function(res) {
      console.log('res --------------------- ');
      console.log(res.logs[0].args.invoiceID);
      return contract.accept(res.logs[0].args.invoiceID, {from:buyer2});
    });  



  });

*/

//   it("should be acceptable only by buyer", function() {
//     var invoice1;
//     var seller1 = accounts[0];
//     var buyer1 = accounts[1];
//     var random_guy = accounts[4];
//     var amount1 = 1000000000000;

//  ListInvoices.new({from:seller1})
//  ListInvoices.new({from:seller1})
//  ListInvoices.new({from:seller1})
// return ListInvoices.new({from:seller1})
//     // return OneInvoice.new(buyer1, amount1, {from:seller1}).then(function(instance) {
//     //   console.log('instance');
//     //   console.log(instance);
//     // });
//   });

//   it("should be acceptable only by buyer", function() {
//     var invoice1;
//     var seller1 = accounts[0];
//     var buyer1 = accounts[1];
//     var random_guy = accounts[4];
//     var amount1 = 1000000000000;

//  OneInvoice.new(buyer1, amount1, {from:seller1})
//  OneInvoice.new(buyer1, amount1, {from:seller1})
//  OneInvoice.new(buyer1, amount1, {from:seller1})
// return OneInvoice.new(buyer1, amount1, {from:seller1})
//     // return OneInvoice.new(buyer1, amount1, {from:seller1}).then(function(instance) {
//     //   console.log('instance');
//     //   console.log(instance);
//     // });
//   });

});