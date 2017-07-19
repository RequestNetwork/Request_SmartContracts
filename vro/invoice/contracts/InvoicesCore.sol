pragma solidity ^0.4.11;

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract Requests {
    // state of the system
    enum SystemState { Pause, Working, Deprecated }

    // state of an Request
    enum State { Created, Accepted, Refused, Conflict, Completed, Cancel }

    // state of Conflict
    enum ConflictType { Nothing, Seller, Buyer, Unknown }

    // What is an Request
    struct Request {
        address seller;
        address buyer;
        uint amountExpected;
        address subContract;
        uint amountPaid;
        State state;
        ConflictType conflictType;
    }
    // index of the Request in the mapping
    uint numRequests; //should be replaced by something else (hash?)

    // mapping of all the Requests
    mapping(uint => Request) public Requests;

    // contract admin (usefull?) for now only the creator 
    address public admin;

    // state of this system
    SystemState public systemState;

    // events of request
    event RequestCreated(uint requestID, address seller, address buyer);
    event RequestAccepted(uint requestID);
    event RequestRefused(uint requestID);
    event RequestCanceled(uint requestID);
    event RequestPayment(uint requestID, uint amountPaid);
    event RequestCompleted(uint requestID);
    event RequestConflict(uint requestID);

    // events of the system
    event SystemPaused();
    event SystemResumed();
    event SystemDeprecated();

    // contract constructor
    function Requests() {
        admin = msg.sender;
        numRequests = 0;
    }

    // create an Request
    function createRequest(address _buyer, uint _amountExpected, address _subContract) returns (uint) {
        uint requestID = numRequests++; // get the current num as ID and increment it
        Requests[requestID] = Request(msg.sender, _buyer, _amountExpected, _subContract==0?address(this):_subContract, 0, State.Created, ConflictType.Nothing); // create Request
        RequestCreated(requestID, msg.sender, _buyer); // we "publish" this Request - should we let _buyer here?
        return requestID;
    }

    // the buyer can accept an Request 
    function accept(uint _requestID)
    {
        Request storage c = Requests[_requestID];
        require(c.state==State.Created); // state must be created only
        require(c.buyer==msg.sender); // only buyer can accept
        c.state = State.Accepted;
        RequestAccepted(_requestID);
    }
   
    // the buyer can refuse an Request
    function refuse(uint _requestID)
    {
        Request storage c = Requests[_requestID];
        require(c.state==State.Created); // state must be created only
        require(c.buyer==msg.sender); // only buyer can refuse
        c.state = State.Refused;
        RequestRefused(_requestID);
    }


    // the seller can Cancel an Request if just creted
    function Cancel(uint _requestID)
    {
        Request storage c = Requests[_requestID];
        require(c.state==State.Created); // state must be created only
        require(c.seller==msg.sender); // only seller can Cancel
        c.state = State.Canceled;
        RequestCanceled(_requestID);
    }   

    // The buyer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function pay(uint _requestID)
        payable
    {
        Request storage c = Requests[_requestID];
        require(c.subContract==address(this)); // only if no subContract, the buyer can pay in ether
        require(c.state==State.Accepted); // state must be accepted only
        require(c.buyer==msg.sender); // only buyer can pay
        require(msg.value > 0 && msg.value+c.amountPaid <= c.amountExpected); // value must be greater than 0 and all the payments should not overpass the amountExpected

        c.seller.transfer(msg.value);
        c.amountPaid += msg.value;
        payment(_requestID, msg.value);
    }


        // SubContract function ----------------------
    function payment(uint _requestID, uint _amount)
    {   
        Request storage c = Requests[_requestID];
        require(c.subContract==msg.sender); // only subContract can manage this
        require(c.state==State.Accepted); // state must be accepted only
        require(_amount > 0 && _amount+c.amountPaid <= c.amountExpected); // value must be greater than 0 and all the payments should not overpass the amountExpected

        c.amountPaid += _amount;

        RequestPayment(_requestID, _amount);

        if(_amount+c.amountPaid == c.amountExpected) {
            c.state = State.Completed;
            RequestCompleted(_requestID);
        }
    }

    function conflict(uint _requestID, ConflictType _conflict)
    {   
        Request storage c = Requests[_requestID];
        require(c.subContract==msg.sender); // only subContract can manage this
        require(c.state==State.Accepted); // state must be accepted only
        c.conflictType = _conflict
        c.state=State.Conflict;
        RequestConflict(_requestID);
    }


        // Admin function ----------------------
    // pause system by admin
    function adminPause()
    {
        require(admin==msg.sender);
        require(systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Pause;
        SystemPaused();
    }

    // resume system by admin
    function adminResume()
    {
        require(admin==msg.sender);
        require(systemState==SystemState.Pause || systemState==SystemState.Deprecated); // state must be created only
        systemState = SystemState.Working;
        SystemResumed();
    }

    // resume system by admin
    function adminDeprecate()
    {
        require(admin==msg.sender);
        require(systemState==SystemState.Pause || systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Deprecated;
        SystemDeprecated();
    }
}