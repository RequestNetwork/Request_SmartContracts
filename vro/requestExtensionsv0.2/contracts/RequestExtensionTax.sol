pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestSynchroneInterface.sol';

contract RequestExtensionTax is RequestSynchroneInterface{

    // mapping of requestId => tax
    struct RequestTax {
        address subContract;
        address taxer;
        uint16 perTenThousand; // percentage with "2 decimals"
    }
    mapping(uint => RequestTax) public taxs;

    // address of the contract of the request system
    RequestCore public requestCore; // could be in Request Interface ( TODO ? )

    event LogRequestTaxPaid(uint requestId, uint amount);

    // contract RequestExtensionTax
    function RequestExtensionTax(address _requestCoreAddress) 
    {
        requestCore= RequestCore(_requestCoreAddress);
    }

    // ---- INTERFACE FUNCTIONS ------------------------------------------------------------------------------------
    // _params :
    //       - 0 : address of the taxer
    //       - 1 : perTenThousand of the tax (percentage with "2 decimals")
    function createRequest(uint _requestId, bytes32[5] _params)
        isSubContractTrusted(msg.sender)
        returns(bool)
    {
        taxs[_requestId] = RequestTax(msg.sender, address(_params[0]), uint16(_params[1])); // create RequestTax
        return true;
    }


    // we just have to split the fund if it's too the paye
    function fundOrder(uint _requestId, address _recipient, uint _amount)
        isSubContractRight(_requestId)
        returns(bool)
    {
        // if found to payee we refuse the sendfund and create 2 news for taxes
        if(_amount > 0 && _recipient == requestCore.getPayee(_requestId)) {

            uint amountToTaxer = (_amount*taxs[_requestId].perTenThousand)/10000;
            uint amountToPayee = _amount-amountToTaxer;

            require(amountToTaxer+amountToPayee == _amount); // avoid overflow
            require(_amount-amountToTaxer < _amount); // avoid underflow
            
            RequestSynchroneInterface subContract = RequestSynchroneInterface(taxs[_requestId].subContract);
            
            subContract.fundOrder(_requestId, requestCore.getPayee(_requestId), amountToPayee);
            subContract.fundOrder(_requestId, taxs[_requestId].taxer, amountToTaxer);
            LogRequestTaxPaid(_requestId, amountToTaxer);

            return false; // refuse the previous sending fund.
        }
        // otherwise we accept
        return true;
    }
    // ----------------------------------------------------------------------------------------
    
    // ---- TAX FUNCTIONS ------------------------------------------------------------------------------------

    // -------------------------------------------------------------------------------------------------------

    // internal functions

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

    modifier onlyRequestState(uint _requestId, RequestCore.State state) {
        require(requestCore.getState(_requestId)==state);
        _;
    }

    modifier onlyRequestStateOr(uint _requestId, RequestCore.State state1, RequestCore.State state2) {
        require(requestCore.getState(_requestId)==state1 || requestCore.getState(_requestId)==state2);
        _;
    }

    modifier isSubContractTrusted(address subContract) {
        require(requestCore.getStatusContract(subContract)==1);
        _;
    }

    modifier isSubContractRight(uint _requestId)
    {
        require(taxs[_requestId].subContract == msg.sender);
        _;
    }   
}

