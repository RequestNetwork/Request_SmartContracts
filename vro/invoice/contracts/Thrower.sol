pragma solidity ^0.4.4;

// Contract you're testing
contract Thrower {
  function doThrow() {
    throw;
  }

  function doNoThrow() {
    //
  }
}
