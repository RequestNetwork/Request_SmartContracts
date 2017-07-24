pragma solidity ^0.4.11;

import './RequestCore.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestListEscrowEth {
    enum EscrowState { Created, Accepted, Declined, Refunded, Released }

    // mapping of requestId => escrow
    struct RequestEscrow {
        address escrow;
        EscrowState state;
        uint amountPaid;
    }
    mapping(uint => RequestEscrow) public escrows;

    event LogRequestEscrowHasAccepted(uint requestId);
    event LogRequestEscrowHasDeclined(uint requestId);
    event LogRequestEscrowPayment(uint requestId, uint amount);
    event LogRequestEscrowPaid(uint requestId);

    // address of the contract of the request system
    RequestCore public requestCore;

    // contract constructor
    function RequestListEscrowEth(address _requestCoreAddress) 
    {
        requestCore= RequestCore(_requestCoreAddress);
    }

    function createRequest(address _payer, uint _amountExpected, address _escrow)
        returns(uint)
    {
        uint requestId = requestCore.createRequest(msg.sender, _payer, _amountExpected);
        escrows[requestId] = RequestEscrow(_escrow, EscrowState.Created, 0); // create RequestEscrow
        return requestId;
    }

    // the payer can accept an Request 
    function accept(uint _requestId) 
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
    {
        requestCore.accept(_requestId);
    }

    // the payer can decline an Request
    function decline(uint _requestId)
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
    {
        requestCore.decline(_requestId);
    }

    // the payee can Cancel an Request if just creted
    function cancel(uint _requestId)
        onlyRequestPayee(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
    {
        requestCore.cancel(_requestId);
    }   


        // Escrow Function
    // the ecrow accept to deal this
    function escrowAccept(uint _requestId)
        onlyRequestEscrow(_requestId)
        onlyRequestStateOr(_requestId, RequestCore.State.Created, RequestCore.State.Accepted)
        inEscrowState(_requestId,EscrowState.Created)
    {
        escrows[_requestId].state = EscrowState.Accepted;
        LogRequestEscrowHasAccepted(_requestId);
    }

    // the ecrow decline to deal this
    function escrowDecline(uint _requestId)
        onlyRequestEscrow(_requestId)
        onlyRequestStateOr(_requestId, RequestCore.State.Created, RequestCore.State.Accepted)
        inEscrowState(_requestId, EscrowState.Created)
    {
        escrows[_requestId].state = EscrowState.Declined;
        LogRequestEscrowHasDeclined(_requestId);
        requestCore.cancel(_requestId);
    }


    // escrow can release the payment to the seller
    function releaseToSeller(uint _requestId)
        onlyRequestEscrow(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        inEscrowState(_requestId, EscrowState.Accepted)
        paymentCompleteToEscrow(_requestId)
    {
        // declare the refund
        requestCore.payment(_requestId, escrows[_requestId].amountPaid);

        escrows[_requestId].state = EscrowState.Released;
    }

    // escrow can refund the payment to the buyer
    function refundToBuyer(uint _requestId)
        onlyRequestEscrow(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        inEscrowState(_requestId, EscrowState.Accepted)
    {
        // declare the refund
        requestCore.refund(_requestId,escrows[_requestId].amountPaid);

        // declare the transaction as canceled
        requestCore.cancel(_requestId);

        escrows[_requestId].state = EscrowState.Refunded;
        // EscrowHasRefundPayment(_requestId);
    }


    // The payer pay the Request with ether
    function pay(uint _requestId)
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        inEscrowState(_requestId, EscrowState.Accepted)
        payable
    {
        require(msg.value > 0 && msg.value+escrows[_requestId].amountPaid > escrows[_requestId].amountPaid && msg.value+escrows[_requestId].amountPaid <= requestCore.getAmountExpected(_requestId)); // value must be greater than 0 and all the payments should not overpass the amountExpected

        escrows[_requestId].amountPaid += msg.value;
        LogRequestEscrowPayment(_requestId, msg.value);

        if(escrows[_requestId].amountPaid == requestCore.getAmountExpected(_requestId)) {
            LogRequestEscrowPaid(_requestId);
        }
    }

    // The payee withdraw 
    function withdrawPayment(uint _requestId)
        onlyRequestPayee(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Completed)
        inEscrowState(_requestId, EscrowState.Released)
    {
        // transfer the fund
        requestCore.getPayee(_requestId).transfer(escrows[_requestId].amountPaid);
    }

    // The payer withdraw the refund
    function withdrawRefund(uint _requestId)
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Canceled)
        inEscrowState(_requestId, EscrowState.Refunded)
    {
        // transfer the fund
        requestCore.getPayer(_requestId).transfer(escrows[_requestId].amountPaid);
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
}

