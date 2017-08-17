pragma solidity ^0.4.11;


contract Administrable {
    // state of the system
    enum SystemState { Paused, Working, Deprecated }

    // Contract admin for now only the creator 
    address public trustedAdmin;

    // mapping of address of trusted contract
    mapping(address => uint8) public trustedSubContracts;

    // mapping of address of trusted contract
    mapping(address => uint8) public trustedExtensions;

    // S1tate of this system
    SystemState public systemState;

    // Events of the system
    event LogSystemPaused();
    event LogSystemResumed();
    event LogSystemDeprecated();
    event LogSystemNewTrustedContracted(address newContract);
    event LogSystemRemoveTrustedContracted(address oldContract);
    event LogSystemNewExtension(address newExtension);
    event LogSystemRemoveExtension(address oldExtension);

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
        require(systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Paused;
        LogSystemPaused();
    }

    // resume system by admin
    function adminResume()
        onlyAdmin
    {
        require(systemState==SystemState.Paused || systemState==SystemState.Deprecated); // state must be created only
        systemState = SystemState.Working;
        LogSystemResumed();
    }

    // resume system by admin
    function adminDeprecate()
        onlyAdmin
    {
        require(systemState==SystemState.Paused || systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Deprecated;
        LogSystemDeprecated();
    }
    
    // add new trusted contract
    function adminAddTrustedSubContract(address _newContractAddress)
        systemIsWorking
        onlyAdmin
    {
        trustedSubContracts[_newContractAddress] = 1;
        LogSystemNewTrustedContracted(_newContractAddress);
    }

    // remove trusted contract
    function adminRemoveTrustedSubContract(address _oldTrustedContractAddress)
        systemIsWorking
        onlyAdmin
    {
        require(trustedSubContracts[_oldTrustedContractAddress] != 0);
        trustedSubContracts[_oldTrustedContractAddress] = 0;
        LogSystemRemoveTrustedContracted(_oldTrustedContractAddress);
    }


    // remove trusted extensions
    function adminAddTrustedExtension(address _newExtension)
        systemIsWorking
        onlyAdmin
    {
        trustedExtensions[_newExtension] = 1;
        LogSystemNewExtension(_newExtension);
    }

    // remove trusted contract
    function adminRemoveExtension(address _oldExtension)
        systemIsWorking
        onlyAdmin
    {
        require(trustedExtensions[_oldExtension] != 0);
        trustedExtensions[_oldExtension] = 0;
        LogSystemRemoveExtension(_oldExtension);
    }


    // getter system
    function getStatusContract (address _contractAddress)
        systemIsWorking
        returns(uint8) 
    {
        return trustedSubContracts[_contractAddress];
    }

    function getStatusExtension(address _extension) 
        systemIsWorking
        returns(uint8) 
    {
        return trustedExtensions[_extension];
    }

    // Modifier system
    modifier isTrustedContract(address _contractAddress) {
        require(trustedSubContracts[_contractAddress] == 1);
        _;
    }

    modifier systemIsWorking() {
        require(systemState==SystemState.Working);
        _;
    }

    modifier areTrustedExtensions(address[10] _extensions) {
        for (uint i = 0; i < _extensions.length && _extensions[i]!=0 ; i++) 
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


