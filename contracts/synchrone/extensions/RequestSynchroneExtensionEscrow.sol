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
	mapping(uint => RequestEscrow) public escrows;

	event EscrowPayment(uint requestId, uint amount);
	event EscrowReleaseRequest(uint requestId);
	event EscrowRefundRequest(uint requestId);

	// address of the contract of the request system
	RequestCore public requestCore;

	// contract constructor
	function RequestSynchroneExtensionEscrow(address _requestCoreAddress) 
		public
	{
		requestCore = RequestCore(_requestCoreAddress);
	}

	function createRequest(uint _requestId, bytes32[9] _params, uint8 _index)
		public
		isSubContractTrusted(msg.sender)
    	condition(_params[0]!=0)
		returns(bool)
	{
		escrows[_requestId] = RequestEscrow(msg.sender, address(_params[_index*2+0]), EscrowState.Created, 0,0); // create RequestEscrow
		return true;
	}

	function payment(uint _requestId, uint _amount)
		public
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
    function cancel(uint _requestId) 
		public
		isSubContractRight(_requestId)
		returns(bool)
    {
        return escrows[_requestId].amountPaid.sub(escrows[_requestId].amountRefunded) == 0;
    } 
 
		// Escrow Function
	// escrow can release the payment to the seller
	function releaseToPayee(uint _requestId)
		public
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
	function refundToPayer(uint _requestId)
		public
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
	function isEscrowReleasedPayment(uint _requestId) view internal returns(bool) 
	{
		return escrows[_requestId].state == EscrowState.Released;
	}


	//modifier
	modifier condition(bool c) {
		require(c);
		_;
	}

	modifier onlyRequestEscrow(uint _requestId) {
		require(escrows[_requestId].escrow==msg.sender);
		_;
	}

	modifier onlyRequestEscrowOrPayer(uint _requestId) {
		require(escrows[_requestId].escrow==msg.sender || requestCore.getPayer(_requestId)==msg.sender);
		_;
	}

	modifier onlyRequestEscrowOrPayee(uint _requestId) {
		require(escrows[_requestId].escrow==msg.sender || requestCore.getPayee(_requestId)==msg.sender);
		_;
	}

	modifier inEscrowState(uint _requestId, EscrowState es) {
		require(escrows[_requestId].state==es);
		_;
	}

	modifier inNOTEscrowState(uint _requestId, EscrowState es) {
		require(escrows[_requestId].state!=es);
		_;
	}

	modifier onlyRequestState(uint _requestId, RequestCore.State state) {
		require(requestCore.getState(_requestId)==state);
		_;
	}

	modifier isSubContractTrusted(address subContract) {
		require(requestCore.getStatusContract(subContract)==1);
		_;
	}

	modifier isSubContractRight(uint _requestId)
	{
		require(escrows[_requestId].subContract == msg.sender);
		_;
	}   
}
