return;

var ListInvoices = artifacts.require("./Invoices.sol");

contract('Invoices', function(accounts) {
  var seller1 = accounts[0];
  var buyer1 = accounts[1];
  var seller2 = accounts[2];
  var buyer2 = accounts[3];
  var random_guy = accounts[4];
  var amount1 = 1000000000000;
  var amount2 = 9999;

  // who can do what ----------------------------------------
  it("should be acceptable only by buyer1", function() {
    var contract;

    return ListInvoices.deployed().then(function(instance) {
      contract=instance;
      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      console.log('res');
      console.log(res);
      (res.logs || []).forEach(function(l) {
        assert.equal(l.event, "InvoiceCreated", "InvoiceCreated must be trigger");
        assert.equal(l.args.invoiceID.valueOf(), "0", "event should give invoideID: 0");
        assert.equal(l.args.seller, seller1, "event should give seller as second arg");
        assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
      });
      return contract.accept(0, {from:seller1});
    }).then(function() {
      assert(false, "seller should not accept, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: seller should not accept, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.accept(0, {from:random_guy});
    }).then(function() {
        assert(false, "random_guy should not accept, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: random_guy should not accept, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.accept(0, {from:buyer2});
    }).then(function() {
        assert(false, "buyer2 should not accept, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: buyer2 should not accept, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.accept(0, {from:buyer1});
    }).then(function(res) {
      assert.equal(res.logs.length, 1, "event must be trigger");
      (res.logs || []).forEach(function(l) {
        assert.equal(l.event, "InvoiceAccepted", "InvoiceAccepted must be trigger");
        assert.equal(l.args.invoiceID.valueOf(), "0", "event should give invoideID: 0");
      });
    });
  });

  it("should be refusable only by buyer1", function() {
    var contract;

    return ListInvoices.deployed().then(function(instance) {
      contract=instance;
      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      (res.logs || []).forEach(function(l) {
        assert.equal(l.event, "InvoiceCreated", "InvoiceCreated must be trigger");
        assert.equal(l.args.invoiceID.valueOf(), "1", "event should give invoideID: 1");
        assert.equal(l.args.seller, seller1, "event should give seller as second arg");
        assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
      });
      return contract.refuse(1, {from:seller1});
    }).then(function() {
      assert(false, "seller should not refuse, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: seller should not refuse, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.refuse(1, {from:random_guy});
    }).then(function() {
        assert(false, "random_guy should not refuse, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: random_guy should not refuse, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.refuse(1, {from:buyer2});
    }).then(function() {
        assert(false, "buyer2 should not refuse, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: buyer2 should not refuse, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.refuse(1, {from:buyer1});
    }).then(function(res) {
      assert.equal(res.logs.length, 1, "event must be trigger");
      (res.logs || []).forEach(function(l) {
        assert.equal(l.event, "InvoiceRefused", "InvoiceRefused must be trigger");
        assert.equal(l.args.invoiceID.valueOf(), "1", "event should give invoideID: 1");
      });
    });
  });

  it("should be abortable only by seller1", function() {
    var contract;

    return ListInvoices.deployed().then(function(instance) {
      contract=instance;
      return contract.createInvoice(buyer1, amount1, {from:seller1});
    }).then(function(res) {
      (res.logs || []).forEach(function(l) {
        assert.equal(l.event, "InvoiceCreated", "InvoiceCreated must be trigger");
        assert.equal(l.args.invoiceID.valueOf(), "2", "event should give invoideID: 2");
        assert.equal(l.args.seller, seller1, "event should give seller as second arg");
        assert.equal(l.args.buyer, buyer1, "event should give buyer as third arg");
      });
      return contract.abort(2, {from:buyer1});
    }).then(function() {
      assert(false, "buyer1 should not abort, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: buyer1 should not abort, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.abort(2, {from:random_guy});
    }).then(function() {
        assert(false, "random_guy should not abort, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: random_guy should not abort, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.abort(2, {from:seller2});
    }).then(function() {
        assert(false, "seller2 should not abort, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: seller2 should not abort, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
      return contract.abort(2, {from:seller1});
    }).then(function(res) {
      assert.equal(res.logs.length, 1, "event must be trigger");
      (res.logs || []).forEach(function(l) {
        assert.equal(l.event, "InvoiceAborted", "InvoiceAborted must be trigger");
        assert.equal(l.args.invoiceID.valueOf(), "2", "event should give invoideID: 2");
      });
    });
  });































/*      console.log('invoiceID')
      console.log(invoiceID)
      assert.equal(invoiceID.valueOf(), 0, "0 must be the first invoiceID");
      return contract.createInvoice.call(buyer1, amount2, {from:seller1});
    }).then(function(invoiceID) {
      console.log('invoiceID')
      console.log(invoiceID)
      // assert.equal(invoiceID.valueOf(), 1, "1 must be the first invoiceID");
      return contract.createInvoice.call(buyer2, amount2, {from:seller2});
    }).then(function(invoiceID) {
      console.log('invoiceID')
      console.log(invoiceID)
      // assert.equal(invoiceID.valueOf(), 2, "2 must be the first invoiceID");
    });*/
/*
/*
  it("should be refusable only by buyer", function() {
    var invoice1;
    var invoice2;
    var invoice3;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice = instance;
      return invoice.refuse({from:seller});
    }).then(function() {
      assert(false, "seller should not refuse, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: seller should not refuse, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.refuse({from:random_guy});
    }).then(function() {
      assert(false, "random_guy should not refuse, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: random_guy should not refuse, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.refuse({from:buyer});
    }).then(function() {
      return invoice3.state();
    }).then(function(state) {
      assert.equal(state.valueOf(), 2, "state should be Refused (2)");
    });
  });

  it("should be abortable only by seller", function() {
    var invoice1;
    var invoice2;
    var invoice3;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.abort({from:buyer});
    }).then(function() {
      assert(false, "buyer should not abort, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: buyer should not abort, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.abort({from:random_guy});
    }).then(function() {
      assert(false, "random_guy should not abort, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: random_guy should not abort, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.abort({from:seller});
    }).then(function() {
      return invoice3.state();
    }).then(function(state) {
      assert.equal(state.valueOf(), 4, "state should be Aborted (4)");
    });
  });

  it("should be payable only by buyer", function() {
    var invoice1;
    var invoice2;
    var invoice3;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.accept({from:buyer});
    }).then(function() {
      return invoice1.pay({from:seller,value:amount});
    }).then(function() {
      assert(false, "seller should not pay, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: seller should not pay, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.accept({from:buyer});
    }).then(function() {
      return invoice2.pay({from:random_guy,value:amount});
    }).then(function() {
      assert(false, "random_guy should not pay, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: random_guy should not pay, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && 
    Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.accept({from:buyer});
    }).then(function() {
      return invoice3.pay({from:buyer,value:amount});
    }).then(function() {
      return invoice3.state();
    }).then(function(state) {
      assert.equal(state.valueOf(), 3, "state should be Payed (3)");
    });
  });
  // ---------------------------------------------------------

  // when do what --------------------------------------------
  it("should be acceptable only if state == Created", function() {
    var invoice1;
    var invoice2;
    var invoice3;
    var invoice4;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.accept({from:buyer});
    }).then(function() {
      return invoice1.accept({from:buyer});
    }).then(function() {
      assert(false, "should be not acceptable when accepted, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not acceptable when accepted, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.refuse({from:buyer});
    }).then(function() {
      return invoice2.accept({from:buyer});
    }).then(function() {
      assert(false, "should be not acceptable when refused, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not acceptable when refused, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.abort({from:seller});
    }).then(function() {
      return invoice3.accept({from:buyer});
    }).then(function() {
      assert(false, "should be not acceptable when aborted, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not acceptable when aborted, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice4 = instance;
      return invoice4.accept({from:buyer});
    }).then(function() {
      return invoice4.pay({from:buyer,value:amount});
    }).then(function() {
      return invoice4.accept({from:buyer});
    }).then(function() {
      assert(false, "should be not acceptable when payed, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not acceptable when payed, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    });
  });

  it("should be refusable only if state == Created", function() {
    var invoice1;
    var invoice2;
    var invoice3;
    var invoice4;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.accept({from:buyer});
    }).then(function() {
      return invoice1.refuse({from:buyer});
    }).then(function() {
      assert(false, "should be not refusable when accepted, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not refusable when accepted, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.refuse({from:buyer});
    }).then(function() {
      return invoice2.refuse({from:buyer});
    }).then(function() {
      assert(false, "should be not refusable when refused, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not refusable when refused, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.abort({from:seller});
    }).then(function() {
      return invoice3.refuse({from:buyer});
    }).then(function() {
      assert(false, "should be not refusable when aborted, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not refusable when aborted, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice4 = instance;
      return invoice4.accept({from:buyer});
    }).then(function() {
      return invoice4.pay({from:buyer,value:amount});
    }).then(function() {
      return invoice4.refuse({from:buyer});
    }).then(function() {
      assert(false, "should be not refusable when payed, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not refusable when payed, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    });
  });

  it("should be abortable only if state == Created", function() {
    var invoice1;
    var invoice2;
    var invoice3;
    var invoice4;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.accept({from:buyer});
    }).then(function() {
      return invoice1.abort({from:seller});
    }).then(function() {
      assert(false, "should be not abortable when accepted, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not abortable when accepted, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.refuse({from:buyer});
    }).then(function() {
      return invoice2.abort({from:seller});
    }).then(function() {
      assert(false, "should be not abortable when refused, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not abortable when refused, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.abort({from:seller});
    }).then(function() {
      return invoice3.abort({from:seller});
    }).then(function() {
      assert(false, "should be not abortable when aborted, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not abortable when aborted, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice4 = instance;
      return invoice4.accept({from:buyer});
    }).then(function() {
      return invoice4.pay({from:buyer,value:amount});
    }).then(function() {
      return invoice4.abort({from:seller});
    }).then(function() {
      assert(false, "should be not abortable when payed, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not abortable when payed, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    });
  });

  it("should be payable only if state == Accepted", function() {
    var invoice1;
    var invoice2;
    var invoice3;
    var invoice4;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.pay({from:buyer, value:amount});
    }).then(function() {
      assert(false, "should be not payable when created, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not payable when created, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.refuse({from:buyer});
    }).then(function() {
      return invoice2.pay({from:buyer, value:amount});
    }).then(function() {
      assert(false, "should be not payable when refused, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not payable when refused, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.abort({from:seller});
    }).then(function() {
      return invoice3.pay({from:buyer, value:amount});
    }).then(function() {
      assert(false, "should be not payable when aborted, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not payable when aborted, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice4 = instance;
      return invoice4.accept({from:buyer});
    }).then(function() {
      return invoice4.pay({from:buyer,value:amount});
    }).then(function() {
      return invoice4.pay({from:buyer,value:amount});
    }).then(function() {
      assert(false, "should be not payable when payed, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: should be not payable when payed, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    });
  });
  // ---------------------------------------------------------

  // payment with right amount -------------------------------
  it("should be pay not be call without amount", function() {
    var invoice1;
    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.accept({from:buyer});
    }).then(function() {
      return invoice1.pay({from:buyer});
    }).then(function() {
      assert(false, "amount not provided, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount not provided, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    });
  });

  it("should be payable with the right amount", function() {
    var invoice1;
    var invoice2;
    var invoice3;
    var invoice4;
    var invoice5;
    var invoice6;
    var invoice7;
    var invoice8;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.accept({from:buyer});
    }).then(function() {
      return invoice1.pay({from:buyer, amount:0});
    }).then(function() {
      assert(false, "amount zero, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount zero, throw was expected" ) {  
       throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice2 = instance;
      return invoice2.accept({from:buyer});
    }).then(function() {
      return invoice2.pay({from:buyer, amount:amount-1});
    }).then(function() {
      assert(false, "amount lower, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount lower, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice3 = instance;
      return invoice3.accept({from:buyer});
    }).then(function() {
      return invoice3.pay({from:buyer, amount:amount+1});
    }).then(function() {
      assert(false, "amount upper, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount upper, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice4 = instance;
      return invoice4.accept({from:buyer});
    }).then(function() {
      return invoice4.pay({from:buyer, amount:Infinity});
    }).then(function() {
      assert(false, "amount +Infinity, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount +Infinity, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice5 = instance;
      return invoice5.accept({from:buyer});
    }).then(function() {
      return invoice5.pay({from:buyer, amount:-Infinity});
    }).then(function() {
      assert(false, "amount -Infinity, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount -Infinity, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice6 = instance;
      return invoice6.accept({from:buyer});
    }).then(function() {
      return invoice6.pay({from:buyer, amount:-0});
    }).then(function() {
      assert(false, "amount -0, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount -0, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice7 = instance;
      return invoice7.accept({from:buyer});
    }).then(function() {
      return invoice7.pay({from:buyer, amount:-1});
    }).then(function() {
      assert(false, "amount -1, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount -1, throw was expected" ) {  
        throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    })

    && Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice8 = instance;
      return invoice8.accept({from:buyer});
    }).then(function() {
      return invoice8.pay({from:buyer, amount:-amount});
    }).then(function() {
      assert(false, "amount -amount, throw was expected");
    }).catch(function(error) {
      if( error.toString() == "AssertionError: amount -amount, throw was expected" ) {  
       throw error;
      } else if(error.toString().indexOf("invalid opcode") == -1) {
        assert(false, error.toString());
      } 
    });
  });
  // ---------------------------------------------------------



  // tell me the money go to the right place ------------------
  it("should be give the money to seller from buyer", function() {
    var invoice1;
    var balance_invoice1;
    var balance_seller;
    var balance_buyer;

    return Invoice.new(buyer, amount, {from:seller}).then(function(instance) {
      invoice1 = instance;
      return invoice1.accept({from:buyer});
    }).then(function() {

      balance_seller = parseInt(web3.eth.getBalance(seller));
      balance_buyer = parseInt(web3.eth.getBalance(buyer));

      return invoice1.pay({from:buyer,value:amount});      
    }).then(function() {
      var new_balance_invoice1 = parseInt(web3.eth.getBalance(invoice1.address));
      var new_balance_seller = parseInt(web3.eth.getBalance(seller));
      var new_balance_buyer = parseInt(web3.eth.getBalance(buyer));

      assert.equal(new_balance_invoice1.valueOf(), 0, "invoice balance should be 0");
      assert.equal(new_balance_seller.valueOf(), balance_seller+amount, "seller balance should be increment by amount");
      assert.isTrue(new_balance_buyer.valueOf()<=balance_buyer-amount, "buyer balance should be decrease by amount + gas cost");

      return true;
    });
  });
  // ----------------------------------------------------------

  */
});
