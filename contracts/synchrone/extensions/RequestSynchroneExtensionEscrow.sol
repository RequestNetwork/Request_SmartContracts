pragma solidity 0.4.18;

import '../../core/RequestCore.sol';
import './RequestSynchroneInterface.sol';
import '../../base/math/SafeMath.sol';

// many pattern from http://solidity.readthedocs.io/en/develop/types.html#structs
contract RequestSynchroneExtensionEscrow is RequestSynchroneInterface {
	using SafeMath for uint;

	enum EscrowState { Created, Refunded, Released }

	// mapping of requestId => escrow
	struct RequestEscrow {
		address subContract;
		address escrow;
		EscrowState state;
		uint amountPaid;
		uint amountRefunded;
	}
	mapping(bytes32 => RequestEscrow) public escrows;

	event EscrowPayment(bytes32 requestId, uint amount);
	event EscrowReleaseRequest(bytes32 requestId);
	event EscrowRefundRequest(bytes32 requestId);

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
		isSubContractTrusted(msg.sender)
		condition(_params[0]!=0)
		returns(bool)
	{
		escrows[_requestId] = RequestEscrow(msg.sender, address(_params[0]), EscrowState.Created, 0,0); // create RequestEscrow
		return true;
	}

	function payment(bytes32 _requestId, uint _amount)
		public
		whenNotPaused
		isSubContractRight(_requestId)
		inNOTEscrowState(_requestId, EscrowState.Refunded)
		returns(bool)
	{
		require(_amount.add(escrows[_requestId].amountPaid).sub(escrows[_requestId].amountRefunded) <= requestCore.getAmountInitialAfterSubAdd(_requestId)); // value must be greater than 0 and all the payments should not overpass the amountExpected

		escrows[_requestId].amountPaid = escrows[_requestId].amountPaid.add(_amount);

		EscrowPayment(_requestId, _amount);

		return isEscrowReleasedPayment(_requestId);
	}

	// cancel request
	function cancel(bytes32 _requestId) 
		public
		whenNotPaused
		isSubContractRight(_requestId)
		returns(bool)
	{
		return escrows[_requestId].amountPaid.sub(escrows[_requestId].amountRefunded) == 0;
	}

		// Escrow Function
	// escrow can release the payment to the seller
	function releaseToPayee(bytes32 _requestId)
		external
		whenNotPaused
		onlyRequestEscrowOrPayer(_requestId)
		inEscrowState(_requestId, EscrowState.Created)
		onlyRequestState(_requestId, RequestCore.State.Accepted)
	{
		// release the money
		escrows[_requestId].state = EscrowState.Released;
		EscrowReleaseRequest(_requestId);

		uint amountToPaid = escrows[_requestId].amountPaid.sub(escrows[_requestId].amountRefunded);

		if(amountToPaid > 0) {
			RequestSynchroneInterface subContract = RequestSynchroneInterface(escrows[_requestId].subContract);
			subContract.payment(_requestId, amountToPaid);
		}
	}

	// escrow can refund the payment to the âyer
	function refundToPayer(bytes32 _requestId)
		external
		whenNotPaused
		onlyRequestEscrowOrPayee(_requestId)
		inEscrowState(_requestId, EscrowState.Created)
		onlyRequestState(_requestId, RequestCore.State.Accepted)
	{
		// Refund the money
		escrows[_requestId].state = EscrowState.Refunded;
		EscrowRefundRequest(_requestId);

		uint amountToRefund = escrows[_requestId].amountPaid.sub(escrows[_requestId].amountRefunded);
		escrows[_requestId].amountRefunded = escrows[_requestId].amountPaid;

		RequestSynchroneInterface subContract = RequestSynchroneInterface(escrows[_requestId].subContract);
		if(amountToRefund>0) subContract.fundOrder(_requestId, requestCore.getPayer(_requestId), amountToRefund); 
		subContract.cancel(_requestId); 
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

	modifier isSubContractTrusted(address subContract) {
		require(requestCore.getStatusContract(subContract)==1);
		_;
	}

	modifier isSubContractRight(bytes32 _requestId)
	{
		require(escrows[_requestId].subContract == msg.sender);
		_;
	}   
}
