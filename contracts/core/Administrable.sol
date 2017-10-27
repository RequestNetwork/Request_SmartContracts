pragma solidity ^0.4.11;

import '../base/lifecycle/Pausable.sol';

contract Administrable is Pausable {

    // mapping of address of trusted contract
    mapping(address => uint8) public trustedSubContracts;

    // mapping of address of trusted extensions
    mapping(address => uint8) public trustedExtensions;


    // Events of the system
    event NewTrustedContract(address newContract);
    event RemoveTrustedContract(address oldContract);
    event NewTrustedExtension(address newExtension);
    event RemoveTrustedExtension(address oldExtension);


    // add new trusted contract
    function adminAddTrustedSubContract(address _newContractAddress)
        public
        onlyOwner
    {
        trustedSubContracts[_newContractAddress] = 1;
        NewTrustedContract(_newContractAddress);
    }

    // remove trusted contract
    function adminRemoveTrustedSubContract(address _oldTrustedContractAddress)
        public
        onlyOwner
    {
        require(trustedSubContracts[_oldTrustedContractAddress] != 0);
        trustedSubContracts[_oldTrustedContractAddress] = 0;
        RemoveTrustedContract(_oldTrustedContractAddress);
    }


    // remove trusted extensions
    function adminAddTrustedExtension(address _newExtension)
        public
        onlyOwner
    {
        trustedExtensions[_newExtension] = 1;
        NewTrustedExtension(_newExtension);
    }

    // remove trusted contract
    function adminRemoveExtension(address _oldExtension)
        public
        onlyOwner
    {
        require(trustedExtensions[_oldExtension] != 0);
        trustedExtensions[_oldExtension] = 0;
        RemoveTrustedExtension(_oldExtension);
    }


    // getter system
    function getStatusContract (address _contractAddress)
        public
        returns(uint8) 
    {
        return trustedSubContracts[_contractAddress];
    }

    function getStatusExtension(address _extension) 
        public
        returns(uint8) 
    {
        return trustedExtensions[_extension];
    }

    // Modifier system
    modifier isTrustedContract(address _contractAddress) {
        require(trustedSubContracts[_contractAddress] == 1);
        _;
    }

    modifier areTrustedExtensions(address[3] _extensions) {
        // no zero before
        require(_extensions[2]==0 || _extensions[1]!=0);
        require(_extensions[1]==0 || _extensions[0]!=0);

        // not two equals
        require(_extensions[0]==0 || _extensions[1]==0 || _extensions[0] != _extensions[1]);
        require(_extensions[1]==0 || _extensions[2]==0 || _extensions[1] != _extensions[2]);
        require(_extensions[0]==0 || _extensions[2]==0 || _extensions[0] != _extensions[2]);

        for (uint i = 0; i < _extensions.length && _extensions[i]!=0; i++) 
        {
            require(trustedExtensions[_extensions[i]] == 1);
        }
        _;
    }
}