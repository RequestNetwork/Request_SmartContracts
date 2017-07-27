pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestEthereum{

    // RequestCore object
    RequestCore public requestCore;

    // Ethereum available to withdraw
    struct EthToWithdraw {
        uint amount;
        address recipient;
    }
    mapping(uint => mapping(address => uint)) public ethToWithdraw;

    // contract constructor
    function RequestEthereum(address _requestCoreAddress) 
    {
        requestCore=RequestCore(_requestCoreAddress);
    }
    function createRequest(address _payer, uint _amountExpected, address[10] _extensions, bytes32[10] _extensionParams0 )
        returns(uint)
    {
        uint requestId= requestCore.createRequest(msg.sender, _payer, _amountExpected, _extensions);

        RequestInterface extension0 = RequestInterface(_extensions[0]);
        extension0.createRequest(requestId, _extensionParams0);

        return requestId;
    }

    // the payer can accept an Request 
    function accept(uint _requestId) 
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            RequestInterface extension = RequestInterface(extensions[i]);
            isOK = isOK && extension.accept(_requestId);
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

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            RequestInterface extension = RequestInterface(extensions[i]);
            isOK = isOK && extension.decline(_requestId);
        }
        if(isOK) 
        {
            requestCore.decline(_requestId);
        }  
    }


    // the payee can Cancel an Request if just creted
    function cancel(uint _requestId)
        condition(isOnlyRequestExtensions(_requestId) || (requestCore.getPayee(_requestId)==msg.sender && requestCore.getState(_requestId)==RequestCore.State.Created))
        // onlyRequestPayee(_requestId)
        // onlyRequestState(_requestId, RequestCore.State.Created)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestInterface extension = RequestInterface(extensions[i]);
                isOK = isOK && extension.cancel(_requestId);
            }
        }
        if(isOK) 
        {
            requestCore.cancel(_requestId);
        }
    }

    function payment(uint _requestId, uint _amount)
        onlyRequestExtensions(_requestId)
    {
        paymentInternal(_requestId, _amount);
    }

    // it is an order
    function refund(uint _requestId, uint _amount)
        onlyRequestExtensions(_requestId)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestInterface extension = RequestInterface(extensions[i]);
                isOK = isOK && extension.refund(_requestId, _amount);  
            }
        }
        if(isOK) 
        {
            // requestCore.refund(_requestId, _amount);
            ethToWithdraw[_requestId][requestCore.getPayer(_requestId)] = _amount;
        }
    }


        // Other function
    // The payer pay the Request with ether
    function pay(uint _requestId)
        onlyRequestPayer(_requestId)
        payable
    {
        paymentInternal(_requestId, msg.value);
    }

        // internal function
    function  paymentInternal(uint _requestId, uint _amount)
        internal
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestInterface extension = RequestInterface(extensions[i]);
                isOK = isOK && extension.payment(_requestId, _amount);  
            }
        }
        if(isOK) 
        {
            requestCore.payment(_requestId, _amount);
            ethToWithdraw[_requestId][requestCore.getPayee(_requestId)] = _amount;
        }
    }

    // The payer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw(uint _requestId, address UntrustedRecipient)
    {
        uint amount = ethToWithdraw[_requestId][UntrustedRecipient];
        require(amount>0);
        ethToWithdraw[_requestId][UntrustedRecipient] = 0;
        UntrustedRecipient.transfer(amount);
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


    function isOnlyRequestExtensions(uint _requestId) internal returns(bool){
        address[10] memory extensions = requestCore.getExtensions(_requestId);
        bool found = false;
        for (uint i = 0; !found && i < extensions.length && extensions[i]!=0; i++) 
        {
            found= msg.sender==extensions[i] ;
        }
        return found;
    }

    modifier onlyRequestExtensions(uint _requestId) {
        require(isOnlyRequestExtensions(_requestId));
        _;
    }


}

