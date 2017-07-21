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
    function RequestSimpleEth(address _requestSystemAddress, address _sender, address _buyer, uint _amountExpected) 
        condition(_sender==msg.sender)
    {
        requestSystem= RequestCore(_requestSystemAddress);
        requestSystemAddress=_requestSystemAddress;

        requestId=requestSystem.createRequest(_sender, _buyer, _amountExpected, this);
    }

    // the buyer can accept an Request 
    function accept() 
        systemIsWorking
        onlyRequestBuyer
    {
        requestSystem.accept(requestId);
    }

    // the buyer can reject an Request
    function reject()
        systemIsWorking
        onlyRequestBuyer
    {
        requestSystem.reject(requestId);
    }

    // the seller can Cancel an Request if just creted
    function cancel()
        systemIsWorking
        onlyRequestSeller
    {
        requestSystem.cancel(requestId);
    }   

    // The buyer pay the Request with ether
    function pay()
        systemIsWorking
        onlyRequestBuyer
        payable
    {
        requestSystem.payment(requestId, msg.value);
    }

    // The buyer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw()
        systemIsWorking
        onlyRequestSeller
    {
        requestSystem.complete(requestId);
        requestSystem.getSeller(requestId).transfer(requestSystem.getAmountPaid(requestId));
    }




    //modifier
    modifier condition(bool c) {
        require(c);
        _;
    }
    
    modifier systemIsWorking() {
        require(requestSystem.getSystemState()==Administrable.SystemState.Working);
        _;
    }
    
    modifier onlyRequestBuyer() {
        require(requestSystem.getBuyer(requestId)==msg.sender);
        _;
    }
    
    modifier onlyRequestSeller() {
        require(requestSystem.getSeller(requestId)==msg.sender);
        _;
    }
}

