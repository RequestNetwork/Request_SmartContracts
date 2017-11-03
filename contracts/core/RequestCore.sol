pragma solidity 0.4.18;

import './Administrable.sol';
import '../base/math/SafeMath.sol';

/**
 * @title RequestCore
 *
 * @dev The Core is the main contract which store all the Requests.
 *
 * @dev The Core philosophy is to be as much flexible as possible to adapt in the future to any new system
 * @dev All the important conditions and an important part of the business logic takes place in the subcontracts.
 * @dev Requests can only be created in the subcontracts
 * @dev Subcontracts have to be allowed by the Core and respect the business logic.
 * @dev Request Network will develop one subcontracts per currency and anyone can creates its own subcontracts.
 */
contract RequestCore is Administrable {
    using SafeMath for uint;

    enum State { Created, Accepted, Declined, Canceled }

    struct Request {
        address creator;
        address payee;
        address payer;
        uint amountInitial;
        address subContract;
        uint amountPaid;
        uint amountAdditional;
        uint amountSubtract;
        State state;
        address extension;
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
    function RequestCore() 
        public
    {
        numRequests = 0;
    }

    /*
     * @dev Function used by Subcontracts to create a request in the Core
     * @param _creator Request creator
     * @param _payee Entity which will receive the payment
     * @param _payer Entity supposed to pay
     * @param _amountInitial Initial amount initial to be received. This amount can't be changed.
     * @param _extension an extension can be linked to a request and allows advanced payments conditions such as escrow. Extensions have to be whitelisted in Core
     * @return Returns the id of the request 
     */   
    function createRequest(address _creator, address _payee, address _payer, uint _amountInitial, address _extension) 
        public
        whenNotPaused 
        isTrustedContract(msg.sender)
        isTrustedExtension(_extension)
        returns (uint) 
    {
        require(isParametersValidForFutureRequest(_creator, _payee, _payer, _amountInitial));
        numRequests = numRequests.add(1); 
        requests[numRequests] = Request(_creator, _payee, _payer, _amountInitial, msg.sender, 0, 0, 0, State.Created, _extension); 

        Created(numRequests, _payee, _payer);
        return numRequests;
    }

    /*
     * @dev Function used by Subcontracts to accept a request in the Core. A request accepted is recognized by the payer as legit
     * @param _requestId Request id
     */ 
    function accept(uint _requestId) 
        public
        whenNotPaused
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 
        r.state = State.Accepted;
        Accepted(_requestId);
    }

    /*
     * @dev Function used by Subcontracts to decline a request in the Core. A request declined is recognized by the payer as not legit and might be spam
     * @param _requestId Request id
     */ 
    function decline(uint _requestId)
        public
        whenNotPaused
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 
        r.state = State.Declined;
        Declined(_requestId);
    }

    /*
     * @dev Function used by Subcontracts to cancel a request in the Core. Several reasons can lead to cancel a reason, see request life cycle for more info.
     * @param _requestId Request id
     */ 
    function cancel(uint _requestId)
        public
        whenNotPaused
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);
        require(r.amountPaid==0); // only Request with balance null can be canceled
        r.state = State.Canceled;
        Canceled(_requestId);
    }   

    /*
     * @dev Function used by Subcontracts to declare a payment in the Core. The subcontract guarantee that the request was paid for a specific amount
     * @param _requestId Request id
     * @param _amount amount paid
     */ 
    function payment(uint _requestId, uint _amount)
        public
        whenNotPaused
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 

        r.amountPaid = r.amountPaid.add(_amount);

        Payment(_requestId, _amount);
    }

    /*
     * @dev Function used by Subcontracts to declare a refund in the Core. A refund is initiated by the payee to the payer and decrease the amount paid in the request
     * @param _requestId Request id
     * @param _amount amount refunded
     */ 
    function refund(uint _requestId, uint _amount)
        public
        whenNotPaused
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 

        r.amountPaid = r.amountPaid.sub(_amount);

        Refunded(_requestId, _amount);
    }

    /*
     * @dev Function used by Subcontracts to add an additional amount to pay to the request. The amount initial can not be changed but a tips, a  penalty or several reason can lead to a request being paid an additional
     * @param _requestId Request id
     * @param _amount additional amount
     */ 
    function addAdditional(uint _requestId, uint _amount)
        public
        whenNotPaused
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 

        r.amountAdditional = r.amountAdditional.add(_amount);

        require(r.amountAdditional+r.amountInitial >= r.amountInitial); // avoid overflow

        AddAdditional(_requestId, _amount);
    }

    /*
     * @dev Function used by Subcontracts to add a Substract amount to the request. A substract lead to a lower payment needed for the request. It can happens for several reasons including credit note, discount, reimbursement.
     * @param _requestId Request id
     * @param _amount subtract amount
     */ 
    function addSubtract(uint _requestId, uint _amount)
        public
        whenNotPaused
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);

        r.amountSubtract = r.amountSubtract.add(_amount);

        require(r.amountInitial-r.amountSubtract <= r.amountInitial); // avoid underflow

        AddSubtract(_requestId, _amount);
    }



    /*
     * @dev Get payee of a request
     * @param _requestId Request id
     * @return payee address
     */ 
    function getPayee(uint _requestId)
        public
        constant
        returns(address)
    {
        return requests[_requestId].payee;
    }

    /*
     * @dev Get payer of a request
     * @param _requestId Request id
     * @return payer address
     */ 
    function getPayer(uint _requestId)
        public
        constant
        returns(address)
    {
        return requests[_requestId].payer;
    }

    /*
     * @dev Get amount initial of a request
     * @param _requestId Request id
     * @return amount initial
     */     
    function getAmountInitial(uint _requestId)
        public
        constant
        returns(uint)
    {
        return requests[_requestId].amountInitial;
    }

    /*
     * @dev Get amount initial of a request plus additional and minus subtract
     * @param _requestId Request id
     * @return amount initial plus additional and minus subtract
     */ 
    function getAmountInitialAfterSubAdd(uint _requestId)
        public
        constant
        returns(uint)
    {
        return requests[_requestId].amountInitial.add(requests[_requestId].amountAdditional).sub(requests[_requestId].amountSubtract);
    }

    /*
     * @dev Get subContract of a request
     * @param _requestId Request id
     * @return subContract address
     */
    function getSubContract(uint _requestId)
        public
        constant
        returns(address)
    {
        return requests[_requestId].subContract;
    }

    /*
     * @dev Get amount paid of a request
     * @param _requestId Request id
     * @return amount paid
     */     
    function getAmountPaid(uint _requestId)
        public
        constant
        returns(uint)
    {
        return requests[_requestId].amountPaid;
    }

    /*
     * @dev Get amount additional of a request
     * @param _requestId Request id
     * @return amount additional
     */ 
    function getAmountAdditional(uint _requestId)
        public
        constant
        returns(uint)
    {
        return requests[_requestId].amountAdditional;
    }

    /*
     * @dev Get amount subtract of a request
     * @param _requestId Request id
     * @return amount subtract
     */ 
    function getAmountSubtract(uint _requestId)
        public
        constant
        returns(uint)
    {
        return requests[_requestId].amountSubtract;
    }

    /*
     * @dev Get state of a request
     * @param _requestId Request id
     * @return state
     */ 
    function getState(uint _requestId)
        public
        constant
        returns(State)
    {
        return requests[_requestId].state;
    }

    /*
     * @dev Get extension of a request
     * @param _requestId Request id
     * @return address
     */
    function getExtension(uint _requestId)
        public
        constant
        returns(address)
    {
        return requests[_requestId].extension;
    } 

    /*
     * @dev Check parameters before creating a request
     * @param _creator Request
     * @param _payee future payee
     * @param _payer future payer
     * @param _amountInitial future amount initial
     */
    function isParametersValidForFutureRequest(address _creator, address _payee, address _payer, uint _amountInitial) 
        pure
        internal
        returns(bool)
    {
        return _creator!=0 && _payee!=0 && _payer!=0 && _payee!=_payer && _amountInitial!=0;
    }
}