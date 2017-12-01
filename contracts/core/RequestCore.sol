pragma solidity 0.4.18;

import './Administrable.sol';
import '../base/math/SafeMath.sol';
import '../base/math/SafeMathInt.sol';

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
    // current version of the core
    uint32 public constant VERSION = 1;

    using SafeMath for uint256;
    using SafeMathInt for int256;

    enum State { Created, Accepted, Canceled }

    struct Request {
        address creator;
        address payee;
        address payer;
        int256 amountExpected;
        address subContract;
        int256 balance;
        State state;
        address extension;
        string details;
    }

    // index of the Request in the mapping
    uint256 public numRequests; 
    
    // mapping of all the Requests
    mapping(bytes32 => Request) public requests;

    /*
     *  Events 
     */
    event Created(bytes32 requestId, address payee, address payer);
    event Accepted(bytes32 requestId);
    event Canceled(bytes32 requestId);
    event Payment(bytes32 requestId, uint256 amountPaid);
    event Refunded(bytes32 requestId, uint256 amountRefunded);
    event AddAdditional(bytes32 requestId, uint256 amountAdded);
    event AddSubtract(bytes32 requestId, uint256 amountSubtracted);

    event NewPayee(bytes32 requestId, address payee);
    event NewPayer(bytes32 requestId, address payer);
    event NewAmountExpected(bytes32 requestId, int256 amountExpected);
    event NewExtension(bytes32 requestId, address extension);
    event NewDetails(bytes32 requestId, string details);

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
     * @param _amountExpected Initial amount initial to be received. This amount can't be changed.
     * @param _extension an extension can be linked to a request and allows advanced payments conditions such as escrow. Extensions have to be whitelisted in Core
     * @return Returns the id of the request 
     */   
    function createRequest(address _creator, address _payee, address _payer, int256 _amountExpected, address _extension, string _details) 
        external
        whenNotPaused 
        isTrustedContract(msg.sender)
        isTrustedExtension(_extension)
        creatorNotZero(_creator)
        returns (bytes32 requestId) 
    {
        numRequests = numRequests.add(1);
        requestId = keccak256(numRequests,VERSION);

        requests[requestId] = Request(_creator, _payee, _payer, _amountExpected, msg.sender, 0, State.Created, _extension, _details); 

        Created(requestId, _payee, _payer);
        return requestId;
    }

    /*
     * @dev Function used by Subcontracts to accept a request in the Core. A request accepted is recognized by the payer as legit
     * @param _requestId Request id
     */ 
    function accept(bytes32 _requestId) 
        external
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 
        r.state = State.Accepted;
        Accepted(_requestId);
    }

    /*
     * @dev Function used by Subcontracts to cancel a request in the Core. Several reasons can lead to cancel a reason, see request life cycle for more info.
     * @param _requestId Request id
     */ 
    function cancel(bytes32 _requestId)
        external
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);

        r.state = State.Canceled;
        Canceled(_requestId);
    }   

    /*
     * @dev Function used by Subcontracts to declare a payment in the Core. The subcontract guarantee that the request was paid for a specific amount
     * @param _requestId Request id
     * @param _amount amount paid
     */ 
    function payment(bytes32 _requestId, uint256 _amount)
        external
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 

        r.balance = r.balance.add(_amount.toInt256Safe());

        Payment(_requestId, _amount);
    }

    /*
     * @dev Function used by Subcontracts to declare a refund in the Core. A refund is initiated by the payee to the payer and decrease the amount paid in the request
     * @param _requestId Request id
     * @param _amount amount refunded
     */ 
    function refund(bytes32 _requestId, uint256 _amount)
        external
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 

        r.balance = r.balance.sub(_amount.toInt256Safe());

        Refunded(_requestId, _amount);
    }

    /*
     * @dev Function used by Subcontracts to add an additional amount to pay to the request. The amount initial can not be changed but a tips, a  penalty or several reason can lead to a request being paid an additional
     * @param _requestId Request id
     * @param _amount additional amount
     */ 
    function addAdditional(bytes32 _requestId, uint256 _amount)
        external
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender); 

        r.amountExpected = r.amountExpected.add(_amount.toInt256Safe());

        AddAdditional(_requestId, _amount);
    }

    /*
     * @dev Function used by Subcontracts to add a Substract amount to the request. A substract lead to a lower payment needed for the request. It can happens for several reasons including credit note, discount, reimbursement.
     * @param _requestId Request id
     * @param _amount subtract amount
     */ 
    function addSubtract(bytes32 _requestId, uint256 _amount)
        external
    {   
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);

        r.amountExpected = r.amountExpected.sub(_amount.toInt256Safe());

        AddSubtract(_requestId, _amount);
    }

    /* SETTER */
    /*
     * @dev Set payee of a request
     * @param _requestId Request id
     * @param _payee new payee
     */ 
    function setPayee(bytes32 _requestId, address _payee)
        external
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);
        requests[_requestId].payee = _payee;
        NewPayee(_requestId, _payee);
    }

    /*
     * @dev Get payer of a request
     * @param _requestId Request id
     * @param _payee new payer
     */ 
    function setPayer(bytes32 _requestId, address _payer)
        external
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);
        requests[_requestId].payer = _payer;
        NewPayer(_requestId, _payer);
    }

    /*
     * @dev Set amount expected of a request
     * @param _requestId Request id
     * @param new amount expected
     */     
    function setAmountExpected(bytes32 _requestId, int256 _amountExpected)
        external
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);
        requests[_requestId].amountExpected = _amountExpected;
        NewAmountExpected(_requestId, _amountExpected);
    }

    /*
     * @dev Set extension of a request
     * @param _requestId Request id
     * @param new extension
     */     
    function setExtension(bytes32 _requestId, address _extension)
        external
        isTrustedExtension(_extension)
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);
        requests[_requestId].extension = _extension;
        NewExtension(_requestId, _extension);
    }

    /*
     * @dev Set extension of a request
     * @param _requestId Request id
     * @param new extension
     */     
    function setDetails(bytes32 _requestId, string _details)
        external
    {
        Request storage r = requests[_requestId];
        require(r.subContract==msg.sender);
        requests[_requestId].details = _details;
        NewDetails(_requestId, _details);
    }

    /* GETTER */
    /*
     * @dev Get payee of a request
     * @param _requestId Request id
     * @return payee address
     */ 
    function getPayee(bytes32 _requestId)
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
    function getPayer(bytes32 _requestId)
        public
        constant
        returns(address)
    {
        return requests[_requestId].payer;
    }

    /*
     * @dev Get amount expected of a request
     * @param _requestId Request id
     * @return amount expected
     */     
    function getAmountExpected(bytes32 _requestId)
        public
        constant
        returns(int256)
    {
        return requests[_requestId].amountExpected;
    }

    /*
     * @dev Get subContract of a request
     * @param _requestId Request id
     * @return subContract address
     */
    function getSubContract(bytes32 _requestId)
        public
        constant
        returns(address)
    {
        return requests[_requestId].subContract;
    }

    /*
     * @dev Get balance of a request
     * @param _requestId Request id
     * @return balance
     */     
    function getBalance(bytes32 _requestId)
        public
        constant
        returns(int256)
    {
        return requests[_requestId].balance;
    }

    /*
     * @dev Get state of a request
     * @param _requestId Request id
     * @return state
     */ 
    function getState(bytes32 _requestId)
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
    function getExtension(bytes32 _requestId)
        public
        constant
        returns(address)
    {
        return requests[_requestId].extension;
    } 

    /*
     * @dev Modifier Check that creator is not zero
     * @param _creator Request
     */
    modifier creatorNotZero(address _creator) {
       require(_creator!=0);
       _;
    }
}