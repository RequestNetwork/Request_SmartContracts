pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestSynchroneInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestExtensionEscrow is RequestSynchroneInterface {
    enum EscrowState { Created, Refunded, Released }

    // mapping of requestId => escrow
    struct RequestEscrow {
        address subContract;
        address escrow;
        EscrowState state;
        uint amountPaid;
        uint amountRefunded;
    }
    mapping(uint => RequestEscrow) public escrows;

    event LogRequestEscrowPayment(uint requestId, uint amount);
    event LogRequestEscrowPaid(uint requestId);

    // address of the contract of the request system
    RequestCore public requestCore;

    // contract constructor
    function RequestExtensionEscrow(address _requestCoreAddress) 
    {
        requestCore= RequestCore(_requestCoreAddress);
    }

    // ---- INTERFACE FUNCTIONS ------------------------------------------------------------------------------------
    function createRequest(uint _requestId, bytes32[5] _params)
        isSubContractTrusted(msg.sender)
        returns(bool)
    {
        escrows[_requestId] = RequestEscrow(msg.sender, address(_params[0]), EscrowState.Created, 0,0); // create RequestEscrow
        return true;
    }


    // we just register the refund if it's to the payer
    function fundOrder(uint _requestId, address _recipient, uint _amount)
        isSubContractRight(_requestId)
        returns(bool)
    {
        if(_amount > 0 && _recipient == requestCore.getPayer(_requestId)) {
            require(_amount+escrows[_requestId].amountRefunded > escrows[_requestId].amountRefunded && _amount+escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded >= _amount);
            escrows[_requestId].amountRefunded += _amount;
        }

        return true;
    }

    function payment(uint _requestId, uint _amount)
        isSubContractRight(_requestId)
        inNOTEscrowState(_requestId, EscrowState.Refunded)
        returns(bool)
    {
        require(_amount > 0 && _amount+escrows[_requestId].amountPaid > escrows[_requestId].amountPaid && _amount+escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded <= requestCore.getAmountExpected(_requestId)); // value must be greater than 0 and all the payments should not overpass the amountExpected

        escrows[_requestId].amountPaid += _amount;
        LogRequestEscrowPayment(_requestId, _amount);

        if(isPaymentCompleteToEscrow(_requestId)) {
            LogRequestEscrowPaid(_requestId);
        }

        return isPaymentCompleteToEscrow(_requestId) && isEscrowReleasedPayment(_requestId);
    }
    // ----------------------------------------------------------------------------------------
    
    // ---- ESCROW FUNCTIONS ------------------------------------------------------------------------------------
    // escrow can release the payment to the seller
    function releaseToPayee(uint _requestId)
        onlyRequestEscrow(_requestId)
        inEscrowState(_requestId, EscrowState.Created)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        // release the money
        escrows[_requestId].state = EscrowState.Released;

        if(isPaymentCompleteToEscrow(_requestId)) {
            RequestSynchroneInterface subContract = RequestSynchroneInterface(escrows[_requestId].subContract);
            subContract.payment(_requestId, escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded);
        }
    }

    // escrow can refund the payment to the âyer
    function refundToPayer(uint _requestId)
        onlyRequestEscrow(_requestId)
        inEscrowState(_requestId, EscrowState.Created)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        // Refund the money
        escrows[_requestId].state = EscrowState.Refunded;
        uint amountToRefund = escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded;
        escrows[_requestId].amountRefunded = escrows[_requestId].amountPaid;

        RequestSynchroneInterface subContract = RequestSynchroneInterface(escrows[_requestId].subContract);
        if(amountToRefund>0) subContract.fundOrder(_requestId, requestCore.getPayer(_requestId), amountToRefund); 
        subContract.cancel(_requestId); 
    }
    // ----------------------------------------------------------------------------------------


    // internal function 
    function isPaymentCompleteToEscrow(uint _requestId) internal returns(bool) 
    {
        return escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded == requestCore.getAmountExpected(_requestId);
    }

    function isEscrowReleasedPayment(uint _requestId) internal returns(bool) 
    {
        return escrows[_requestId].state == EscrowState.Released;
    }


    //modifier
    modifier condition(bool c) {
        require(c);
        _;
    }
    
    modifier onlyRequestPayer(uint _requestId) {
        require(requestCore.getPayer(_requestId)==msg.sender);
        _;
    }
    
    modifier onlyRequestPayee(uint _requestId) {
        require(requestCore.getPayee(_requestId)==msg.sender);
        _;
    }

    modifier onlyRequestEscrow(uint _requestId) {
        require(escrows[_requestId].escrow==msg.sender);
        _;
    }

    modifier inEscrowState(uint _requestId, EscrowState es) {
        require(escrows[_requestId].state==es);
        _;
    }

    modifier inNOTEscrowState(uint _requestId, EscrowState es) {
        require(escrows[_requestId].state!=es);
        _;
    }

    modifier onlyRequestState(uint _requestId, RequestCore.State state) {
        require(requestCore.getState(_requestId)==state);
        _;
    }

    modifier onlyRequestStateOr(uint _requestId, RequestCore.State state1, RequestCore.State state2) {
        require(requestCore.getState(_requestId)==state1 || requestCore.getState(_requestId)==state2);
        _;
    }

    modifier paymentCompleteToEscrow(uint _requestId) {
        require(isPaymentCompleteToEscrow(_requestId));
        _;
    }

    modifier isSubContractTrusted(address subContract) {
        require(requestCore.getStatusContract(subContract)==1);
        _;
    }

    modifier isSubContractRight(uint _requestId)
    {
        require(escrows[_requestId].subContract == msg.sender);
        _;
    }   
}

