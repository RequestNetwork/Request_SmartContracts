pragma solidity ^0.4.11;

contract RequestExtensionInterface {
    
    function createRequest(uint _requestId, address[10] _paramsAddress) returns(bool);

    // accept request
    function accept(uint _requestId) returns(bool);

    // decline request
    function decline(uint _requestId) returns(bool);

    // cancel request
    function cancel(uint _requestId) returns(bool);
 
    // declare a payment
    function payment(uint _requestId, uint _amount) returns(bool);

    // declare a refund
    function refund(uint _requestId, uint _amount) returns(bool);
}

