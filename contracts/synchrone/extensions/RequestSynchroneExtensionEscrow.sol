pragma solidity 0.4.18;

import '../../core/RequestCore.sol';
import './RequestSynchroneInterface.sol';
import '../../base/math/SafeMath.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestSynchroneExtensionEscrow is RequestSynchroneInterface {
	using SafeMath for uint256;
	using SafeMathInt for int256;

	enum EscrowState { Created, Refunded, Released }

	// mapping of requestId => escrow
	struct RequestEscrow {
		address currencyContract;
		address escrow;
		EscrowState state;
		uint256 balance;
	}
	mapping(bytes32 => RequestEscrow) public escrows;

	event EscrowPayment(bytes32 indexed requestId, uint256 amount);
	event EscrowReleaseRequest(bytes32 indexed requestId);
	event EscrowRefundRequest(bytes32 indexed requestId);

	// address of the contract of the request system
	RequestCore public requestCore;

	// contract constructor
	function RequestSynchroneExtensionEscrow(address _requestCoreAddress) 
		public
	{
		requestCore = RequestCore(_requestCoreAddress);
	}

	function createRequest(bytes32 _requestId, bytes32[9] _params)
		public
		whenNotPaused
		isCurrencyContractTrusted(msg.sender)
		condition(_params[0]!=0)
		returns(bool)
	{
		escrows[_requestId] = RequestEscrow(msg.sender, address(_params[0]), EscrowState.Created, 0); // create RequestEscrow
		return true;
	}

	function payment(bytes32 _requestId, uint256 _amount)
		public
		whenNotPaused
		isCurrencyContractRight(_requestId)
		inNOTEscrowState(_requestId, EscrowState.Refunded)
		returns(bool)
	{
		escrows[_requestId].balance = escrows[_requestId].balance.add(_amount);

		EscrowPayment(_requestId, _amount);

		return isEscrowReleasedPayment(_requestId);
	}

	// refund request
	function refund(bytes32 _requestId, uint256 _amount)
		public
		whenNotPaused
		isCurrencyContractRight(_requestId)
		returns(bool)
	{
		escrows[_requestId].balance = escrows[_requestId].balance.sub(_amount);
		return true;
	}

	// cancel request
	function cancel(bytes32 _requestId) 
		public
		whenNotPaused
		isCurrencyContractRight(_requestId)
		returns(bool)
	{
		return escrows[_requestId].balance == 0;
	}

		// Escrow Function
	// escrow can release the payment to the seller
	function releaseToPayeeAction(bytes32 _requestId)
		external
		whenNotPaused
		onlyRequestEscrowOrPayer(_requestId)
		inEscrowState(_requestId, EscrowState.Created)
		onlyRequestState(_requestId, RequestCore.State.Accepted)
	{
		// release the money
		escrows[_requestId].state = EscrowState.Released;
		EscrowReleaseRequest(_requestId);

		if(escrows[_requestId].balance > 0) {
			RequestSynchroneInterface currencyContract = RequestSynchroneInterface(escrows[_requestId].currencyContract);
			currencyContract.payment(_requestId, escrows[_requestId].balance);
		}
	}

	// escrow can refund the payment to the âyer
	function releaseToPayerAction(bytes32 _requestId)
		external
		whenNotPaused
		onlyRequestEscrowOrPayee(_requestId)
		inEscrowState(_requestId, EscrowState.Created)
		onlyRequestState(_requestId, RequestCore.State.Accepted)
	{
		// Refund the money
		escrows[_requestId].state = EscrowState.Refunded;
		EscrowRefundRequest(_requestId);

		uint256 amountToRefund = escrows[_requestId].balance;
		escrows[_requestId].balance = 0;

		RequestSynchroneInterface currencyContract = RequestSynchroneInterface(escrows[_requestId].currencyContract);
		if(amountToRefund>0) currencyContract.fundOrder(_requestId, requestCore.getPayer(_requestId), amountToRefund); 
		currencyContract.cancel(_requestId); 
	}


	// internal function 
	function isEscrowReleasedPayment(bytes32 _requestId) 
		view 
		internal 
		returns(bool) 
	{
		return escrows[_requestId].state == EscrowState.Released;
	}


	//modifier
	modifier condition(bool c) {
		require(c);
		_;
	}

	modifier onlyRequestEscrow(bytes32 _requestId) {
		require(escrows[_requestId].escrow==msg.sender);
		_;
	}

	modifier onlyRequestEscrowOrPayer(bytes32 _requestId) {
		require(escrows[_requestId].escrow==msg.sender || requestCore.getPayer(_requestId)==msg.sender);
		_;
	}

	modifier onlyRequestEscrowOrPayee(bytes32 _requestId) {
		require(escrows[_requestId].escrow==msg.sender || requestCore.getPayee(_requestId)==msg.sender);
		_;
	}

	modifier inEscrowState(bytes32 _requestId, EscrowState es) {
		require(escrows[_requestId].state==es);
		_;
	}

	modifier inNOTEscrowState(bytes32 _requestId, EscrowState es) {
		require(escrows[_requestId].state!=es);
		_;
	}

	modifier onlyRequestState(bytes32 _requestId, RequestCore.State state) {
		require(requestCore.getState(_requestId)==state);
		_;
	}

	modifier isCurrencyContractTrusted(address currencyContract) {
		require(requestCore.getStatusContract(currencyContract)==1);
		_;
	}

	modifier isCurrencyContractRight(bytes32 _requestId)
	{
		require(escrows[_requestId].currencyContract == msg.sender);
		_;
	}	 
}
