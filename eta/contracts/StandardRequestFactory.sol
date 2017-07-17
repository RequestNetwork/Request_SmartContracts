pragma solidity 0.4.11;
import "../RequestFactory.sol";
import "../StandardRequest.sol";


/// @title Request factory contract - Allows to create request contracts
contract StandardRequestFactory is RequestFactory {

    /*
     *  Public functions
     */
    function createRequest(address recipient, uint amount)
        public
        returns (Request request)
    {
        request = new StandardRequest(msg.sender, recipient, amount);
        RequestCreation(msg.sender, request);
    }
}