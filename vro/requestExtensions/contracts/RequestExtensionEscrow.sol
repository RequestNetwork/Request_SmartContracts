pragma solidity ^0.4.11;

import './RequestCore.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestExtensionEscrow {
    enum EscrowState { Created, Refunded, Released }

    // mapping of requestId => escrow
    struct RequestEscrow {
        address escrow;
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

    function createRequest(uint _requestId, address[10] _paramsAddress)
        isSubContractTrusted(msg.sender)
    {
        escrows[_requestId] = RequestEscrow(_paramsAddress[0], EscrowState.Created, 0); // create RequestEscrow
    }


    function accept(uint _requestId) 
    {
        // nothing to do
    }

    function decline(uint _requestId)
    {
        // nothing to do
    }

    function cancel(uint _requestId)
    {
        // nothing to do
    }   



        // Escrow Function
    // escrow can release the payment to the seller
    function releaseToSeller(uint _requestId)
        onlyRequestEscrow(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        paymentCompleteToEscrow(_requestId)
    {
        // declare the payment
        requestCore.payment(_requestId, escrows[_requestId].amountPaid);

        escrows[_requestId].state = EscrowState.Released;
    }

    // escrow can refund the payment to the buyer
    function refundToBuyer(uint _requestId)
        onlyRequestEscrow(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        // declare the refund
        requestCore.refund(_requestId,escrows[_requestId].amountPaid);

        // declare the transaction as canceled
        requestCore.cancel(_requestId);

        escrows[_requestId].state = EscrowState.Refunded;
        // EscrowHasRefundPayment(_requestId);
    }

    // The payer pay the Request with ether
    function payment(uint _requestId, uint _amount)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        require(requestCore.getSubContract(_requestId)==msg.sender);
        require(_amount > 0 && _amount+escrows[_requestId].amountPaid > escrows[_requestId].amountPaid && _amount+escrows[_requestId].amountPaid <= requestCore.getAmountExpected(_requestId)); // value must be greater than 0 and all the payments should not overpass the amountExpected

        escrows[_requestId].amountPaid += _amount;
        LogRequestEscrowPayment(_requestId, _amount);

        if(escrows[_requestId].amountPaid == requestCore.getAmountExpected(_requestId)) {
            LogRequestEscrowPaid(_requestId);
        }
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
        require(requestCore.getAmountExpected(_requestId)==escrows[_requestId].amountPaid);
        _;
    }

    modifier isSubContractTrusted(address subContract) {
        require(requestCore.getStatusContract(subContract)==1);
        _;
    }
}

