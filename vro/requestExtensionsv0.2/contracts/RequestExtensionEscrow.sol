 pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestExtensionEscrow is RequestInterface {
    enum EscrowState { Created, Refunded, Released }

    // mapping of requestId => escrow
    struct RequestEscrow {
        address subContract;
        address escrow;
        address escrowDeposit;
        EscrowState state;
        uint amountPaid;
        uint amountReleased;
        uint amountRefunded;
    }
    mapping(uint => RequestEscrow) public escrows;

    event LogRequestEscrowPayment(uint requestId, uint amount);
    event LogRequestEscrowRelease(uint requestId);
    event LogRequestEscrowRefund(uint requestId);
    // event LogRequestEscrowPaid(uint requestId);

    // address of the contract of the request system
    RequestCore public requestCore;

    // contract constructor
    function RequestExtensionEscrow(address _requestCoreAddress) 
    {
        requestCore= RequestCore(_requestCoreAddress);
    }

    // ---- INTERFACE FUNCTIONS ------------------------------------------------------------------------------------
    function createRequest(uint _requestId, bytes32[10] _params)
        isSubContractTrusted(msg.sender)
        returns(bool)
    {
        escrows[_requestId] = RequestEscrow(msg.sender, address(_params[0]), address(_params[1]), EscrowState.Created, 0,0,0); // create RequestEscrow
        return true;
    }

    function fundOrder(uint _requestId, address _from, address _to, uint _amount) 
        isSubContractRight(_requestId)
        returns(bool)
    {
        // TODO : should we block payment to payee if escrow not released ??
        return true; 
    }

    function fundMovement(uint _requestId, address _from, address _to, uint _amount)
        isSubContractRight(_requestId)
        returns(bool)
    {
        RequestInterface subContract = RequestInterface(escrows[_requestId].subContract);
        logTEST(escrows[_requestId].amountRefunded, escrows[_requestId].amountReleased,escrows[_requestId].amountPaid);
        if(_to==0 || _to==escrows[_requestId].escrowDeposit) { // _to==0 Payment to the contract #ethCase
            // escrow payment we register the payment
            require(escrows[_requestId].state!=EscrowState.Refunded);
            require(_amount > 0 && _amount+escrows[_requestId].amountPaid > escrows[_requestId].amountPaid); // value must be greater than 0 and we check the overflow
            escrows[_requestId].amountPaid += _amount;
            LogRequestEscrowPayment(_requestId, _amount);

            if(isEscrowReleasedPayment(_requestId)) { // if escrow has released the payment
                // release what have been already paid
                subContract.fundOrder(_requestId, escrows[_requestId].escrowDeposit, requestCore.getPayee(_requestId), _amount);                
            }
            return false; // Intercept the fundMovement (don't continue in the extensions chain)

        } else if(_to==requestCore.getPayee(_requestId)) { // don't check the from, todo ?
            // we just register the amount released
            require(escrows[_requestId].state!=EscrowState.Refunded);
            require(_amount > 0 && _amount+escrows[_requestId].amountReleased > escrows[_requestId].amountReleased && _amount+escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded-escrows[_requestId].amountReleased >= _amount); // check overflow and underflow
            escrows[_requestId].amountReleased += _amount;
            return true;
            // TODO : if payment send direct to Payee (no escrow) .. it will be a mess with the escrow.

        } else if(_to==requestCore.getPayer(_requestId)) { // don't check the from, todo ?
            // register the refund if it's to the payer
            require(escrows[_requestId].state!=EscrowState.Released);
            require(_amount > 0 && _amount+escrows[_requestId].amountRefunded > escrows[_requestId].amountRefunded && _amount+escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded-escrows[_requestId].amountReleased >= _amount); // check overflow and underflow

            escrows[_requestId].amountRefunded += _amount;
            if(escrows[_requestId].amountRefunded+escrows[_requestId].amountReleased == escrows[_requestId].amountPaid) {
                logTEST(escrows[_requestId].amountRefunded, escrows[_requestId].amountReleased,escrows[_requestId].amountPaid);
                subContract.cancel(_requestId); 
            }
            
            return false;

        } else {
            // payment to someone not known, nothing to say
            return true;
        }

    }
    event logTEST(uint amountRefunded, uint amountReleased,uint amountPaid);
    // -----------------------------------------------------------------------------------------
    
    // ---- ESCROW FUNCTIONS ------------------------------------------------------------------------------------
    // escrow can release the payment to the seller
    function releaseToPayee(uint _requestId)
        onlyRequestEscrow(_requestId)
        inEscrowState(_requestId, EscrowState.Created)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        // release the money
        escrows[_requestId].state = EscrowState.Released;

        // release what have been already paid
        RequestInterface subContract = RequestInterface(escrows[_requestId].subContract);
        uint amountToRelease = escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded-escrows[_requestId].amountReleased;
        LogRequestEscrowRelease(_requestId);
        if(amountToRelease>0) subContract.fundOrder(_requestId, escrows[_requestId].escrowDeposit, requestCore.getPayee(_requestId), amountToRelease); 
    }

    // escrow can refund the payment to the âyer
    function refundToPayer(uint _requestId)
        onlyRequestEscrow(_requestId)
        inEscrowState(_requestId, EscrowState.Created)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        // Refund the money
        escrows[_requestId].state = EscrowState.Refunded;
        uint amountToRefund = escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded-escrows[_requestId].amountReleased;

        LogRequestEscrowRefund(_requestId);
        RequestInterface subContract = RequestInterface(escrows[_requestId].subContract);
        if(escrows[_requestId].amountPaid==0) {
            // if nothing paid just cancel the transaction
            subContract.cancel(_requestId); 
        } else if(amountToRefund>0) { 
            // Order the refund
            subContract.fundOrder(_requestId, escrows[_requestId].escrowDeposit, requestCore.getPayer(_requestId), amountToRefund); 
        } // else nothing to do (already refunded)
    }
    // ----------------------------------------------------------------------------------------


    // internal function 
    function isPaymentCompleteToEscrow(uint _requestId) internal returns(bool) 
    {
        return escrows[_requestId].amountPaid-escrows[_requestId].amountRefunded-escrows[_requestId].amountReleased == requestCore.getAmountExpected(_requestId);
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

