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
    }
    // index of the Request in the mapping
    uint public numRequests; //should be replaced by something else (hash?)

    // mapping of all the Requests
    mapping(uint => Request) public requests;

    // events of request
    event LogRequestCreated(uint requestID, address payee, address payer);
    event LogRequestAccepted(uint requestID);
    event LogRequestDeclined(uint requestID);
    event LogRequestCanceled(uint requestID);
    event LogRequestPayment(uint requestID, uint amountPaid);
    event LogRequestRefunded(uint requestID, uint amountRefunded);
    event LogRequestCompleted(uint requestID);


    // contract constructor
    function RequestCore() Administrable() {
        numRequests = 1;
    }

    // create an Request
    function createRequest(address _payee, address _payer, uint _amountExpected) 
        systemIsWorking 
        isTrustedContract(msg.sender)
        returns (uint) 
    {
        uint requestID = numRequests++; // get the current num as ID and increment it
        requests[requestID] = Request(_payee, _payer, _amountExpected, msg.sender, 0, 0, State.Created); // create Request
        LogRequestCreated(requestID, _payee, _payer); // we "publish" this Request - should we let _payer here?
        return requestID;
    }

    // the payer can accept an Request 
    function accept(uint _requestID) 
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.subContract==msg.sender); // only subContract can accept
        c.state = State.Accepted;
        LogRequestAccepted(_requestID);
    }
   
    // the payer can decline an Request
    function decline(uint _requestID)
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.subContract==msg.sender); // only subContract can decline
        c.state = State.Declined;
        LogRequestDeclined(_requestID);
    }


    // the payee can Cancel an Request if just creted
    function cancel(uint _requestID)
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.subContract==msg.sender); // only subContract can cancel
        c.state = State.Canceled;
        LogRequestCanceled(_requestID);
    }   

    // declare a payment
    function payment(uint _requestID, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestID];
        require(c.subContract==msg.sender); // only subContract can declare payment
        require(_amount > 0 && _amount+c.amountPaid > c.amountPaid && _amount+c.amountPaid <= c.amountExpected); // value must be greater than 0 and all the payments should not overpass the amountExpected

        c.amountPaid += _amount;
        LogRequestPayment(_requestID, _amount);

        if(c.amountPaid == c.amountExpected) {
            c.state = State.Completed;
            LogRequestComplete(_requestID);
        }
    }

    // declare a refund
    function refund(uint _requestID, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestID];
        require(c.subContract==msg.sender); // only subContract can declare refund
        require(_amount > 0 && _amount+c.amountRefunded > c.amountRefunded && _amount+c.amountRefunded <= c.amountPaid); // value must be greater than 0 and all the payments should not overpass the amountPaid

        c.amountRefunded += _amount;
        LogRequestRefunded(_requestID, _amount);
    }

    // request getters - each fields or each tuples
    function getPayee(uint _requestID)
        systemIsWorking
        returns(address)
    {
        return requests[_requestID].payee;
    }
    
    function getPayer(uint _requestID)
        systemIsWorking
        returns(address)
    {
        return requests[_requestID].payer;
    }
    
    function getAmountExpected(uint _requestID)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestID].amountExpected;
    }
    
    function getSubContract(uint _requestID)
        systemIsWorking
        returns(address)
    {
        return requests[_requestID].subContract;
    }
    
    function getAmountPaid(uint _requestID)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestID].amountPaid;
    }
      
    function getAmountRefunded(uint _requestID)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestID].amountRefunded;
    }

    function getState(uint _requestID)
        systemIsWorking
        returns(State)
    {
        return requests[_requestID].state;
    }
    
}

