pragma solidity 0.4.11;
import "../Request.sol";


/// @title Abstract request factory contract - Functions to be implemented by request factories
contract RequestFactory {

    /*
     *  Events
     */
    event RequestCreation(address indexed creator, Request request);

    /*
     *  Public functions
     */
    function createRequest(address recipient, uint amount) public returns (Request);
}