pragma solidity 0.4.11;

contract Invoice {
    uint public amount;

    address public seller;
    address public buyer;
    enum State { Created, Accepted, Refused, Payed, Aborted }
    State public state;

    // the events triggeagle
    event InvoiceAccepted();
    event InvoiceRefused();
    event InvoicePayed();
    event InvoiceAborted();
    

    function Invoice(address _buyer, uint _amount) {
        seller = msg.sender;
        buyer = _buyer;
        amount = _amount;
    }

    // the buyer accept the invoice
    function accept()
       inState(State.Created)
       onlyBuyer
    {
        state = State.Accepted;
        InvoiceAccepted();
    }
    
    // the buyer refuse the invoice
    function refuse()
        inState(State.Created)
        onlyBuyer
    {
        state = State.Refused;
        InvoiceRefused();
    }
    
    // The buyer pay the invoice - the invoice pay the seller
    function pay()
        inState(State.Accepted)
        onlyBuyer
        condition(msg.value == amount)
        payable
    {
        state = State.Payed;
        seller.transfer(amount);
        InvoicePayed();
    }

    /// Abort the purchase and reclaim the ether.
    function abort()
        onlySeller
        inState(State.Created)
    {
        InvoiceAborted();
        state = State.Aborted;
    }    

    // check the state of the invoice
    modifier inState(State _state) {
        require(state == _state);
        _;
    }
    
    modifier condition(bool _condition) {
        require(_condition);
        _;
    }

    modifier onlyBuyer() {
        require(msg.sender == buyer);
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller);
        _;
    }
}