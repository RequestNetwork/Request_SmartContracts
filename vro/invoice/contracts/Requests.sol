pragma solidity ^0.4.11;


contract Administrable {
    // state of the system
    enum SystemState { Pause, Working, Deprecated }

    // Contract admin (usefull?) for now only the creator 
    address public trustedAdmin;

    // S1tate of this system
    SystemState public systemState;

    // Events of the system
    event LogSystemPaused();
    event LogSystemResumed();
    event LogSystemDeprecated();

    function Administrable() {
        trustedAdmin = msg.sender;
        systemState = SystemState.Pause;
    }

    // Admin function ----------------------
    // pause system by admin
    function adminPause()
    {
        require(trustedAdmin==msg.sender);
        require(systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Pause;
        LogSystemPaused();
    }

    // resume system by admin
    function adminResume()
    {
        require(trustedAdmin==msg.sender);
        require(systemState==SystemState.Pause || systemState==SystemState.Deprecated); // state must be created only
        systemState = SystemState.Working;
        LogSystemResumed();
    }

    // resume system by admin
    function adminDeprecate()
    {
        require(trustedAdmin==msg.sender);
        require(systemState==SystemState.Pause || systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Deprecated;
        LogSystemDeprecated();
    }
    
    // getter system
    function getSystemState() returns(SystemState) {
        return systemState;
    }
    
    // Modifier system
    modifier systemIsWorking() {
        require(systemState==SystemState.Working);
        _;
    }
}


// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract Requests is Administrable{

    // state of an Request
    enum State { Created, Accepted, Refused, Paid, Conflict, Completed, Canceled }

    // state of Conflict
    enum ConflictType { Nothing, Seller, Buyer, Unknown }

    // What is an Request
    struct Request {
        address seller;
        address buyer;
        uint amountExpected;
        address UntrustedSubContract;
        uint amountPaid;
        State state;
        ConflictType conflictType;
    }
    // index of the Request in the mapping
    uint public numRequests; //should be replaced by something else (hash?)

    // mapping of all the Requests
    mapping(uint => Request) public requests;

    // events of request
    event LogRequestCreated(uint requestID, address seller, address buyer);
    event LogRequestAccepted(uint requestID);
    event LogRequestRefused(uint requestID);
    event LogRequestCanceled(uint requestID);
    event LogRequestPayment(uint requestID, uint amountPaid);
    event LogRequestPaid(uint requestID);
    event LogRequestCompleted(uint requestID);
    event LogRequestConflict(uint requestID);


    // contract constructor
    function Requests() Administrable() {
        numRequests = 0;
    }

    // create an Request
    function createRequest(address _buyer, uint _amountExpected, address _untrustedSubContract) 
        systemIsWorking 
        returns (uint) 
    {
        uint requestID = numRequests++; // get the current num as ID and increment it
        requests[requestID] = Request(msg.sender, _buyer, _amountExpected, _untrustedSubContract==0?address(this):_untrustedSubContract, 0, State.Created, ConflictType.Nothing); // create Request
        LogRequestCreated(requestID, msg.sender, _buyer); // we "publish" this Request - should we let _buyer here?
        return requestID;
    }

    // the buyer can accept an Request 
    function accept(uint _requestID) 
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.state==State.Created); // state must be created only
        require(c.buyer==msg.sender); // only buyer can accept
        c.state = State.Accepted;
        LogRequestAccepted(_requestID);
    }
   
    // the buyer can refuse an Request
    function refuse(uint _requestID)
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.state==State.Created); // state must be created only
        require(c.buyer==msg.sender); // only buyer can refuse
        c.state = State.Refused;
        LogRequestRefused(_requestID);
    }


    // the seller can Cancel an Request if just creted
    function cancel(uint _requestID)
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.state==State.Created); // state must be created only
        require(c.seller==msg.sender || c.UntrustedSubContract==msg.sender); // only seller can Cancel or subContract
        c.state = State.Canceled;
        LogRequestCanceled(_requestID);
    }   

        // Function for basic ethereum transacton
    // The buyer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function pay(uint _requestID)
        systemIsWorking
        payable
    {
        Request storage c = requests[_requestID];
        require(c.UntrustedSubContract==address(this)); // only if no subContract, the buyer can pay in ether
        require(c.state==State.Accepted); // state must be accepted only
        require(c.buyer==msg.sender); // only buyer can pay
        // TODO: Someone can force amount on the contract and it can occur mispayment replace "<=" by a mechanism of reimboursment (?)
        require(msg.value > 0 && msg.value+c.amountPaid > c.amountPaid && msg.value+c.amountPaid <= c.amountExpected); // value must be greater than 0 and all the payments should not overpass the amountExpected

        payment(_requestID, msg.value);
    }

    // The buyer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw(uint _requestID)
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.UntrustedSubContract==address(this)); // only if no subContract, the buyer can pay in ether
        require(c.state==State.Paid); // state must be accepted only
        require(c.seller==msg.sender); // only buyer can pay

        complete(_requestID);

        // can be maliciously failed by c.seller
        c.seller.transfer(c.amountPaid);
    }


        // SubContract function ----------------------
    function payment(uint _requestID, uint _amount)
        systemIsWorking
    {   
        Request storage c = requests[_requestID];
        require(c.UntrustedSubContract==msg.sender || (c.UntrustedSubContract==address(this) && msg.sender==c.buyer)); // only subContract can manage this
        require(c.state==State.Accepted); // state must be accepted only
        require(_amount > 0 && _amount+c.amountPaid > c.amountPaid && _amount+c.amountPaid <= c.amountExpected); // value must be greater than 0 and all the payments should not overpass the amountExpected

        c.amountPaid += _amount;
        LogRequestPayment(_requestID, _amount);

        if(c.amountPaid == c.amountExpected) {
            c.state = State.Paid;
            LogRequestPaid(_requestID);
        }
    }
    
    function conflict(uint _requestID, ConflictType _conflict)
        systemIsWorking
    {   
        Request storage c = requests[_requestID];
        require(c.UntrustedSubContract==msg.sender); // only subContract can manage this
        require(c.state==State.Accepted || c.state==State.Paid || c.state==State.Conflict); // state must be accepted or paid or conflict only
        c.conflictType = _conflict;
        c.state=State.Conflict;
        LogRequestConflict(_requestID);
    }

    function complete(uint _requestID) 
        systemIsWorking
    {
        Request storage c = requests[_requestID];
        require(c.UntrustedSubContract==msg.sender || (c.UntrustedSubContract==address(this) && msg.sender==c.seller)); // only subContract can manage this
        require(c.state==State.Paid || c.state==State.Conflict); // state must be paid or conflict only
        c.state=State.Completed;
        LogRequestCompleted(_requestID);
    }
 
    // request getters
    function getSeller(uint _requestID)
        systemIsWorking
        returns(address)
    {
        return requests[_requestID].seller;
    }
    
    function getBuyer(uint _requestID)
        systemIsWorking
        returns(address)
    {
        return requests[_requestID].buyer;
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
        return requests[_requestID].UntrustedSubContract;
    }
    
    function getAmountPaid(uint _requestID)
        systemIsWorking
        returns(uint)
    {
        return requests[_requestID].amountPaid;
    }
      
    function getState(uint _requestID)
        systemIsWorking
        returns(State)
    {
        return requests[_requestID].state;
    }
          
    function getConflictType(uint _requestID)
        systemIsWorking
        returns(ConflictType)
    {
        return requests[_requestID].conflictType;
    }
    
}

