pragma solidity ^0.4.11;


contract Administrable {
    // State of the system
    enum SystemState { Paused, Active, Deprecated }

    // Contract admin / for now only the creator 
    address public trustedAdmin;

    // mapping of address of trusted contract
    mapping(address => uint8) public trustedSubContracts;

    // mapping of address of trusted extensions
    mapping(address => uint8) public trustedExtensions;

    // State of the system
    SystemState public systemState;

    // Events of the system
    event Paused();
    event Resumed();
    event Deprecated();
    event NewTrustedContract(address newContract);
    event RemoveTrustedContract(address oldContract);
    event NewTrustedExtension(address newExtension);
    event RemoveTrustedExtension(address oldExtension);

    function Administrable() {
        trustedAdmin = msg.sender;
        systemState = SystemState.Paused;
    }
    // sub
    // Admin function ----------------------
    // pause system by admin
    function adminPause()
        onlyAdmin
    {
        require(systemState==SystemState.Active); // state must be created only
        systemState = SystemState.Paused;
        Paused();
    }

    // resume system by admin
    function adminResume()
        onlyAdmin
    {
        require(systemState==SystemState.Paused || systemState==SystemState.Deprecated); // state must be created only
        systemState = SystemState.Active;
        Resumed();
    }

    // resume system by admin
    function adminDeprecate()
        onlyAdmin
    {
        require(systemState==SystemState.Paused || systemState==SystemState.Active); // state must be created only
        systemState = SystemState.Deprecated;
        Deprecated();
    }
    
    // add new trusted contract
    function adminAddTrustedSubContract(address _newContractAddress)
        systemIsActive
        onlyAdmin
    {
        trustedSubContracts[_newContractAddress] = 1;
        NewTrustedContract(_newContractAddress);
    }

    // remove trusted contract
    function adminRemoveTrustedSubContract(address _oldTrustedContractAddress)
        systemIsActive
        onlyAdmin
    {
        require(trustedSubContracts[_oldTrustedContractAddress] != 0);
        trustedSubContracts[_oldTrustedContractAddress] = 0;
        RemoveTrustedContract(_oldTrustedContractAddress);
    }


    // remove trusted extensions
    function adminAddTrustedExtension(address _newExtension)
        systemIsActive
        onlyAdmin
    {
        trustedExtensions[_newExtension] = 1;
        NewTrustedExtension(_newExtension);
    }

    // remove trusted contract
    function adminRemoveExtension(address _oldExtension)
        systemIsActive
        onlyAdmin
    {
        require(trustedExtensions[_oldExtension] != 0);
        trustedExtensions[_oldExtension] = 0;
        RemoveTrustedExtension(_oldExtension);
    }


    // getter system
    function getStatusContract (address _contractAddress)
        systemIsActive
        returns(uint8) 
    {
        return trustedSubContracts[_contractAddress];
    }

    function getStatusExtension(address _extension) 
        systemIsActive
        returns(uint8) 
    {
        return trustedExtensions[_extension];
    }

    // Modifier system
    modifier isTrustedContract(address _contractAddress) {
        require(trustedSubContracts[_contractAddress] == 1);
        _;
    }

    modifier systemIsActive() {
        require(systemState==SystemState.Active);
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

    modifier onlyAdmin() {
        require(trustedAdmin==msg.sender);
        _;
    }

}


