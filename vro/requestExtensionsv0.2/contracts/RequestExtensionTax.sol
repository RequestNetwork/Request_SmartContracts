pragma solidity ^0.4.11;

import './RequestCore.sol';
import './RequestInterface.sol';

contract RequestExtensionTax is RequestInterface{
    // mapping of requestId => tax
    struct RequestTax {
        address subContract;
        address taxer;
        uint16 perTenThousand; // percentage with "2 decimals"
        uint amountPaidToTax;
        uint amountPaidToPayee;
        uint amountDeclaredPaid;
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
    function createRequest(uint _requestId, bytes32[10] _params)
        isSubContractTrusted(msg.sender)
        returns(bool)
    {
        taxs[_requestId] = RequestTax(msg.sender, address(_params[0]), uint16(_params[1]), 0,0,0); // create RequestTax
        return true;
    }


    // we just have to split the fund if it's too the paye
    function fundOrder(uint _requestId, address _from, address _to, uint _amount) 
        isSubContractRight(_requestId)
        returns(bool)
    {
        // if found to payee we refuse the sendfund and create 2 news for taxes
        if(_amount > 0 && _to == requestCore.getPayee(_requestId)) {

            uint amountToTaxer = (_amount*taxs[_requestId].perTenThousand)/10000;
            uint amountToPayee = _amount-amountToTaxer;

            require(amountToTaxer+amountToPayee == _amount); // avoid overflow
            require(_amount-amountToTaxer < _amount); // avoid underflow
            
            RequestInterface subContract = RequestInterface(taxs[_requestId].subContract);
            
            subContract.fundOrder(_requestId, 0, _to, amountToPayee);
            subContract.fundOrder(_requestId, 0, taxs[_requestId].taxer, amountToTaxer);

            return false; // refuse the previous sending fund.
        }
        // otherwise we accept
        return true;
    }

    function fundMovement(uint _requestId, address _from, address _to, uint _amount)
        isSubContractRight(_requestId)
        returns(bool)
    {
        
        if(_to==taxs[_requestId].taxer) { // don't check the from, todo ?
            // Something todo in case of refund ?
            taxs[_requestId].amountPaidToTax += _amount;
            LogRequestTaxPaid(_requestId, _amount);

            computeAmountPaid(_requestId);

            return false; // interception it was for this ex tension
        } else if(_to==requestCore.getPayee(_requestId)) { // don't check the from, todo ?
            taxs[_requestId].amountPaidToPayee += _amount;

            computeAmountPaid(_requestId);
            return false; // interception !
        // } else if(_to==requestCore.getPayer(_requestId)) { // don't check the from, todo ?
        //     // Something todo in case of refund ?
        //     return true;
        } else {
            // payment to someone not known, nothing to say
            return true;
        }
    }
    // -----------------------------------------------------------------------------------------
    // ----------------------------------------------------------------------------------------

    // internal functions
    function computeAmountPaid(uint _requestId) internal {
        RequestInterface subContract = RequestInterface(taxs[_requestId].subContract);

        uint amountTaxPaidExpected = (requestCore.getAmountExpected(_requestId)*taxs[_requestId].perTenThousand)/10000;
        uint amountPayeeExpected = requestCore.getAmountExpected(_requestId)-amountTaxPaidExpected;

        uint permilTaxPaid = (taxs[_requestId].amountPaidToTax * 1000) / amountTaxPaidExpected;
        uint permilPayeePaid = (taxs[_requestId].amountPaidToPayee * 1000) / amountPayeeExpected;

        uint amountTotalPaidSoFar = 0;
        if(permilPayeePaid < permilTaxPaid) {
            amountTotalPaidSoFar = (requestCore.getAmountExpected(_requestId) * permilPayeePaid) / 1000;
        } else {
            amountTotalPaidSoFar = (requestCore.getAmountExpected(_requestId) * permilTaxPaid) / 1000;
        }
        
        if(amountTotalPaidSoFar > taxs[_requestId].amountDeclaredPaid) {
            subContract.payment(_requestId, amountTotalPaidSoFar-taxs[_requestId].amountDeclaredPaid);
            taxs[_requestId].amountDeclaredPaid = amountTotalPaidSoFar;
        }        
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

