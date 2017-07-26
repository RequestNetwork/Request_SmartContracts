pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestExtensionInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestEthereum{

    // RequestCore object
    RequestCore public requestCore;

    // contract constructor
    function RequestEthereum(address _requestCoreAddress) 
    {
        requestCore=RequestCore(_requestCoreAddress);
    }
    function createRequest(address _payer, uint _amountExpected, address[10] _extensions, /*address[10][10] _extensionParamsAddress*/ )
        returns(uint)
    {
        uint requestId= requestCore.createRequest(msg.sender, _payer, _amountExpected, _extensions);

        for (uint i = 0; i < _extensions.length && _extensions[i]!=0; i++) 
        {
            RequestExtensionInterface extension = RequestExtensionInterface(_extensions[i]);

             address[10] test = [_payer];
            extension.createRequest(requestId, test);
        }

        return requestId;
    }

    // the payer can accept an Request 
    function accept(uint _requestId) 
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; i < extensions.length && extensions[i]!=0; i++) 
        {
            RequestExtensionInterface extension = RequestExtensionInterface(extensions[i]);
            isOK = extension.accept(_requestId);
        }
        if(isOK) 
        {
            requestCore.accept(_requestId);
        }       
    }

    // the payer can decline an Request
    function decline(uint _requestId)
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        for (uint i = 0; i < extensions.length && extensions[i]!=0; i++) 
        {
            require(extensions[i].call(bytes4(keccak256("refuse(uint256)")), _requestId));
        }
        requestCore.decline(_requestId);
    }


    // the payee can Cancel an Request if just creted
    function cancel(uint _requestId)
        onlyRequestPayee(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        for (uint i = 0; i < extensions.length && extensions[i]!=0; i++) 
        {
            require(extensions[i].call(bytes4(keccak256("cancel(uint256)")), _requestId));
        }
        requestCore.cancel(_requestId);
    }   


    // The payer pay the Request with ether
    function pay(uint _requestId)
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        payable
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        for (uint i = 0; i < extensions.length && extensions[i]!=0; i++) 
        {
            require(extensions[i].call(bytes4(keccak256("payment(uint256,uint256)")), _requestId));
        }
        requestCore.payment(_requestId, msg.value);
    }

/*
    // The payer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw(uint _requestId)
        onlyRequestPayeeOrPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Completed)
    {
        requestCore.getPayee(_requestId).transfer(requestCore.getAmountPaid(_requestId));
    }

*/


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

