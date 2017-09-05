/*

The Core is the main contract which store all the Requests. 
The Core philosophy is to be as much flexible as possible to adapt in the future to any new system
All the important conditions and an important part of the business logic takes place in the subcontracts.
Requests can only be created in the subcontracts
Subcontracts have to be allowed by the Core and respect the business logic.
Request Network will develop one subcontracts per currency and anyone can creates its own subcontracts.

*/


pragma solidity ^0.4.11;

import './Administrable.sol';

contract RequestCore is Administrable{


    enum State { Created, Accepted, Declined, Canceled }

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
    uint public numRequests; 
    
    // mapping of all the Requests
    mapping(uint => Request) public requests;

    /*
     *  Events 
     */
    event Created(uint requestId, address payee, address payer);
    event Accepted(uint requestId);
    event Declined(uint requestId);
    event Canceled(uint requestId);
    event Payment(uint requestId, uint amountPaid);
    event Refunded(uint requestId, uint amountRefunded);
    event AddAdditional(uint requestId, uint amountAdded);
    event AddSubtract(uint requestId, uint amountSubtracted);


    /*
     *  Constructor 
     */
    function RequestCore() Administrable() {
        numRequests = 1;
    }

    /*
     *  Public functions
     */
    /// @dev Fonction used by Subcontracts to create a request in the Core
    /// @param _creator Request creator
    /// @param _payee Entity which will receive the payment
    /// @param _payer Entity supposed to pay
    /// @param _amountExpected Initial amount expected to be received. This amount can't be changed.
    /// @param _extensions Up to 3 extensions can be linked to a request and allows advanced payments conditions such as escrow. Extensions have to be whitelisted in Core
    /// @return Returns the id of the request    
    function createRequest(address _creator, address _payee, address _payer, uint _amountExpected, address[3] _extensions) 
        systemIsActive 
        isTrustedContract(msg.sender)
        areTrustedExtensions(_extensions)
        checkActorsAmount(_creator, _payee, _payer, _amountExpected)
        returns (uint) 
    {
        uint requestId = numRequests++; 
        requests[requestId] = Request(_creator, _payee, _payer, _amountExpected, msg.sender, 0, 0, 0, State.Created, _extensions); 

        Created(requestId, _payee, _payer);
        return requestId;
    }

    /// @dev Fonction used by Subcontracts to accept a request in the Core. A request accepted is recognized by the payer as legit
    function accept(uint _requestId) 
        systemIsActive
    {
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); 
        c.state = State.Accepted;
        Accepted(_requestId);
    }
   
   /// @dev Fonction used by Subcontracts to decline a request in the Core. A request declined is recognized by the payer as not legit and might be spam
    function decline(uint _requestId)
        systemIsActive
    {
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); 
        c.state = State.Declined;
        Declined(_requestId);
    }

    /// @dev Fonction used by Subcontracts to cancel a request in the Core. Several reasons can lead to cancel a reason, see request life cycle for more info.
    function cancel(uint _requestId)
        systemIsActive
    {
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender);
        require(c.amountPaid==0); // only Request with balance null can be canceled
        c.state = State.Canceled;
        Canceled(_requestId);
    }   


    /// @dev Fonction used by Subcontracts to declare a payment in the Core. The subcontract guarantee that the request was paid for a specific amount
    function payment(uint _requestId, uint _amount)
        systemIsActive
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); 
        require(_amount+c.amountPaid >= c.amountPaid); // avoid overflow

        c.amountPaid += _amount;
        Payment(_requestId, _amount);
    }

    /// @dev Fonction used by Subcontracts to declare a refund in the Core. A refund is initiated by the payee to the payer and decrease the amount paid in the request
    function refund(uint _requestId, uint _amount)
        systemIsActive
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); 
        require(c.amountPaid-_amount <= c.amountPaid); // avoid overflow

        c.amountPaid -= _amount;
        Refunded(_requestId, _amount);
    }

    /// @dev Fonction used by Subcontracts to add an additional amount to pay to the request. The amount expected can not be changed but a tips, a  penalty or several reason can lead to a request being paid an additional
    function addAdditional(uint _requestId, uint _amount)
        systemIsActive
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender); 
        require(c.amountAdditional+_amount >= c.amountAdditional); // avoid overflow
        require(c.amountAdditional+_amount+c.amountExpected >= c.amountExpected); // avoid overflow BIS - TODO USELESS ?

        c.amountAdditional += _amount;
        AddAdditional(_requestId, _amount);
    }

    /// @dev Fonction used by Subcontracts to add a Substract amount to the request. A substract lead to a lower payment needed for the request. It can happens for several reasons including credit note, discount, reimbursement.
    function addSubtract(uint _requestId, uint _amount)
        systemIsActive
    {   
        Request storage c = requests[_requestId];
        require(c.subContract==msg.sender);
        require(c.amountSubtract+_amount >= c.amountSubtract); // avoid overflow
        require(_amount+c.amountSubtract <= c.amountExpected); // avoid overflow BIS - TODO USELESS ?

        c.amountSubtract += _amount;
        AddSubtract(_requestId, _amount);
    }

    /*
     *  Getters & Setters
     */
    function getPayee(uint _requestId)
        systemIsActive
        returns(address)
    {
        return requests[_requestId].payee;
    }
    
    function getPayer(uint _requestId)
        systemIsActive
        returns(address)
    {
        return requests[_requestId].payer;
    }
    
    function getAmountExpected(uint _requestId)
        systemIsActive
        returns(uint)
    {
        return requests[_requestId].amountExpected;
    }

    function getAmountExpectedAfterSubAdd(uint _requestId)
        systemIsActive
        returns(uint)
    {
        return requests[_requestId].amountExpected+requests[_requestId].amountAdditional-requests[_requestId].amountSubtract;
    }
    

    function getSubContract(uint _requestId)
        systemIsActive
        returns(address)
    {
        return requests[_requestId].subContract;
    }
    
    function getAmountPaid(uint _requestId)
        systemIsActive
        returns(uint)
    {
        return requests[_requestId].amountPaid;
    }
      
    function getAmountAdditional(uint _requestId)
        systemIsActive
        returns(uint)
    {
        return requests[_requestId].amountAdditional;
    }

    function getAmountSubtract(uint _requestId)
        systemIsActive
        returns(uint)
    {
        return requests[_requestId].amountSubtract;
    }

    function getState(uint _requestId)
        systemIsActive
        returns(State)
    {
        return requests[_requestId].state;
    }
   
    function getExtensions(uint _requestId)
        systemIsActive
        returns(address[3])
    {
        return requests[_requestId].extensions;
    } 


    modifier checkActorsAmount(address _creator, address _payee, address _payer, uint _amountExpected) {
        require(_creator!=0 && _payee!=0 && _payer!=0 && _payee!=_payer && _amountExpected!=0);
        _;
    }

}

