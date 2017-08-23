pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestSynchroneInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestEthereum {

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

    function createRequest(address _payee, address _payer, uint _amountExpected, address[3] _extensions, bytes32[5] _extensionParams0, bytes32[5] _extensionParams1, bytes32[5] _extensionParams2)
        condition(msg.sender==_payee || msg.sender==_payer)
        returns(uint)
    {
        uint requestId= requestCore.createRequest(msg.sender, _payee, _payer, _amountExpected, _extensions);

        if(_extensions[0]!=0) {
            RequestSynchroneInterface extension0 = RequestSynchroneInterface(_extensions[0]);
            extension0.createRequest(requestId, _extensionParams0);
        }

        if(_extensions[1]!=0) {
            RequestSynchroneInterface extension1 = RequestSynchroneInterface(_extensions[1]);
            extension1.createRequest(requestId, _extensionParams1);
        }

        if(_extensions[2]!=0) {
            RequestSynchroneInterface extension2 = RequestSynchroneInterface(_extensions[2]);
            extension2.createRequest(requestId, _extensionParams2);
        }
        return requestId;
    }

    // ---- INTERFACE FUNCTIONS ------------------------------------------------------------------------------------
    // the payer can accept an Request 
    function accept(uint _requestId) 
        condition(isOnlyRequestExtensions(_requestId) || (requestCore.getPayer(_requestId)==msg.sender && requestCore.getState(_requestId)==RequestCore.State.Created))
        // onlyRequestPayer(_requestId)
        // onlyRequestState(_requestId, RequestCore.State.Created)
        returns(bool)
    {
        address[3] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestSynchroneInterface extension = RequestSynchroneInterface(extensions[i]);
                isOK = isOK && extension.accept(_requestId);
            }
        }
        if(isOK) 
        {
            requestCore.accept(_requestId);
        }  
        return isOK;
    }

    // the payer can decline an Request
    function decline(uint _requestId)
        condition(isOnlyRequestExtensions(_requestId) || (requestCore.getPayer(_requestId)==msg.sender && requestCore.getState(_requestId)==RequestCore.State.Created))
        // onlyRequestPayer(_requestId)
        // onlyRequestState(_requestId, RequestCore.State.Created)
        returns(bool)
    {
        address[3] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestSynchroneInterface extension = RequestSynchroneInterface(extensions[i]);
                isOK = isOK && extension.decline(_requestId);
            }
        }
        if(isOK) 
        {
            requestCore.decline(_requestId);
        }  
        return isOK;
    }

    function payment(uint _requestId, uint _amount)
        onlyRequestExtensions(_requestId)
        returns(bool)
    {
        return paymentInternal(_requestId, _amount);
    }

    function fundOrder(uint _requestId, address _recipient, uint _amount)
        onlyRequestExtensions(_requestId)
        returns(bool)
    {
        return fundOrderInternal(_requestId, _recipient, _amount);
    }


    function cancel(uint _requestId)
        condition(isOnlyRequestExtensions(_requestId) || (requestCore.getPayee(_requestId)==msg.sender && requestCore.getState(_requestId)==RequestCore.State.Created))
        returns(bool)
    {
        address[3] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestSynchroneInterface extension = RequestSynchroneInterface(extensions[i]);
                isOK = isOK && extension.cancel(_requestId);
            }
        }
        if(isOK) 
        {
            requestCore.cancel(_requestId);
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
        paymentInternal(_requestId, msg.value);
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
    function  paymentInternal(uint _requestId, uint _amount) internal
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        returns(bool)
    {
        address[3] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestSynchroneInterface extension = RequestSynchroneInterface(extensions[i]);
                isOK = isOK && extension.payment(_requestId, _amount);  
            }
        }
        if(isOK) 
        {
            requestCore.payment(_requestId, _amount);
            // payment done, the money is ready to withdraw by the payee
            fundOrderInternal(_requestId, requestCore.getPayee(_requestId), _amount);
        }
        return isOK;
    }

    function fundOrderInternal(uint _requestId, address _recipient, uint _amount) internal
        returns(bool)
    {
        if(_amount > 0) { // sending 0 doesn't make sense
            address[3] memory extensions = requestCore.getExtensions(_requestId);

            var isOK = true;
            for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
            {
                if(msg.sender != extensions[i]) {
                    RequestSynchroneInterface extension = RequestSynchroneInterface(extensions[i]);
                    isOK = isOK && extension.fundOrder(_requestId, _recipient, _amount);
                }
            }
            if(isOK) 
            {
                // sending fund means make it availbale to withdraw here
                ethToWithdraw[_requestId][_recipient] = _amount;
            }   
            return isOK;
        }  
        return true;
    }
    // ----------------------------------------------------------------------------------------



    // TODO !
    // function refund(uint _requestId, uint _amount)
    //     onlyRequestExtensions(_requestId)
    // {
    //     address[3] memory extensions = requestCore.getExtensions(_requestId);

    //     var isOK = true;
    //     for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
    //     {
    //         if(msg.sender != extensions[i]) {
    //             RequestSynchroneInterface extension = RequestSynchroneInterface(extensions[i]);
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
        address[3] memory extensions = requestCore.getExtensions(_requestId);
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

