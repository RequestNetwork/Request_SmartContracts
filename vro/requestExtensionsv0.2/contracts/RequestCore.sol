pragma solidity ^0.4.11;

import './Administrable.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestCore is Administrable{

    // state of an RequestgetSystemState
    enum State { Created, Accepted, Declined, Completed, Canceled }

    // What is an Request
    struct Request {
        address payee;
        address payer;
        uint amountExpected;
        address subContract;
        uint amountPaid;
        uint amountRefunded;
        State state;
        address[10] extensions;
    }
    // index of the Request in the mapping
    uint public numRequests; //should be replaced by something else (hash?)

    // mapping of all the Requests
    mapping(uint => Request) public requests;

    // events of request
    event LogRequestCreated(uint requestId, address payee, address payer);
    event LogRequestAccepted(uint requestId);
    event LogRequestDeclined(uint requestId);
    event LogRequestCanceled(uint requestId);
    event LogRequestPayment(uint requestId, uint amountPaid);
    event LogRequestRefunded(uint requestId, uint amountRefunded);
    event LogRequestCompleted(uint requestId);


    // contract constructor
    function RequestCore() Administrable() {
        numRequests = 1;
    }

    // create an Request
    function createRequest(address _payee, address _payer, uint _amountExpected, address[10] _extensions) 
        systemIsWorking 
        isTrustedContract(msg.sender)
        areTrustedExtensions(_extensions)
        returns (uint) 
    {
        uint requestId = numRequests++; // get the current num as ID and increment it
        requests[requestId] = Request(_payee, _payer, _amountExpected, msg.sender, 0, 0, State.Created, _extensions); // create Request
        LogRequestCreated(requestId, _payee, _payer); // we "publish" this Request - should we let _payer here?
        return requestId;
    }

    // the payer can accept an Request 
    function accept(uint _requestId) 
        systemIsWorking
    {
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can accept
        c.state = State.Accepted;
        LogRequestAccepted(_requestId);
    }
   
    // the payer can decline an Request
    function decline(uint _requestId)
        systemIsWorking
    {
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can decline
        c.state = State.Declined;
        LogRequestDeclined(_requestId);
    }


    // the payee can Cancel an Request if just creted
    function cancel(uint _requestId)
        systemIsWorking
    {
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can cancel
        c.state = State.Canceled;
        LogRequestCanceled(_requestId);
    }   

    // declare a payment
    function payment(uint _requestId, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can declare payment
        require(_amount > 0 && _amount+c.amountPaid > c.amountPaid); // value must be greater than 0 and all the payments should not overpass the amountExpected

        c.amountPaid += _amount;
        LogRequestPayment(_requestId, _amount);

        if(c.amountPaid == c.amountExpected) {
            c.state = State.Completed;
            LogRequestCompleted(_requestId);
        }
    }

    // declare a refund
    function refund(uint _requestId, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can declare refund
        require(_amount > 0 && _amount+c.amountRefunded > c.amountRefunded); // value must be greater than 0 and all the payments should not overpass the amountPaid

        c.amountRefunded += _amount;
        LogRequestRefunded(_requestId, _amount);
    }

    // request getters - each fields or each tuples
    function getPayee(uint _requestId)
        systemIsWorking
        returns(address)
    {
        return requests[_requestId].payee;
    }
    
    function getPayer(uint _requestId)
        systemIsWorking
        returns(address)
    {
        return requests[_requestId].payer;
    }
    
    function getAmountExpected(uint _requestId)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestId].amountExpected;
    }
    
    function getSubContract(uint _requestId)
        systemIsWorking
        returns(address)
    {
        return requests[_requestId].subContract;
    }
    
    function getAmountPaid(uint _requestId)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestId].amountPaid;
    }
      
    function getAmountRefunded(uint _requestId)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestId].amountRefunded;
    }

    function getState(uint _requestId)
        systemIsWorking
        returns(State)
    {
        return requests[_requestId].state;
    }
   
    function getExtensions(uint _requestId)
        systemIsWorking
        returns(address[10])
    {
        return requests[_requestId].extensions;
    } 
}

