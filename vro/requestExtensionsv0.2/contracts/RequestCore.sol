pragma solidity ^0.4.11;

import './Administrable.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestCore is Administrable{

    // state of an RequestgetSystemState
    enum State { Created, Accepted, Declined, Canceled }

    // What is an Request
    struct Request {
        address creator;
        address payee;
        address payer;
        uint amountExpected;
        address subContract;
        uint amountPaid;
        uint amountAdditional;
        uint amountSubtract;
        State state;
        address[3] extensions;
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
    event LogRequestAddAdditional(uint requestId, uint amountAdded);
    event LogRequestAddSubtract(uint requestId, uint amountSubtracted);


    // contract constructor
    function RequestCore() Administrable() {
        numRequests = 1;
    }

    // create an Request
    function createRequest(address _creator, address _payee, address _payer, uint _amountExpected, address[3] _extensions) 
        systemIsWorking 
        isTrustedContract(msg.sender)
        areTrustedExtensions(_extensions)
        checkActorsAmount(_creator, _payee, _payer, _amountExpected)
        returns (uint) 
    {
        uint requestId = numRequests++; // get the current num as ID and increment it
        requests[requestId] = Request(_creator, _payee, _payer, _amountExpected, msg.sender, 0, 0, 0, State.Created, _extensions); // create Request

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
        require(_amount+c.amountPaid >= c.amountPaid); // all the payments should not overpass the amountExpected

        c.amountPaid += _amount;
        LogRequestPayment(_requestId, _amount);
    }

    // declare a refund
    function refund(uint _requestId, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can declare refund
        require(c.amountPaid-_amount <= c.amountPaid); // all the payments should not overpass the amountPaid

        c.amountPaid -= _amount;
        LogRequestRefunded(_requestId, _amount);
    }

    // declare a addtional
    function addAdditional(uint _requestId, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can declare refund
        require(c.amountAdditional+_amount >= c.amountAdditional); // avoid overflow
        require(c.amountAdditional+_amount+c.amountExpected >= c.amountExpected); // avoid overflow BIS - TODO USELESS ?

        c.amountAdditional += _amount;
        LogRequestAddAdditional(_requestId, _amount);
    }

    // declare a subract
    function addSubtract(uint _requestId, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); // only subContract can declare refund
        require(c.amountSubtract+_amount >= c.amountSubtract); // avoid overflow
        require(_amount+c.amountSubtract <= c.amountExpected); // avoid overflow BIS - TODO USELESS ?

        c.amountSubtract += _amount;
        LogRequestAddSubtract(_requestId, _amount);
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
      
    function getAmountAdditional(uint _requestId)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestId].amountAdditional;
    }

    function getAmountSubtract(uint _requestId)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestId].amountSubtract;
    }

    function getState(uint _requestId)
        systemIsWorking
        returns(State)
    {
        return requests[_requestId].state;
    }
   
    function getExtensions(uint _requestId)
        systemIsWorking
        returns(address[3])
    {
        return requests[_requestId].extensions;
    } 


    modifier checkActorsAmount(address creator, address payee, address payer, uint amountExpected) {
        require(creator!=0 && payee!=0 && payer!=0 && payee!=payer && amountExpected!=0);
        _;
    }

}

