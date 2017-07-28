pragma solidity ^0.4.11;

contract RequestInterface {
    
    function createRequest(uint _requestId, bytes32[10] _params) returns(bool);

    // accept request
    function accept(uint _requestId) returns(bool);

    // decline request
    function decline(uint _requestId) returns(bool);

    // cancel request
    function cancel(uint _requestId) returns(bool);
 
    // send fund somewhere
    function doSendFund(uint _requestId, address _recipient, uint _amount) returns(bool);

    // declare a payment
    function payment(uint _requestId, uint _amount) returns(bool);

    // declare a refund
    function refund(uint _requestId, uint _amount) returns(bool);

}

