pragma solidity 0.4.18;

import '../../synchrone/extensions/RequestSynchroneInterface.sol';

contract TestRequestSynchroneInterfaceContinue is RequestSynchroneInterface{
    
    uint constant_id;
    function TestRequestSynchroneInterfaceContinue (uint _id) public {
        constant_id = _id;
    }

    event LogTestCreateRequest(bytes32 requestId, uint id, bytes32[9] _params);
    function createRequest(bytes32 _requestId, bytes32[9] _params) public returns(bool) 
    {
        LogTestCreateRequest(_requestId, constant_id, _params);
        return true;
    }

    event LogTestAccept(bytes32 requestId, uint id);
    function accept(bytes32 _requestId) public returns(bool)
    {
        LogTestAccept(_requestId, constant_id);
        return true;
    } 

    event LogTestCancel(bytes32 requestId, uint id);
    function cancel(bytes32 _requestId) public returns(bool)
    {
        LogTestCancel(_requestId, constant_id);
        return true;
    } 
 
    event LogTestFundOrder(bytes32 requestId, uint id, address _recipient, uint _amount);
    function fundOrder(bytes32 _requestId, address _recipient, uint _amount) public returns(bool)
    {
        LogTestFundOrder(_requestId, constant_id, _recipient, _amount);
        return true;
    } 

    event LogTestPayment(bytes32 requestId, uint id, uint _amount);
    function payment(bytes32 _requestId, uint _amount) public returns(bool)
    {
        LogTestPayment(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestRefund(bytes32 requestId, uint id, uint _amount);
    function refund(bytes32 _requestId, uint _amount) public returns(bool)
    {
        LogTestRefund(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestAddAdditional(bytes32 requestId, uint id, uint _amount);
    function addAdditional(bytes32 _requestId, uint _amount) public returns(bool)
    {
        LogTestAddAdditional(_requestId, constant_id, _amount);
        return true;
    } 

    event LogTestAddSubtract(bytes32 requestId, uint id, uint _amount);
    function addSubtract(bytes32 _requestId, uint _amount) public returns(bool)
    {
        LogTestAddSubtract(_requestId, constant_id, _amount);
        return true;
    } 
}

