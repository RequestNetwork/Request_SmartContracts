pragma solidity ^0.4.11;

contract RequestInterface {
    
    function createRequest(uint _requestId, bytes32[10] _params) returns(bool);

    // accept request
    function accept(uint _requestId) returns(bool)
    {
        // nothing to do
        return true;
    } 

    // decline request
    function decline(uint _requestId) returns(bool)
    {
        // nothing to do
        return true;
    } 

    // cancel request
    function cancel(uint _requestId) returns(bool)
    {
        // nothing to do
        return true;
    } 
 
    // declare a payment
    function payment(uint _requestId, uint _amount) returns(bool)
    {
        // nothing to do
        return true;
    } 

    // declare a refund
    function refund(uint _requestId, uint _amount) returns(bool)
    {
        // nothing to do
        return true;
    } 


    function fundMovement(uint _requestId, address _from, address _to, uint _amount) returns(bool)
    {
        // nothing to do
        return true;
    } 

    function fundOrder(uint _requestId, address _from, address _to, uint _amount) returns(bool)
    {
        // nothing to do
        return true;
    } 
}

