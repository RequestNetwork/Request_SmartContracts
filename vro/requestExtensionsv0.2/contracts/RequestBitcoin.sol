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
        bytes20 addressBitcoinPayer;
    }
    struct BitcoinTx {
        address from;
        address to;
        bytes32 txId;
        bytes20 addressBitcoinTo;
        uint256 amount;
    }
    mapping(uint => BitCoinRequest) public bitCoinLedger;
    mapping(uint => BitcoinTx[]) public bitcoinTxsHistory;

    // Oracle Event
    event OracleRequestFundReception(uint requestId, address from, address to, bytes20 addressBitcoinTo);
    event OracleResponseFundReception(uint requestId, bytes data);

    // BitcoinRequest Event 
    event LogUnknownFund(uint requestId, address recipient, bytes32 _txId);

    // contract constructor
    function RequestBitcoin(address _requestCoreAddress, address _oracleBitcoin) 
    {
        requestCore=RequestCore(_requestCoreAddress);
        oracleBitcoin = _oracleBitcoin;
    }

    function createRequest(address _payer, uint _amountExpected, address[10] _extensions, bytes32[10] _extensionParams0, bytes32[10] _extensionParams1, bytes20 _addressBitcoinPayee, bytes20 _addressBitcoinPayer)
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

        bitCoinLedger[requestId].addressBitcoinPayee = _addressBitcoinPayee;
        bitCoinLedger[requestId].addressBitcoinPayer = _addressBitcoinPayer;

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

    // direct path to the core ?
    function payment(uint _requestId, uint _amount)
        onlyRequestExtensions(_requestId)
        returns(bool)
    {
        requestCore.payment(_requestId, _amount);
        return true;
    }

    function paymentBitcoin(uint _requestId, address to, bytes20 addressBitoinTo)
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        returns(bool)
    {
        if (requestCore.getPayee(_requestId)==msg.sender || requestCore.getPayer(_requestId)==msg.sender) {
            requestOracleFundReception(_requestId, 0, to, addressBitoinTo);
        } else {
            require(false); // avoid throw, better ?
        }   
    }

    // function refund(uint _requestId, uint _amount)
    //     onlyRequestState(_requestId, RequestCore.State.Accepted)
    //     returns(bool)
    // {
    //     // from extension do the job (?)
    //     //if(isOnlyRequestExtensions(_requestId)) {
    //         // refundInternal(_requestId, _amount);    
    //     // if from payee or payer, ask oracle
    //     //} else 
    //     if (requestCore.getPayee(_requestId)==msg.sender || requestCore.getPayer(_requestId)==msg.sender) {
    //         requestOracleFundReception(_requestId, 0, requestCore.getPayer(_requestId), bitCoinLedger[_requestId].addressBitcoinPayer);
    //     } else {
    //         require(false); // avoid throw, better ?
    //     }   
    // }

    // useless ?
    function fundOrder(uint _requestId, address _from, address _to, uint _amount) 
        onlyRequestExtensions(_requestId)
        returns(bool)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);
        
        var notIntercepted = true;
        for (uint i = 0; notIntercepted && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestInterface extension = RequestInterface(extensions[i]);
                notIntercepted = extension.fundOrder(_requestId, _from, _to, _amount);  
            }
        }
    
        if(notIntercepted) {
            bytes20 bitcoinAdressTo = 0;
            if(_to==requestCore.getPayee(_requestId)) {
                bitcoinAdressTo = bitCoinLedger[_requestId].addressBitcoinPayee;
            } else if(_to==requestCore.getPayer(_requestId)) {
                bitcoinAdressTo = bitCoinLedger[_requestId].addressBitcoinPayer;
            }
            // else TODO retrieve addressBitcoin third part in REGISTER ?

            requestOracleFundReception(_requestId, _from, _to, bitcoinAdressTo);
            return true;        
        }
    }

    // function refund(uint _requestId, uint _amount)
    //     // onlyRequestExtensions(_requestId)
    //     onlyRequestState(_requestId, RequestCore.State.Accepted)
    //     returns(bool)
    // {
    //     // from extension do the job (?)
    //     if(isOnlyRequestExtensions(_requestId)) {
    //         // TODO paymentInternal(_requestId, _amount);     !!!!!!!!!!!!!!!!!
    //     // if from payee or payer, ask oracle
    //     } else if (requestCore.getPayee(_requestId)==msg.sender || requestCore.getPayer(_requestId)==msg.sender) {
    //         requestOracleFundReception(_requestId, requestCore.getPayer(_requestId), 0);
    //     } else {
    //         require(false); // avoid throw, better ?
    //     }
        
    // }

    // ---- CONTRACT FUNCTIONS ---------------------------------------
    // ask Oracle
    function requestOracleFundReception(uint _requestId, address _from, address _to, bytes20 _addressBitcoinTo) internal {
        OracleRequestFundReception(_requestId, _from, _to, _addressBitcoinTo);
    }

    event LogTestFUNDRECEPTION(address from, address to, bytes20 toBitcoin,bytes32 txId, uint256 amount); // todo delete

    function oracleFundReception(uint _requestId, bytes _data)  
        // onlyBitcoinOracle
    {
        OracleResponseFundReception(_requestId, _data);
        address from = address(extractBytes20(_data,0));
        address to = address(extractBytes20(_data,20));
        bytes20 toBitcoin = extractBytes20(_data,40);
        // check if the address payee is the right one 
        // require(toBitcoin == bitCoinLedger[_requestId].addressBitcoinPayee);

        bytes32 txId = extractBytes32(_data,60);
        // check if the txId have not been register yet
        require(!txIdAlreadyStored(_requestId, txId));
        uint256 amount = uint256(extractBytes32(_data,92));

        LogTestFUNDRECEPTION(from, to, toBitcoin, txId, amount);

        // TODO check if toBitcoin is own by to WITH REGISTER TODO

        bitcoinTxsHistory[_requestId].push(BitcoinTx(from, to, txId, toBitcoin, amount));
        fundMovementInternal(_requestId, from, to, amount, txId);
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


    // ---- INTERNAL FUNCTIONS ---------------------------------------    
    function  fundMovementInternal(uint _requestId, address _from, address _to, uint _amount, bytes32 _txId) internal
        onlyRequestState(_requestId, RequestCore.State.Accepted)
    {

        address[10] memory extensions = requestCore.getExtensions(_requestId);
        
        var notIntercepted = true;
        for (uint i = 0; notIntercepted && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestInterface extension = RequestInterface(extensions[i]);
                notIntercepted = extension.fundMovement(_requestId, _from, _to, _amount);  
            }
        }
  
        if(notIntercepted) {
            if(_to == requestCore.getPayee(_requestId)) {
                requestCore.payment(_requestId, _amount);
            } else if(_to == requestCore.getPayer(_requestId)) {
               requestCore.refund(_requestId, _amount);
            } else {
                LogUnknownFund(_requestId, _to, _txId);
            }
        }
    }

    /*
    function  paymentInternal(address recipient, uint _requestId, uint _amount) internal
        onlyRequestState(_requestId, RequestCore.State.Accepted)
        returns(bool)
    {
        address[10] memory extensions = requestCore.getExtensions(_requestId);

        var isOK = true;
        for (uint i = 0; isOK && i < extensions.length && extensions[i]!=0; i++) 
        {
            if(msg.sender != extensions[i]) {
                RequestInterface extension = RequestInterface(extensions[i]);
                isOK = isOK && extension.payment(recipient, _requestId, _amount);  
            }
        }
        if(isOK) 
        {
            requestCore.payment(_requestId, _amount);
        }
        return isOK;
    }
*/
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

    function txIdAlreadyStored(uint _requestId, bytes32 _txId) internal returns(bool){
        bool found = false;
        for (uint32 i = 0; !found && i < bitcoinTxsHistory[_requestId].length; i++) 
        {
            found= bitcoinTxsHistory[_requestId][i].txId == _txId;
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

