pragma solidity ^0.4.11;

import './RequestCore.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestSimpleEth{

    // _requestId in requestSystem
    // uint public _requestId;

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
        returns(uint)
    {
        return requestSystem.createRequest(_payee, _payer, _amountExpected, this);
    }

    // the payer can accept an Request 
    function accept(uint _requestId) 
        systemIsWorking
        onlyRequestPayer(uin_requestId)
    {
        requestSystem.accept(_requestId);
    }

    // the payer can decline an Request
    function decline(uint _requestId)
        systemIsWorking
        onlyRequestPayer(_requestId)
    {
        requestSystem.decline(_requestId);
    }

    // the payee can Cancel an Request if just creted
    function cancel(uint _requestId)
        systemIsWorking
        onlyRequestPayee(_requestId)
    {
        requestSystem.cancel(_requestId);
    }   

    // The payer pay the Request with ether
    function pay(uint _requestId)
        systemIsWorking
        onlyRequestPayer(_requestId)
        payable
    {
        requestSystem.payment(_requestId, msg.value);
    }

    // The payer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw(uint _requestId)
        systemIsWorking
        onlyRequestPayee(_requestId)
    {
        requestSystem.complete(_requestId);
        requestSystem.getPayee(_requestId).transfer(requestSystem.getAmountPaid(_requestId));
    }




    //modifier
    modifier condition(bool c) {
        require(c);
        _;
    }
    
    modifier requestNotCreated() {
        require(_requestId==0);
        _;
    }
    
    modifier systemIsWorking() {
        require(requestSystem.getSystemState()==Administrable.SystemState.Working);
        _;
    }
    
    modifier onlyRequestPayer(uint _requestId) {
        require(requestSystem.getPayer(_requestId)==msg.sender);
        _;
    }
    
    modifier onlyRequestPayee(uint _requestId) {
        require(requestSystem.getPayee(_requestId)==msg.sender);
        _;
    }
}

