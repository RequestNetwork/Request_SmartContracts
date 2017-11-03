pragma solidity 0.4.18;

import '../../synchrone/extensions/RequestSynchroneInterface.sol';

contract TestRequestSynchroneInterfaceContinue is RequestSynchroneInterface{
    
    uint constant_id;
    function TestRequestSynchroneInterfaceContinue (uint _id) public {
        constant_id = _id;
    }

    event LogTestCreateRequest(uint requestId, uint id, bytes32[9] _params);
    function createRequest(uint _requestId, bytes32[9] _params) public returns(bool) 
    {
        LogTestCreateRequest(_requestId, constant_id, _params);
        return true;
    }

    event LogTestAccept(uint requestId, uint id);
    function accept(uint _requestId) public returns(bool)
    {
        LogTestAccept(_requestId, constant_id);
        return true;
    } 

    event LogTestDecline(uint requestId, uint id);
    function decline(uint _requestId) public returns(bool)
    {
        LogTestDecline(_requestId, constant_id);
        return true;
    } 

    event LogTestCancel(uint requestId, uint id);
    function cancel(uint _requestId) public returns(bool)
    {
        LogTestCancel(_requestId, constant_id);
        return true;
    } 
 
    event LogTestFundOrder(uint requestId, uint id, address _recipient, uint _amount);
    function fundOrder(uint _requestId, address _recipient, uint _amount) public returns(bool)
    {
        LogTestFundOrder(_requestId, constant_id, _recipient, _amount);
        return true;
    } 

    event LogTestPayment(uint requestId, uint id, uint _amount);
    function payment(uint _requestId, uint _amount) public returns(bool)
    {
        LogTestPayment(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestRefund(uint requestId, uint id, uint _amount);
    function refund(uint _requestId, uint _amount) public returns(bool)
    {
        LogTestRefund(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestAddAdditional(uint requestId, uint id, uint _amount);
    function addAdditional(uint _requestId, uint _amount) public returns(bool)
    {
        LogTestAddAdditional(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestAddSubtract(uint requestId, uint id, uint _amount);
    function addSubtract(uint _requestId, uint _amount) public returns(bool)
    {
        LogTestAddSubtract(_requestId, constant_id, _amount);
        return true;
    } 
}

