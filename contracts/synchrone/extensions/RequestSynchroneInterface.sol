pragma solidity 0.4.18;

import '../../base/lifecycle/Pausable.sol';

contract RequestSynchroneInterface is Pausable {
    
    function createRequest(bytes32 _requestId, bytes32[9] _params) public returns(bool);

    // accept request
    function accept(bytes32 _requestId) public returns(bool)
    {
        // nothing to do
        return true;
    } 

    // cancel request
    function cancel(bytes32 _requestId) public returns(bool)
    {
        // nothing to do
        return true;
    } 
 
    // send fund somewhere
    function fundOrder(bytes32 _requestId, address _recipient, uint _amount) public returns(bool)
    {
        // nothing to do
        return true;
    } 

    // declare a payment
    function payment(bytes32 _requestId, uint _amount) public returns(bool)
    {
        // nothing to do
        return true;
    } 

    // declare a refund
    function refund(bytes32 _requestId, uint _amount) public returns(bool)
    {
        // nothing to do
        return true;
    } 

    // declare an additional
    function addAdditional(bytes32 _requestId, uint _amount) public returns(bool)
    {
        // nothing to do
        return true;
    } 

    // declare a subract
    function addSubtract(bytes32 _requestId, uint _amount) public returns(bool)
    {
        // nothing to do
        return true;
    } 
}

