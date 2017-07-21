pragma solidity ^0.4.11;

import './RequestCore.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestSimpleEth{

    // requestId in requestSystem
    uint public requestId;

    // address of the contract of the request system
    address public requestSystemAddress;
    RequestCore public requestSystem;

    // contract constructor
    function RequestSimpleEth(address _requestSystemAddress) 
    {
        requestSystem= RequestCore(_requestSystemAddress);
        requestSystemAddress=_requestSystemAddress;
    }

    function createRequest(address _payee, address _payer, uint _amountExpected) 
        requestNotCreated()
        condition(_payee==msg.sender)
        systemIsWorking
    {
        requestId=requestSystem.createRequest(_payee, _payer, _amountExpected, this);
    }

    // the payer can accept an Request 
    function accept() 
        systemIsWorking
        onlyRequestPayer
    {
        requestSystem.accept(requestId);
    }

    // the payer can decline an Request
    function decline()
        systemIsWorking
        onlyRequestPayer
    {
        requestSystem.decline(requestId);
    }

    // the payee can Cancel an Request if just creted
    function cancel()
        systemIsWorking
        onlyRequestPayee
    {
        requestSystem.cancel(requestId);
    }   

    // The payer pay the Request with ether
    function pay()
        systemIsWorking
        onlyRequestPayer
        payable
    {
        requestSystem.payment(requestId, msg.value);
    }

    // The payer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw()
        systemIsWorking
        onlyRequestPayee
    {
        requestSystem.complete(requestId);
        requestSystem.getPayee(requestId).transfer(requestSystem.getAmountPaid(requestId));
    }




    //modifier
    modifier condition(bool c) {
        require(c);
        _;
    }
    
    modifier requestNotCreated() {
        require(requestId==0);
        _;
    }
    
    modifier systemIsWorking() {
        require(requestSystem.getSystemState()==Administrable.SystemState.Working);
        _;
    }
    
    modifier onlyRequestPayer() {
        require(requestSystem.getPayer(requestId)==msg.sender);
        _;
    }
    
    modifier onlyRequestPayee() {
        require(requestSystem.getPayee(requestId)==msg.sender);
        _;
    }
}

