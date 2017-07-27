pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestExtensionEscrow {
    enum EscrowState { Created, Refunded, Released }

    // mapping of requestId => escrow
    struct RequestEscrow {
        address subContract;
        address escrow;
        bytes32 escrow32;
        EscrowState state;
        uint amountPaid;
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

    function createRequest(uint _requestId, bytes32[10] _params)
        isSubContractTrusted(msg.sender)
        returns(bool)
    {
        escrows[_requestId] = RequestEscrow(msg.sender, address(_params[0]), _params[0], EscrowState.Created, 0); // create RequestEscrow
        return true;
    }


    function accept(uint _requestId) returns(bool)
    {
        // nothing to do
        return true;
    }

    function decline(uint _requestId) returns(bool)
    {
        // nothing to do
        return true;

    }

    function cancel(uint _requestId) returns(bool)
    {
        // nothing to do
        return true;
    }   

    function payment(uint _requestId, uint _amount)
        isSubContractTrusted(msg.sender)
        returns(bool)
    {
        require(_amount > 0 && _amount+escrows[_requestId].amountPaid > escrows[_requestId].amountPaid && _amount+escrows[_requestId].amountPaid <= requestCore.getAmountExpected(_requestId)); // value must be greater than 0 and all the payments should not overpass the amountExpected

        escrows[_requestId].amountPaid += _amount;
        LogRequestEscrowPayment(_requestId, _amount);

        if(escrows[_requestId].amountPaid == requestCore.getAmountExpected(_requestId)) {
            LogRequestEscrowPaid(_requestId);
        }

        return isPaymentCompleteToEscrow(_requestId) && isEscrowReleasedPayment(_requestId);
    }

    // function refund(uint _requestId, uint _amount)
    //     returns(bool)
    // {
    //     // nothing to do
    //     return true;
    // }



        // Escrow Function
    // escrow can release the payment to the seller
    function releaseToSeller(uint _requestId)
        onlyRequestEscrow(_requestId)
        isEscrowCreated(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        // release the money
        escrows[_requestId].state = EscrowState.Released;

        if(isPaymentCompleteToEscrow(_requestId)) {
            RequestInterface subContract = RequestInterface(escrows[_requestId].subContract);
            subContract.payment(_requestId, escrows[_requestId].amountPaid);
        }
    }

    // escrow can refund the payment to the buyer
    // function refundToBuyer(uint _requestId)
    //     onlyRequestEscrow(_requestId)
    //     isEscrowCreated(_requestId)
    //     onlyRequestState(_requestId, RequestCore.State.Accepted)
    // {
    //     // Refund the money
    //     escrows[_requestId].state = EscrowState.Refunded;
 
    //     RequestInterface subContract = RequestInterface(escrows[_requestId].subContract);
    //     subContract.refund(_requestId, escrows[_requestId].amountPaid); 

    // }



    // internal function 
    function isPaymentCompleteToEscrow(uint _requestId) internal returns(bool) 
    {
        return escrows[_requestId].amountPaid == requestCore.getAmountExpected(_requestId);
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

    modifier isEscrowCreated(uint _requestId)
    {
        require(escrows[_requestId].state == EscrowState.Created);
        _;
    }
}

