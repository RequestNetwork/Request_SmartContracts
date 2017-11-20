pragma solidity 0.4.18;

import '../../core/RequestCore.sol';
import '../../synchrone/extensions/RequestSynchroneInterface.sol';

contract TestRequestSynchroneSubContractLauncher {
    
    uint constant_id;
    mapping(bytes32 => address) extensionAddress;

    // RequestCore object
    RequestCore public requestCore;

    bool createRequestReturn;
    bool acceptReturn;
    bool cancelReturn;
    bool fundOrderReturn;
    bool paymentReturn;
    bool refundReturn;
    bool addAdditionalReturn;
    bool addSubtractReturn;


    function TestRequestSynchroneSubContractLauncher (uint _id, uint _requestCoreAddress, bool _createRequest,bool _accept,bool _cancel,bool _fundOrder,bool _payment,bool _refund,bool _addAdditional,bool _addSubtract) 
        public
    {
        constant_id = _id;

        createRequestReturn = _createRequest;
        acceptReturn = _accept;
        cancelReturn = _cancel;
        fundOrderReturn = _fundOrder;
        paymentReturn = _payment;
        refundReturn = _refund;
        addAdditionalReturn = _addAdditional;
        addSubtractReturn = _addSubtract;

        requestCore=RequestCore(_requestCoreAddress);
    }

    // Launcher -------------------------------------------------
    function launchCancel(bytes32 _requestId)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.cancel(_requestId);
    } 

    function launchAccept(bytes32 _requestId)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.accept(_requestId);
    } 

   function launchPayment(bytes32 _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.payment(_requestId,_amount);
    } 

    function launchRefund(bytes32 _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.refund(_requestId,_amount);
    } 
    function launchAddAdditional(bytes32 _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.addAdditional(_requestId,_amount);
    } 

    function launchAddSubtract(bytes32 _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.addSubtract(_requestId,_amount);
    } 
    // --------------------------------------------------------

    function createRequest(address _payee, address _payer, uint _amountExpected, address _extension, bytes32[9] _extensionParams, string _details)
        public
        returns(bytes32 requestId)
    {
        requestId= requestCore.createRequest(msg.sender, _payee, _payer, _amountExpected, _extension, _details);

        if(_extension!=0) {
            RequestSynchroneInterface extension0 = RequestSynchroneInterface(_extension);
            extension0.createRequest(requestId, _extensionParams);
            extensionAddress[requestId] = _extension;
        }

        return requestId;
    }

    event LogTestAccept(bytes32 requestId, uint id);
    function accept(bytes32 _requestId) 
        public
        returns(bool)
    {
        LogTestAccept(_requestId, constant_id);
        requestCore.accept(_requestId);
        return acceptReturn;
    } 

    event LogTestCancel(bytes32 requestId, uint id);
    function cancel(bytes32 _requestId)
        public
        returns(bool)
    {
        LogTestCancel(_requestId, constant_id);
        requestCore.cancel(_requestId);
        return cancelReturn;
    } 
 
    event LogTestFundOrder(bytes32 requestId, uint id, address _recipient, uint _amount);
    function fundOrder(bytes32 _requestId, address _recipient, uint _amount) 
        public
        returns(bool)
    {
        LogTestFundOrder(_requestId, constant_id, _recipient, _amount);
        return fundOrderReturn;
    } 

    event LogTestPayment(bytes32 requestId, uint id, uint _amount);
    function payment(bytes32 _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestPayment(_requestId, constant_id, _amount);
        requestCore.payment(_requestId,_amount);
        return paymentReturn;
    } 

    event LogTestRefund(bytes32 requestId, uint id, uint _amount);
    function refund(bytes32 _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestRefund(_requestId, constant_id, _amount);
        requestCore.refund(_requestId,_amount);
        return refundReturn;
    } 

    event LogTestAddAdditional(bytes32 requestId, uint id, uint _amount);
    function addAdditional(bytes32 _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestAddAdditional(_requestId, constant_id, _amount);
        requestCore.addAdditional(_requestId,_amount);
        return addAdditionalReturn;
    } 

    event LogTestAddSubtract(bytes32 requestId, uint id, uint _amount);
    function addSubtract(bytes32 _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestAddSubtract(_requestId, constant_id, _amount);
        requestCore.addSubtract(_requestId,_amount);
        return addSubtractReturn;
    } 
}

