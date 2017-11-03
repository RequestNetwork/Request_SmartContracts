pragma solidity 0.4.18;

import '../base/lifecycle/Pausable.sol';

/**
 * @title Administrable
 * @dev Administrable is a base contract to manage the list of trustedContract and the list of TrustedExtension
 */
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

	/**
	 * @dev add a trusted subContract 
	 *
	 * @param _newContractAddress The address of the subContract
	 */
	function adminAddTrustedSubContract(address _newContractAddress)
		external
		onlyOwner
	{
		trustedSubContracts[_newContractAddress] = 1;
		NewTrustedContract(_newContractAddress);
	}

	/**
	 * @dev remove a trusted subContract 
	 *
	 * @param _oldTrustedContractAddress The address of the subContract
	 */
	function adminRemoveTrustedSubContract(address _oldTrustedContractAddress)
		external
		onlyOwner
	{
		require(trustedSubContracts[_oldTrustedContractAddress] != 0);
		trustedSubContracts[_oldTrustedContractAddress] = 0;
		RemoveTrustedContract(_oldTrustedContractAddress);
	}

	/**
	 * @dev add a trusted extension 
	 *
	 * @param _newExtension The address of the extension
	 */
	function adminAddTrustedExtension(address _newExtension)
		external
		onlyOwner
	{
		trustedExtensions[_newExtension] = 1;
		NewTrustedExtension(_newExtension);
	}

	/**
	 * @dev remove a trusted extension 
	 *
	 * @param _oldExtension The address of the extension
	 */
	function adminRemoveExtension(address _oldExtension)
		external
		onlyOwner
	{
		require(trustedExtensions[_oldExtension] != 0);
		trustedExtensions[_oldExtension] = 0;
		RemoveTrustedExtension(_oldExtension);
	}

	/**
	 * @dev get the status of a trusted subContract 
	 *
	 * @param _contractAddress The address of the subContract
	 * @return The status of the subContract. If trusted 1, otherwise 0
	 */
	function getStatusContract(address _contractAddress)
		view
		external
		returns(uint8) 
	{
		return trustedSubContracts[_contractAddress];
	}

	/**
	 * @dev get the status of a trusted extension 
	 *
	 * @param _extension The address of the extension
	 * @return The status of the extension. If trusted 1, otherwise 0
	 */
	function getStatusExtension(address _extension) 
		view
		external
		returns(uint8) 
	{
		return trustedExtensions[_extension];
	}

	/**
	 * @dev Modifier: check if a subContract is trusted
	 * @dev Revert if subContract status is not 1
	 *
	 * @param _contractAddress The address of the subContract
	 */
	modifier isTrustedContract(address _contractAddress) {
		require(trustedSubContracts[_contractAddress] == 1);
		_;
	}

	/**
	 * @dev Modifier: check if the extension is trusted
	 * @dev Revert if extension status is not 1
	 *
	 * @param _extension The address of the extension
	 */
	modifier isTrustedExtension(address _extension) {
		require(_extension==0 || trustedExtensions[_extension]==1);
		_;
	}
}