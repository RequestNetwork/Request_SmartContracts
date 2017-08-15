pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestEthereum {

    // RequestCore object
    RequestCore public requestCore;
    mapping(uint => mapping(address => uint)) public ethToWithdraw;

    // BitcoinRequest Event 
    event LogUnknownFund(uint requestId, address from, address to);
    
    // contract constructor
    function RequestEthereum(address _requestCoreAddress) 
    {
        requestCore=RequestCore(_requestCoreAddress);
    }

    function createRequest(address _payer, uint _amountExpected, address[10] _extensions, bytes32[10] _extensionParams0, bytes32[10] _extensionParams1  )
        returns(uint)
    {
        uint requestId= requestCore.createRequest(msg.sender, _payer, _amountExpected, _extensions);

        if(_extensions[0]!=0) {
            RequestInterface extension0 = RequestInterface(_extensions[0]);
            extension0.createRequest(requestId, _extensionParams0);
        }

        if(_extensions[1]!=0) {
            RequestInterface extension1 = RequestInterface(_extensions[1]);
            extension1.createRequest(requestId, _extensionParams1);
        }
        return requestId;
    }

    // ---- INTERFACE FUNCTIONS ------------------------------------------------------------------------------------
    // the payer can accept an Request 
    function accept(uint _requestId) 
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
        returns(bool)
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
        return isOK;
    }

    // the payer can decline an Request
    function decline(uint _requestId)
        onlyRequestPayer(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Created)
        returns(bool)
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
        return isOK;
    }

    // direct path to the core ?
    function payment(uint _requestId, uint _amount)
        onlyRequestExtensions(_requestId)
        returns(bool)
    {
        requestCore.payment(_requestId, _amount);
        return true;
    }

    function cancel(uint _requestId)
        condition(isOnlyRequestExtensions(_requestId) || (requestCore.getPayee(_requestId)==msg.sender && requestCore.getState(_requestId)==RequestCore.State.Created))
        returns(bool)
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
        return isOK;
    }


    function fundOrder(uint _requestId, address _from, address _to, uint _amount) 
        onlyRequestExtensions(_requestId) 
        returns(bool)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestInterface extension = RequestInterface(extensions[i]);
                isOK = isOK && extension.fundOrder(_requestId, 0, _to, _amount); // 0 is the contract itself
            }
        }
        if(isOK) 
        {
            // sending fund means make it availbale to withdraw here
            ethToWithdraw[_requestId][_to] = _amount;
            // declare the fund movement
            fundMovementInternal(_requestId, 0, _to, _amount); // 0 is the contract itself
        }   
        return isOK;
    }


    // ----------------------------------------------------------------------------------------


    // ---- CONTRACT FUNCTIONS ------------------------------------------------------------------------------------
    // The payer pay the Request with ether
    function pay(uint _requestId)
        onlyRequestPayer(_requestId)
        payable
    {
        fundMovementInternal(_requestId, msg.sender, 0, msg.value);
    }

    // The payer pay the Request with ether - available only if subContract is the system itself (no subcontract)
    function withdraw(uint _requestId, address UntrustedRecipient)
    {
        uint amount = ethToWithdraw[_requestId][UntrustedRecipient];
        require(amount>0);
        ethToWithdraw[_requestId][UntrustedRecipient] = 0;
        UntrustedRecipient.transfer(amount);
    }
    // ----------------------------------------------------------------------------------------


    // ---- INTERNAL FUNCTIONS ------------------------------------------------------------------------------------
    function  fundMovementInternal(uint _requestId, address _from, address _to, uint _amount) internal
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {

        address[10] memory extensions = requestCore.getExtensions(_requestId);
        
        var notIntercepted = true;
        for (uint i = 0; notIntercepted && i < extensions.length && extensions[i]!=0; i++) 
        {
            RequestInterface extension = RequestInterface(extensions[i]);
            notIntercepted = extension.fundMovement(_requestId, _from, _to, _amount);  
        }
  
        if(notIntercepted) {
            if(_to == requestCore.getPayee(_requestId)) {
                requestCore.payment(_requestId, _amount);
            } else if(_to == requestCore.getPayer(_requestId)) {
               requestCore.refund(_requestId, _amount);
            } else {
                LogUnknownFund(_requestId, _from, _to);
            }
        }
    }
    // ----------------------------------------------------------------------------------------



    // TODO !
    // function refund(uint _requestId, uint _amount)
    //     onlyRequestExtensions(_requestId)
    // {
    //     address[10] memory extensions = requestCore.getExtensions(_requestId);

    //     var isOK = true;
    //     for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
    //     {
    //         if(msg.sender != extensions[i]) {
    //             RequestInterface extension = RequestInterface(extensions[i]);
    //             isOK = isOK && extension.refund(_requestId, _amount);  
    //         }
    //     }
    //     if(isOK) 
    //     {
    //         requestCore.refund(_requestId, _amount); // TODO HOW TO DIFERENCIATE REAL REFUND and REFUND FOR EXTENSION ?
    //         ethToWithdraw[_requestId][requestCore.getPayer(_requestId)] = _amount;
    //     }
    // }







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

