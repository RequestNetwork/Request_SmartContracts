pragma solidity 0.4.18;

import './RequestBurnManagerInterface.sol';
import '../base/math/SafeMath.sol';
import '../base/lifecycle/Pausable.sol';

/**
 * @title RequestBurnManagerSimple
 *
 * @dev RequestBurnManagerSimple is a contract managing the fees in the most simple way (percentage of the expected amount)
 */
contract RequestBurnManagerSimple is RequestBurnManagerInterface, Pausable {
	using SafeMath for uint256;

	// fees percentage (per 10 000)
	uint16 public feesPerTenThousand;

	// address of the contract that will burn req token (probably through Kyber)
	address public reqBurnerContract;

	/*
	 * @dev Constructor
	 * @param _requestCoreAddress Request Core address
	 */  
	function RequestBurnManagerSimple(address _reqBurnerContract) 
		public
	{
		reqBurnerContract = _reqBurnerContract;
	}

	/*
	 * @dev collect Fees
	 * @param _requestId Request id
	 */  
	function collectForReqBurning(int256 _expectedAmount, address _currencyContract, address _extension)
		external
		payable
		returns(bool)
	{
		if(collectEstimation(_expectedAmount,_currencyContract,_extension)==msg.value) {
			return reqBurnerContract.send(msg.value);
		} else {
			return false;
		}
	}

	/*
	 * @dev computeFees
	 * @param _requestId Request id
	 * @return 
	 */  
	function collectEstimation(int256 _expectedAmount, address _currencyContract, address _extension)
		public
		view
		returns(uint256)
	{
		if(_expectedAmount<0) return 0;
		return uint256(_expectedAmount).mul(uint256(feesPerTenThousand)).div(10000);
	}


	/*
	 * @dev computeFees
	 * @param _requestId Request id
	 * @return 
	 */  
	function setFeesPerTenThousand(uint16 _newFees) 
		external
		onlyOwner
	{
		feesPerTenThousand=_newFees;
	}

	/*
	 * @dev setReqBurnerContract
	 * @param _reqBurnerContract address of the contract that will burn req token (probably through Kyber)
	 * @return 
	 */  
	function setReqBurnerContract(address _reqBurnerContract) 
		external
		onlyOwner
	{
		reqBurnerContract=_reqBurnerContract;
	}
}
