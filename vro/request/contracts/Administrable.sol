pragma solidity ^0.4.11;


contract Administrable {
    // state of the system
    enum SystemState { Pause, Working, Deprecated }

    // Contract admin for now only the creator 
    address public trustedAdmin;

    // mapping of all address of trusted contract
    mapping(address => uint8) public trustedSubContracts;

    // S1tate of this system
    SystemState public systemState;

    // Events of the system
    event LogSystemPaused();
    event LogSystemResumed();
    event LogSystemDeprecated();
    event LogSystemNewTrustedContracted(address newContract);
    event LogSystemRemoveTrustedContracted(address oldContract);

    function Administrable() {
        trustedAdmin = msg.sender;
        systemState = SystemState.Pause;
    }
    // sub
    // Admin function ----------------------
    // pause system by admin
    function adminPause()
    {
        require(trustedAdmin==msg.sender);
        require(systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Pause;
        LogSystemPaused();
    }

    // resume system by admin
    function adminResume()
    {
        require(trustedAdmin==msg.sender);
        require(systemState==SystemState.Pause || systemState==SystemState.Deprecated); // state must be created only
        systemState = SystemState.Working;
        LogSystemResumed();
    }

    // resume system by admin
    function adminDeprecate()
    {
        require(trustedAdmin==msg.sender);
        require(systemState==SystemState.Pause || systemState==SystemState.Working); // state must be created only
        systemState = SystemState.Deprecated;
        LogSystemDeprecated();
    }
    
    // add new trusted contract
    function adminAddTrustedSubContract(address _newContractAddress)
        systemIsWorking
    {
        require(trustedAdmin==msg.sender);
        trustedSubContracts[_newContractAddress] = 1;
        LogSystemNewTrustedContracted(_newContractAddress);
    }

    // remove trusted contract
    function adminRemoveTrustedSubContract(address _oldTrustedContractAddress)
        systemIsWorking
    {
        require(trustedAdmin==msg.sender);
        require(trustedSubContracts[_oldTrustedContractAddress] != 0);
        trustedSubContracts[_oldTrustedContractAddress] = 0;
        LogSystemRemoveTrustedContracted(_oldTrustedContractAddress);
    }

    // getter system
    function statusContract(address _contractAddress) 
        systemIsWorking
        returns(uint8) 
    {
        return trustedSubContracts[_contractAddress];
    }

    // Modifier system
    modifier isTrustedContract(address _contractAddress) {
        require(statusContract(_contractAddress) == 1);
        _;
    }

    modifier systemIsWorking() {
        require(systemState==SystemState.Working);
        _;
    }
}


