pragma solidity ^0.4.11;

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract Invoices {
    // state of an invoice
    enum State { Created, Accepted, Refused, Payed, Aborted }

    // What is an invoice
    struct Invoice {
        address seller;
        address buyer;
        uint amount;
        State state;
    }
    // index of the invoice in the mapping
    uint numInvoices; //should be replaced by something else (hash?)

    // mapping of all the invoices
    mapping(uint => Invoice) public invoices;

    // contract admin (usefull?) for now only the creator 
    address public admin;

    // the events triggeagle
    event InvoiceCreated(uint invoiceID, address buyer);
    event InvoiceAccepted(uint invoiceID);
    event InvoiceRefused(uint invoiceID);
    event InvoiceAborted(uint invoiceID);
    event InvoicePayed(uint invoiceID);

    // contract constructor
    function Invoices() {
        admin = msg.sender;
        numInvoices = 0;
    }

    // create an invoice
    function createInvoice(address _buyer, uint _amount) returns (uint) {
        uint invoiceID = numInvoices++; // get the current num as ID and increment it
        invoices[invoiceID] = Invoice(msg.sender, _buyer, _amount, State.Created); // create invoice
        InvoiceCreated(invoiceID, _buyer); // we "publish" this invoice - should we let _buyer here?
        return invoiceID;
    }

    // the buyer can accept an invoice 
    function accept(uint invoiceID)
    {
        Invoice storage c = invoices[invoiceID];
        require(c.state==State.Created); // state must be created only
        require(c.buyer==msg.sender); // only buyer can accept
        c.state = State.Accepted;
        InvoiceAccepted(invoiceID);
    }
   
    // the buyer can refuse an invoice
    function refuse(uint invoiceID)
    {
        Invoice storage c = invoices[invoiceID];
        require(c.state==State.Created); // state must be created only
        require(c.buyer==msg.sender); // only buyer can refuse
        c.state = State.Refused;
        InvoiceRefused(invoiceID);
    }


    // the seller can abort an invoice if just creted
    function abort(uint invoiceID)
    {
        Invoice storage c = invoices[invoiceID];
        require(c.state==State.Created); // state must be created only
        require(c.seller==msg.sender); // only seller can abort
        c.state = State.Aborted;
        InvoiceAborted(invoiceID);
    }   

    // The buyer pay the invoice - the invoice pay the seller
    function pay(uint invoiceID)
        payable
    {
        Invoice storage c = invoices[invoiceID];
        require(c.state==State.Accepted); // state must be accepted only
        require(c.buyer==msg.sender); // only buyer can pay
        require(msg.value == c.amount); // amount must be right

        c.seller.transfer(c.amount);
        c.state = State.Payed;
        InvoicePayed(invoiceID);
    }

}