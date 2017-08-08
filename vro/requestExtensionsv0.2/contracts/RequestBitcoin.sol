pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestInterface.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestBitcoin {

    // enum Callback { Payment };

    // RequestCore object
    RequestCore public requestCore;
    address public oracleBitcoin;

    // Ethereum available to withdraw
    struct BitCoinRequest {
        bytes20 addressBitcoinPayee;
        bytes32[] paymentsTxid;
    }
    mapping(uint => BitCoinRequest) public bitCoinLedger;

    // Oracle Event
    event OracleRequestFundReception(uint requestId, address recipient, bytes20 addressBitcoin);
    event OracleResponseFundReception(uint requestId, bytes data);

    // contract constructor
    function RequestBitcoin(address _requestCoreAddress, address _oracleBitcoin) 
    {
        requestCore=RequestCore(_requestCoreAddress);
        oracleBitcoin = _oracleBitcoin;
    }

    function createRequest(address _payer, uint _amountExpected, address[10] _extensions, bytes32[10] _extensionParams0, bytes32[10] _extensionParams1, bytes20 _addressBitcoinPayee)
        onlyIfaddressBitcoinPayeeIsRight(_addressBitcoinPayee)
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

        bitCoinLedger[requestId].addressBitcoinPayee = bytes20(_addressBitcoinPayee);

        return requestId;
    }

    // ---- INTERFACE FUNCTIONS ---------------------------------------
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


    function payment(uint _requestId, uint _amount)
        // onlyRequestExtensions(_requestId)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        returns(bool)
    {
        if(isOnlyRequestExtensions(_requestId)) {
            paymentInternal(_requestId, _amount);    
        } else if (requestCore.getPayee(_requestId)==msg.sender || requestCore.getPayer(_requestId)==msg.sender) {
            requestOracleFundReception(_requestId, requestCore.getPayee(_requestId), bitCoinLedger[_requestId].addressBitcoinPayee);
        } else {
            require(false); // avoid throw, better ?
        }
        
    }

    // function doSendFund(uint _requestId, address _recipient, uint _amount)
    //     onlyRequestExtensions(_requestId)
    //     returns(bool)
    // {
    //     return doSendFundInternal(_requestId, _recipient, _amount);
    // }



    // ---- CONTRACT FUNCTIONS ---------------------------------------
    // ask Oracle
        function requestOracleFundReception(uint _requestId, address _recipient, bytes20 _addressBitcoin) internal {
            OracleRequestFundReception(_requestId, _recipient, _addressBitcoin);
        }

            
        event LogTest(address recipient, bytes32 txid, uint256 amount);

        function oracleFundReception(uint _requestId, bytes _data)  
            onlyBitcoinOracle
        {
            OracleResponseFundReception(_requestId, _data);
            var recipient = address(extractBytes20(_data,0));
            var addressBitcoin = extractBytes20(_data,20);
            var txid = extractBytes32(_data,40);
            var amount = uint256(extractBytes32(_data,72));

            LogTest(recipient, txid, amount);
            // TODO check if addressBitcoin is own by recipient
            if(recipient == requestCore.getPayee(_requestId)) {
                bitCoinLedger[_requestId].paymentsTxid.push(txid);
                paymentInternal(_requestId, amount);
            } else {
                require(false); // TODO temp require (and to avoid throw;)
            }
            
        }

    // -------------------------------------------


    // ---- INTERNAL FUNCTIONS ---------------------------------------    
    function  paymentInternal(uint _requestId, uint _amount) internal
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        returns(bool)
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
        }
        return isOK;
    }

    function extractBytes32(bytes data, uint pos) 
        constant internal
        returns (bytes32 result)
    { 
        for (uint i=0; i<32;i++) result^=(bytes32(0xff00000000000000000000000000000000000000000000000000000000000000)&data[i+pos])>>(i*8);
    }

    function extractBytes20(bytes data, uint pos) 
        constant internal
        returns (bytes20 result)
    { 
        for (uint i=0; i<20;i++) result^=(bytes20(0xff00000000000000000000000000000000000000)&data[i+pos])>>(i*8);
    }
    // -------------------------------------------
 


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
    
    modifier onlyBitcoinOracle() {
        require(oracleBitcoin==msg.sender);
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

    modifier onlyIfaddressBitcoinPayeeIsRight(bytes20 addressbitcoin) {
        // TODO CHECK If addressBitcoin is in the user register
        _;
    }

}

