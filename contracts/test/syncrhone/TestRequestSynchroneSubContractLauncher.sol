pragma solidity 0.4.18;

import '../../core/RequestCore.sol';
import '../../synchrone/extensions/RequestSynchroneInterface.sol';

contract TestRequestSynchroneSubContractLauncher {
    
    uint constant_id;
    mapping(uint => address) extensionAddress;

    // RequestCore object
    RequestCore public requestCore;

    bool createRequestReturn;
    bool acceptReturn;
    bool declineReturn;
    bool cancelReturn;
    bool fundOrderReturn;
    bool paymentReturn;
    bool refundReturn;
    bool addAdditionalReturn;
    bool addSubtractReturn;


    function TestRequestSynchroneSubContractLauncher (uint _id, uint _requestCoreAddress, bool _createRequest,bool _accept,bool _decline,bool _cancel,bool _fundOrder,bool _payment,bool _refund,bool _addAdditional,bool _addSubtract) 
        public
    {
        constant_id = _id;

        createRequestReturn = _createRequest;
        acceptReturn = _accept;
        declineReturn = _decline;
        cancelReturn = _cancel;
        fundOrderReturn = _fundOrder;
        paymentReturn = _payment;
        refundReturn = _refund;
        addAdditionalReturn = _addAdditional;
        addSubtractReturn = _addSubtract;

        requestCore=RequestCore(_requestCoreAddress);
    }

    // Launcher -------------------------------------------------
    function launchCancel(uint _requestId)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.cancel(_requestId);
    } 

    function launchAccept(uint _requestId)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.accept(_requestId);
    } 

    function launchDecline(uint _requestId)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.decline(_requestId);
    } 

   function launchPayment(uint _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.payment(_requestId,_amount);
    } 

    function launchRefund(uint _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.refund(_requestId,_amount);
    } 
    function launchAddAdditional(uint _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.addAdditional(_requestId,_amount);
    } 

    function launchAddSubtract(uint _requestId, uint _amount)
        public
    {
        RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddress[_requestId]);
        extension.addSubtract(_requestId,_amount);
    } 
    // --------------------------------------------------------

    function createRequest(address _payee, address _payer, uint _amountExpected, address[3] _extensions, bytes32[9] _extensionParams)
        public
        returns(uint)
    {
        uint requestId= requestCore.createRequest(msg.sender, _payee, _payer, _amountExpected, _extensions);

        if(_extensions[0]!=0) {
            RequestSynchroneInterface extension0 = RequestSynchroneInterface(_extensions[0]);
            extension0.createRequest(requestId, _extensionParams, 0);
            extensionAddress[requestId] = _extensions[0];
        }

        return requestId;
    }

    event LogTestAccept(uint requestId, uint id);
    function accept(uint _requestId) 
        public
        returns(bool)
    {
        LogTestAccept(_requestId, constant_id);
        requestCore.accept(_requestId);
        return acceptReturn;
    } 

    event LogTestDecline(uint requestId, uint id);
    function decline(uint _requestId)
        public
        returns(bool)
    {
        LogTestDecline(_requestId, constant_id);
        requestCore.decline(_requestId);
        return declineReturn;
    } 

    event LogTestCancel(uint requestId, uint id);
    function cancel(uint _requestId)
        public
        returns(bool)
    {
        LogTestCancel(_requestId, constant_id);
        requestCore.cancel(_requestId);
        return cancelReturn;
    } 
 
    event LogTestFundOrder(uint requestId, uint id, address _recipient, uint _amount);
    function fundOrder(uint _requestId, address _recipient, uint _amount) 
        public
        returns(bool)
    {
        LogTestFundOrder(_requestId, constant_id, _recipient, _amount);
        return fundOrderReturn;
    } 

    event LogTestPayment(uint requestId, uint id, uint _amount);
    function payment(uint _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestPayment(_requestId, constant_id, _amount);
        requestCore.payment(_requestId,_amount);
        return paymentReturn;
    } 

    event LogTestRefund(uint requestId, uint id, uint _amount);
    function refund(uint _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestRefund(_requestId, constant_id, _amount);
        requestCore.refund(_requestId,_amount);
        return refundReturn;
    } 

    event LogTestAddAdditional(uint requestId, uint id, uint _amount);
    function addAdditional(uint _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestAddAdditional(_requestId, constant_id, _amount);
        requestCore.addAdditional(_requestId,_amount);
        return addAdditionalReturn;
    } 

    event LogTestAddSubtract(uint requestId, uint id, uint _amount);
    function addSubtract(uint _requestId, uint _amount) 
        public
        returns(bool)
    {
        LogTestAddSubtract(_requestId, constant_id, _amount);
        requestCore.addSubtract(_requestId,_amount);
        return addSubtractReturn;
    } 
}

