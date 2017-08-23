pragma solidity ^0.4.11;

import './RequestSynchroneInterface.sol';

contract TestRequestSynchroneExtensionLauncher is RequestSynchroneInterface {
    
    uint constant_id;
    mapping(uint => address) contractLaunchedAddress;

    function TestRequestSynchroneExtensionLauncher (uint _id) {
        constant_id = _id;
    }

    // Launcher -------------------------------------------------
    function launchCancel(uint _requestId)
    {
        RequestSynchroneInterface subContract = RequestSynchroneInterface(contractLaunchedAddress[_requestId]);
        subContract.cancel(_requestId);
    } 

    function launchAccept(uint _requestId)
    {
        RequestSynchroneInterface subContract = RequestSynchroneInterface(contractLaunchedAddress[_requestId]);
        subContract.accept(_requestId);
    } 

    function launchDecline(uint _requestId)
    {
        RequestSynchroneInterface subContract = RequestSynchroneInterface(contractLaunchedAddress[_requestId]);
        subContract.decline(_requestId);
    } 

   function launchPayment(uint _requestId, uint _amount)
    {
        RequestSynchroneInterface subContract = RequestSynchroneInterface(contractLaunchedAddress[_requestId]);
        subContract.payment(_requestId,_amount);
    } 

    function launchRefund(uint _requestId, uint _amount)
    {
        RequestSynchroneInterface subContract = RequestSynchroneInterface(contractLaunchedAddress[_requestId]);
        subContract.refund(_requestId,_amount);
    } 
    function launchAddAdditional(uint _requestId, uint _amount)
    {
        RequestSynchroneInterface subContract = RequestSynchroneInterface(contractLaunchedAddress[_requestId]);
        subContract.addAdditional(_requestId,_amount);
    } 

    function launchAddSubtract(uint _requestId, uint _amount)
    {
        RequestSynchroneInterface subContract = RequestSynchroneInterface(contractLaunchedAddress[_requestId]);
        subContract.addSubtract(_requestId,_amount);
    } 
    // --------------------------------------------------------

    event LogTestCreateRequest(uint requestId, uint id, bytes32[5] _params);
    function createRequest(uint _requestId, bytes32[5] _params) returns(bool) 
    {
        contractLaunchedAddress[_requestId] = msg.sender;
        LogTestCreateRequest(_requestId, constant_id, _params);
        return true;
    }

    event LogTestAccept(uint requestId, uint id);
    function accept(uint _requestId) returns(bool)
    {
        LogTestAccept(_requestId, constant_id);
        return true;
    } 

    event LogTestDecline(uint requestId, uint id);
    function decline(uint _requestId) returns(bool)
    {
        LogTestDecline(_requestId, constant_id);
        return true;
    } 

    event LogTestCancel(uint requestId, uint id);
    function cancel(uint _requestId) returns(bool)
    {
        LogTestCancel(_requestId, constant_id);
        return true;
    } 
 
    event LogTestFundOrder(uint requestId, uint id, address _recipient, uint _amount);
    function fundOrder(uint _requestId, address _recipient, uint _amount) returns(bool)
    {
        LogTestFundOrder(_requestId, constant_id, _recipient, _amount);
        return true;
    } 

    event LogTestPayment(uint requestId, uint id, uint _amount);
    function payment(uint _requestId, uint _amount) returns(bool)
    {
        LogTestPayment(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestRefund(uint requestId, uint id, uint _amount);
    function refund(uint _requestId, uint _amount) returns(bool)
    {
        LogTestRefund(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestAddAdditional(uint requestId, uint id, uint _amount);
    function addAdditional(uint _requestId, uint _amount) returns(bool)
    {
        LogTestAddAdditional(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestAddSubtract(uint requestId, uint id, uint _amount);
    function addSubtract(uint _requestId, uint _amount) returns(bool)
    {
        LogTestAddSubtract(_requestId, constant_id, _amount);
        return true;
    } 
}

