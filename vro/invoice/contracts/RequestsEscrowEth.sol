pragma solidity ^0.4.11;

import "./Requests.sol";

contract RequestEscrowEth{
    enum EscrowState { Pending, Accepted, Refused, /* Hodling,*/ Refunded, Released }
            
    address public escrow;
    EscrowState public escrowState;

    // requestId in requestSystem
    uint public requestId;
    
    // address of the contract of the request system
    address public requestSystemAddress;
    Requests public requestSystem;
     
    event EscrowHasAccepted();
    event EscrowHasRefused();
    event PaymentRefunded();

    function RequestEscrow (address _requestSystemAddress, address _escrow) {
        escrow= _escrow;
        requestSystem= Requests(_requestSystemAddress);
        requestSystemAddress=_requestSystemAddress;
    }

    // get the inoiveId - only RequestSystem can do it
    function initialize(uint _requestId) 
        systemIsWorking
        onlyRequestSystem
    {
        requestId=_requestId;
    }

        // Buyer Function
    function pay()
        systemIsWorking
        inRequestState(Requests.State.Accepted) // request state must be accepted only
        inEscrowState(EscrowState.Accepted) // escrow state must be accepted only
        payable
        onlyRequestBuyer
    {
        uint amountPaidTemp = requestSystem.getAmountPaid(requestId);
        uint amountExpectedTemp = requestSystem.getAmountExpected(requestId);

        // TODO: Someone can force amount on the contract and it can occur mispayment replace "<=" by a mechanism of reimboursment (?)
        require(msg.value > 0 && msg.value+amountPaidTemp > amountPaidTemp && msg.value+amountPaidTemp <= amountExpectedTemp); // value must be greater than 0 and all the payments should not overpass the amountExpected

        requestSystem.payment(requestId, msg.value);
    }

        // Escrow Function
    // the ecrow accept to deal this
    function escrowAccept()
        systemIsWorking
        // TODO add request state check ?
        onlyEscrow
        inEscrowState(EscrowState.Pending)
    {
        escrowState = EscrowState.Accepted;
        EscrowHasAccepted();
    }

    // the ecrow refuse to deal this
    function escrowRefuse()
        systemIsWorking
        // TODO add request state check ?
        inEscrowState(EscrowState.Pending)
        onlyEscrow
    {
        escrowState = EscrowState.Refused;
        EscrowHasRefused();
        requestSystem.cancel(requestId);
    }

    // escrow can release the payment to the seller
    function releaseToSeller()
        systemIsWorking
        onlyEscrow
        inRequestState(Requests.State.Paid)
        inEscrowState(EscrowState.Accepted)
    {
        escrowState = EscrowState.Released;
        requestSystem.complete(requestId);
        requestSystem.getSeller(requestId).transfer(requestSystem.getAmountPaid(requestId));
    }


    // escrow can refund the payment to the buyer
    function refundToBuyer()
        systemIsWorking
        onlyEscrow
        inRequestState(Requests.State.Paid)
        inEscrowState(EscrowState.Accepted)
    {
        escrowState = EscrowState.Refunded;
        PaymentRefunded();
        requestSystem.cancel(requestId);
        requestSystem.getBuyer(requestId).transfer(requestSystem.getAmountPaid(requestId));
    }


    
        // Modifiers
    modifier onlyRequestBuyer() {
        require(requestSystem.getBuyer(requestId)==msg.sender);
        _;
    }
    
    modifier onlyRequestSeller() {
        require(requestSystem.getSeller(requestId)==msg.sender);
        _;
    }
    
    modifier onlyEscrow() {
        require(msg.sender == escrow);
        _;
    }
        
    modifier onlyRequestSystem() {
        require(msg.sender == requestSystemAddress);
        _;
    }

    modifier inEscrowState(EscrowState _state) {
        require(escrowState == _state);
        _;
    }
    
    modifier inRequestState(Requests.State _state) {
         require(requestSystem.getState(requestId) == _state);
        _;
    }
    
    modifier systemIsWorking() {
        require(requestSystem.getSystemState()==Administrable.SystemState.Working);
        _;
    }

}