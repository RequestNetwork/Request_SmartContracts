pragma solidity ^0.4.11;

import './RequestCore.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestListEth{

    // _requestId in requestCore
    // uint public _requestId;

    // address of the contract of the request system
    RequestCore public requestCore;

    // contract constructor
    function RequestListEth(address _requestCoreAddress) 
    {
        requestCore=RequestCore(_requestCoreAddress);
    }

    function createRequest(address _payer, uint _amountExpected)
        returns(uint)
    {
        return requestCore.createRequest(msg.sender, _payer, _amountExpected);
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

    // The payer pay the Request with ether
    function pay(uint _requestId)
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        payable
    {
        requestCore.payment(_requestId, msg.value);
    }

    // The payer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw(uint _requestId)
        onlyRequestPayeeOrPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Completed)
    {
        requestCore.getPayee(_requestId).transfer(requestCore.getAmountPaid(_requestId));
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

    modifier onlyRequestPayeeOrPayer(uint _requestId) {
        require(requestCore.getPayee(_requestId)==msg.sender || requestCore.getPayer(_requestId)==msg.sender);
        _;
    }

    modifier onlyRequestState(uint _requestId, RequestCore.State state) {
        require(requestCore.getState(_requestId)==state);
        _;
    }


}

