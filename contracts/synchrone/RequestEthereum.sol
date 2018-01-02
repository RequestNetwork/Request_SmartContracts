pragma solidity 0.4.18;

import '../core/RequestCore.sol';
import '../base/math/SafeMath.sol';
import '../base/lifecycle/Pausable.sol';
import './extensions/RequestSynchroneInterface.sol';

/**
 * @title RequestEthereum
 *
 * @dev RequestEthereum is the currency contract managing the request payed in Ethereum
 *
 * @dev Requests can be created by the Payee with createRequest() or by the payer from a request signed offchain by the payee with createQuickRequest
 * @dev Requests can have 1 extension. it has to implement RequestSynchroneInterface and declared trusted on the Core
 */
contract RequestEthereum is Pausable {
    uint32 public constant VERSION = 1;
    
	using SafeMath for uint256;

	// RequestCore object
	RequestCore public requestCore;

	// Ethereum available to withdraw
	mapping(address => uint256) public ethToWithdraw;

    /*
     *  Events 
     */
	event EtherAvailableToWithdraw(bytes32 indexed requestId, address recipient, uint256 amount);

	/*
	 * @dev Constructor
	 * @param _requestCoreAddress Request Core address
	 */  
	function RequestEthereum(address _requestCoreAddress) public
	{
		requestCore=RequestCore(_requestCoreAddress);
	}

	/*
	 * @dev Function to create a request as payee
	 *
	 * @dev msg.sender must be _payee
	 *
	 * @param _payer Entity supposed to pay
	 * @param _expectedAmount Expected amount to be received. This amount can't be changed.
	 * @param _extension an extension can be linked to a request and allows advanced payments conditions such as escrow. Extensions have to be whitelisted in Core
	 * @param _extensionParams Parameters for the extensions. It is an array of 9 bytes32.
	 *
	 * @return Returns the id of the request 
	 */
	function createRequestAsPayee(address _payer, int256 _expectedAmount, address _extension, bytes32[9] _extensionParams, string _data)
		external
		payable
		whenNotPaused
		returns(bytes32 requestId)
	{
		require(_expectedAmount>=0);
		require(msg.sender != _payer && _payer != 0);
		requestId= requestCore.createRequest.value(msg.value)(msg.sender, msg.sender, _payer, _expectedAmount, _extension, _data);

		if(_extension!=0) {
			RequestSynchroneInterface extension = RequestSynchroneInterface(_extension);
			extension.createRequest(requestId, _extensionParams);
		}

		return requestId;
	}


	/*
	 * @dev Function to create a request as payer
	 *
	 * @dev msg.sender must be _payee or _payer
	 *
	 * @param _payee Entity which will receive the payment
	 * @param _expectedAmount Expected amount to be received. This amount can't be changed.
	 * @param _extension an extension can be linked to a request and allows advanced payments conditions such as escrow. Extensions have to be whitelisted in Core
	 * @param _extensionParams Parameters for the extensions. It is an array of 9 bytes32.
	 *
	 * @return Returns the id of the request 
	 */
	function createRequestAsPayer(address _payee, int256 _expectedAmount, address _extension, bytes32[9] _extensionParams, uint256 _additionals, string _data)
		external
		payable
		whenNotPaused
		returns(bytes32 requestId)
	{
		require(_expectedAmount>=0);
		require(msg.sender != _payee && _payee != 0);

		uint256 collectAmount = requestCore.getCollectEstimation(_expectedAmount,msg.sender,_extension);
		requestId= requestCore.createRequest.value(collectAmount)(msg.sender, _payee, msg.sender, _expectedAmount, _extension, _data);

		if(_extension!=0) {
			RequestSynchroneInterface extension = RequestSynchroneInterface(_extension);
			extension.createRequest(requestId, _extensionParams);
		}

		// accept must succeed
		require(acceptInternal(requestId));

		if(_additionals > 0) {
			updateExpectedAmountInternal(requestId, _additionals.toInt256Safe());
		}
		if(msg.value-collectAmount > 0) {
			paymentInternal(requestId, msg.value-collectAmount);
		}

		return requestId;
	}



	/*
	 * @dev Function to broadcast and accept an offchain signed request (can be paid and additionals also)
	 *
	 * @dev msg.sender must be _payer
	 * @dev the _payer can additionals 
	 *
	 * @param _payee Entity which will receive the payment
	 * @param _payer Entity supposed to pay
	 * @param _expectedAmount Expected amount to be received. This amount can't be changed.
	 * @param _extension an extension can be linked to a request and allows advanced payments conditions such as escrow. Extensions have to be whitelisted in Core
	 * @param _extensionParams Parameters for the extension. It is an array of 9 bytes32
	 * @param _additionals amount of additionals the payer want to declare
	 * @param v ECDSA signature parameter v.
	 * @param r ECDSA signature parameters r.
	 * @param s ECDSA signature parameters s.
	 *
	 * @return Returns the id of the request 
	 */
	// function broadcastSignedRequestAsPayer(address _payee, int256 _expectedAmount, address _extension, bytes32[9] _extensionParams, uint256 _additionals, string _data, uint8 v, bytes32 r, bytes32 s)
	// 	external
	// 	payable
	// 	whenNotPaused
	// 	returns(bytes32 requestId)
	// {
	// 	require(_expectedAmount>=0);
	// 	require(msg.sender != _payee && _payee != 0);

	// 	// check the signature
	// 	require(checkRequestSignature(_payee,_payee,msg.sender,_expectedAmount,_extension,_extensionParams,_data, v, r, s));

	// 	uint256 collectAmount = requestCore.getCollectEstimation(_expectedAmount,msg.sender,_extension);
	// 	requestId=requestCore.createRequest.value(collectAmount)(_payee, _payee, msg.sender, _expectedAmount, _extension, _data).value(collectAmount);

	// 	if(_extension!=0) {
	// 		RequestSynchroneInterface extension = RequestSynchroneInterface(_extension);
	// 		extension.createRequest(requestId, _extensionParams);
	// 	}

	// 	// accept must succeed
	// 	require(acceptInternal(requestId));

	// 	if(_additionals > 0) {
	// 		updateExpectedAmountInternal(requestId, _additionals.toInt256Safe());
	// 	}
	// 	if(msg.value-collectAmount > 0) {
	// 		paymentInternal(requestId, msg.value-collectAmount);
	// 	}

	// 	return requestId;
	// }

	// ---- INTERFACE FUNCTIONS ------------------------------------------------------------------------------------

	/*
	 * @dev Function to accept a request
	 *
	 * @dev msg.sender must be _payer or an extension used by the request
	 *
	 * @param _requestId id of the request 
	 *
	 * @return true if the request is accepted, false otherwise
	 */
	function accept(bytes32 _requestId) 
		external
		whenNotPaused
		condition(isOnlyRequestExtension(_requestId) || (requestCore.getPayer(_requestId)==msg.sender && requestCore.getState(_requestId)==RequestCore.State.Created))
		returns(bool)
	{
		return acceptInternal(_requestId);
	}

	/*
	 * @dev Function to declare a payment a request
	 *
	 * @dev msg.sender must be an extension used by the request
	 *
	 * @param _requestId id of the request 
	 * @param _amount amount of the payment to declare
	 *
	 * @return true if the payment is declared, false otherwise
	 */
	function payment(bytes32 _requestId, uint256 _amount)
		external
		whenNotPaused
		onlyRequestExtensions(_requestId)
		returns(bool)
	{
		return paymentInternal(_requestId, _amount);
	}

	/*
	 * @dev Function to order a fund mouvment 
	 *
	 * @dev msg.sender must be an extension used by the request
	 *
	 * @param _requestId id of the request 
	 * @param _recipient adress where the wei has to me send to
	 * @param _amount amount in wei to send
	 *
	 * @return true if the fund mouvement is done, false otherwise
	 */
	function fundOrder(bytes32 _requestId, address _recipient, uint256 _amount)
		external
		whenNotPaused
		onlyRequestExtensions(_requestId)
		returns(bool)
	{
		return fundOrderInternal(_requestId, _recipient, _amount);
	}

	/*
	 * @dev Function to cancel a request
	 *
	 * @dev msg.sender must be the extension used by the request or the _payer (if request is created) or the _payee (if request is not canceled)
	 * @dev only request with balance equals to zero can be cancel
	 *
	 * @param _requestId id of the request 
	 *
	 * @return true if the request is canceled, false otherwise
	 */
	function cancel(bytes32 _requestId)
		external
		whenNotPaused
		returns(bool)
	{
		require(isOnlyRequestExtension(_requestId) 
				|| (requestCore.getPayer(_requestId)==msg.sender && requestCore.getState(_requestId)==RequestCore.State.Created)
				|| (requestCore.getPayee(_requestId)==msg.sender && requestCore.getState(_requestId)!=RequestCore.State.Canceled)
		);

		// impossible to cancel a Request with a balance != 0
		require(requestCore.getBalance(_requestId) == 0);

		return cancelInternal(_requestId);
	}

	// ----------------------------------------------------------------------------------------


	// ---- CONTRACT FUNCTIONS ------------------------------------------------------------------------------------
	/*
	 * @dev Function PAYABLE to pay in ether a request
	 *
	 * @dev the request must be accepted if msg.sender!=payer
	 * @dev the request will be automatically accepted if msg.sender==payer
	 *
	 * @param _requestId id of the request
	 * @param _additionals amount of additionals in wei to declare 
	 */
	function paymentAction(bytes32 _requestId, uint256 _additionals)
		external
		whenNotPaused
		payable
		condition(requestCore.getState(_requestId)==RequestCore.State.Accepted || (requestCore.getState(_requestId)==RequestCore.State.Created && requestCore.getPayer(_requestId)==msg.sender))
	{
		// automatically accept request
		if(requestCore.getState(_requestId)==RequestCore.State.Created) {
			acceptInternal(_requestId);
		}

		if(_additionals > 0) {
			updateExpectedAmountInternal(_requestId, _additionals.toInt256Safe());
		}
		paymentInternal(_requestId, msg.value);
	}

	/*
	 * @dev Function PAYABLE to pay back in ether a request to the payee
	 *
	 * @dev msg.sender must be _payer
	 * @dev the request must be accepted
	 * @dev the payback must be lower than the amount already paid for the request
	 *
	 * @param _requestId id of the request
	 */
	function refundAction(bytes32 _requestId)
		external
		whenNotPaused
		condition(requestCore.getState(_requestId)==RequestCore.State.Accepted)
		onlyRequestPayee(_requestId)
		payable
	{
		refundInternal(_requestId, msg.value);
	}

	/*
	 * @dev Function to declare a subtract
	 *
	 * @dev msg.sender must be _payee or an extension used by the request
	 * @dev the request must be accepted or created
	 *
	 * @param _requestId id of the request
	 * @param _amount amount of subtract in wei to declare 
	 */
	function subtractAction(bytes32 _requestId, uint256 _amount)
		external
		whenNotPaused
		condition(requestCore.getState(_requestId)==RequestCore.State.Accepted || requestCore.getState(_requestId)==RequestCore.State.Created)
		// subtract must be equal or lower than amount expected
		condition(requestCore.getExpectedAmount(_requestId) >= _amount.toInt256Safe())
		onlyRequestPayee(_requestId)
	{
		updateExpectedAmountInternal(_requestId, -_amount.toInt256Safe());
	}

	/*
	 * @dev Function to declare a additional
	 *
	 * @dev msg.sender must be _payer or an extension used by the request
	 * @dev the request must be accepted or created
	 *
	 * @param _requestId id of the request
	 * @param _amount amount of additional in wei to declare 
	 */
	function additionalAction(bytes32 _requestId, uint256 _amount)
		external
		whenNotPaused
		condition(requestCore.getState(_requestId)==RequestCore.State.Accepted || requestCore.getState(_requestId)==RequestCore.State.Created)
		onlyRequestPayer(_requestId)
	{
		updateExpectedAmountInternal(_requestId, _amount.toInt256Safe());
	}


	/*
	 * @dev Function to withdraw ether
	 */
	function withdraw()
		public
	{
		uint256 amount = ethToWithdraw[msg.sender];
		ethToWithdraw[msg.sender] = 0;
		msg.sender.transfer(amount);
	}
	// ----------------------------------------------------------------------------------------


	// ---- INTERNAL FUNCTIONS ------------------------------------------------------------------------------------
	/*
	 * @dev Function internal to manage payment declaration
	 *
	 * @param _requestId id of the request
	 * @param _amount amount of payment in wei to declare 
	 *
	 * @return true if the payment is done, false otherwise
	 */
	function paymentInternal(bytes32 _requestId, uint256 _amount) 
		internal
		returns(bool)
	{
		address extensionAddr = requestCore.getExtension(_requestId);

		bool isOK = true;
		if(extensionAddr!=0 && extensionAddr!=msg.sender) 
		{
			RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddr);
			isOK = extension.payment(_requestId, _amount);
		}

		if(isOK) 
		{
			requestCore.updateBalance(_requestId, _amount.toInt256Safe());
			// payment done, the money is ready to withdraw by the payee
			fundOrderInternal(_requestId, requestCore.getPayee(_requestId), _amount);
		}
		return isOK;
	}

	/*
	 * @dev Function internal to manage refund declaration
	 *
	 * @param _requestId id of the request
	 * @param _amount amount of the refund in wei to declare 
	 *
	 * @return true if the refund is done, false otherwise
	 */
	function refundInternal(bytes32 _requestId, uint256 _amount) 
		internal
		returns(bool)
	{
		address extensionAddr = requestCore.getExtension(_requestId);

		bool isOK = true;
		if(extensionAddr!=0 && extensionAddr!=msg.sender) 
		{
			RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddr);
			isOK = extension.refund(_requestId, _amount);
		}

		if(isOK) 
		{
			requestCore.updateBalance(_requestId, -_amount.toInt256Safe());
			// payment done, the money is ready to withdraw by the payee
			fundOrderInternal(_requestId, requestCore.getPayer(_requestId), _amount);
		}
		return isOK;
	}

	/*
	 * @dev Function internal to manage additionals & subtracts declaration
	 *
	 * @param _requestId id of the request
	 * @param _amount amount of additionals or subtracts in wei to declare 
	 *
	 * @return true if the additionals or subtracts is declared, false otherwise
	 */
	function  updateExpectedAmountInternal(bytes32 _requestId, int256 _amount) 
		internal
		returns(bool)
	{
		address extensionAddr = requestCore.getExtension(_requestId);

		bool isOK = true;
		if(extensionAddr!=0 && extensionAddr!=msg.sender)  
		{
			RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddr);
			isOK = extension.updateExpectedAmount(_requestId, _amount);
		}

		if(isOK) 
		{
			requestCore.updateExpectedAmount(_requestId, _amount);
		}
		return isOK;
	}

	/*
	 * @dev Function internal to manage fund mouvement
	 *
	 * @param _requestId id of the request 
	 * @param _recipient adress where the wei has to me send to
	 * @param _amount amount in wei to send
	 *
	 * @return true if the fund mouvement is done, false otherwise
	 */
	function fundOrderInternal(bytes32 _requestId, address _recipient, uint256 _amount) 
		internal
		returns(bool)
	{
		address extensionAddr = requestCore.getExtension(_requestId);

		bool isOK = true;
		if(extensionAddr!=0 && extensionAddr!=msg.sender)  
		{
			RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddr);
			isOK = extension.fundOrder(_requestId,_recipient,_amount);
		}

		if(isOK) 
		{
			// try to send the fund 
			if(!_recipient.send(_amount)) {
				// if sendding fail, the funds are availbale to withdraw
				ethToWithdraw[_recipient] = ethToWithdraw[_recipient].add(_amount);
				// spread the word that the money is not sent but available to withdraw
				EtherAvailableToWithdraw(_requestId, _recipient, _amount);
			}

		}   
		return isOK;
	}

	/*
	 * @dev Function internal to manage acceptance
	 *
	 * @param _requestId id of the request 
	 *
	 * @return true if the request is accept, false otherwise
	 */
	function acceptInternal(bytes32 _requestId) 
		internal
		returns(bool)
	{
		address extensionAddr = requestCore.getExtension(_requestId);

		bool isOK = true;
		if(extensionAddr!=0 && extensionAddr!=msg.sender)  
		{
			RequestSynchroneInterface extension = RequestSynchroneInterface(requestCore.getExtension(_requestId));
			isOK = extension.accept(_requestId);
		}

		if(isOK) 
		{
			requestCore.accept(_requestId);
		}  
		return isOK;
	}


	/*
	 * @dev Function internal to manage cancel
	 *
	 * @param _requestId id of the request 
	 *
	 * @return true if the request is cancel, false otherwise
	 */
	function cancelInternal(bytes32 _requestId) 
		internal
		returns(bool)
	{
		address extensionAddr = requestCore.getExtension(_requestId);

		bool isOK = true;
		if(extensionAddr!=0 && extensionAddr!=msg.sender)  
		{
			RequestSynchroneInterface extension = RequestSynchroneInterface(extensionAddr);
			isOK = extension.cancel(_requestId);
		}
		
		if(isOK) 
		{
		  requestCore.cancel(_requestId);
		}
		return isOK;
	}


	/*
	 * @dev Function internal to calculate Keccak-256 hash of a request with specified parameters
	 *
	 * @param _payee Entity which will receive the payment
	 * @param _payer Entity supposed to pay
	 * @param _expectedAmount Expected amount to be received. This amount can't be changed.
	 * @param _extensions Up to 3 extensions can be linked to a request and allows advanced payments conditions such as escrow. Extensions have to be whitelisted in Core
	 * @param _extensionParams Parameters for the extensions. It is an array of 9 bytes32, the 3 first element are for the first extension, the 3 next for the second extension and the last 3 for the third extension.
	 *
	 * @return Keccak-256 hash of a request
	 */
	function getRequestHash(address _payee, address _payer, int256 _expectedAmount, address _extension, bytes32[9] _extensionParams, string _data)
		internal
		view
		returns(bytes32)
	{
		return keccak256(this,_payee,_payer,_expectedAmount,_extension,_extensionParams,_data);
	}

	/*
	 * @dev Verifies that a hash signature is valid. 0x style
	 * @param signer address of signer.
	 * @param hash Signed Keccak-256 hash.
	 * @param v ECDSA signature parameter v.
	 * @param r ECDSA signature parameters r.
	 * @param s ECDSA signature parameters s.
	 * @return Validity of order signature.
	 */
	function isValidSignature(
		address signer,
		bytes32 hash,
		uint8 v,
		bytes32 r,
		bytes32 s)
		public
		pure
		returns (bool)
	{
		return signer == ecrecover(
			keccak256("\x19Ethereum Signed Message:\n32", hash),
			v,
			r,
			s
		);
	}

	function checkRequestSignature(
		address signer,
		address payee,
		address payer,
		int256 expectedAmount,
		address extension,
		bytes32[9] extensionParams,
		string data,
		uint8 v,
		bytes32 r,
		bytes32 s)
		public
		view
		returns (bool)
	{
		bytes32 hash = getRequestHash(payee,payer,expectedAmount,extension,extensionParams,data);
		return isValidSignature(signer, hash, v, r, s);
	}

	/*
	 * @dev Function internal to check if the msg.sender is an extension of the request
	 *
	 * @param _requestId id of the request 
	 *
	 * @return true if msg.sender is an extension of the request
	 */
	function isOnlyRequestExtension(bytes32 _requestId) 
		internal 
		view
		returns(bool)
	{
		return msg.sender==requestCore.getExtension(_requestId);
	}

	//modifier
	modifier condition(bool c) 
	{
		require(c);
		_;
	}

	/*
	 * @dev Modifier to check if msg.sender is payer
	 * @dev Revert if msg.sender is not payer
	 * @param _requestId id of the request 
	 */	
	modifier onlyRequestPayer(bytes32 _requestId) 
	{
		require(requestCore.getPayer(_requestId)==msg.sender);
		_;
	}
	
	/*
	 * @dev Modifier to check if msg.sender is payee
	 * @dev Revert if msg.sender is not payee
	 * @param _requestId id of the request 
	 */	
	modifier onlyRequestPayee(bytes32 _requestId) 
	{
		require(requestCore.getPayee(_requestId)==msg.sender);
		_;
	}

	/*
	 * @dev Modifier to check if msg.sender is payee or payer
	 * @dev Revert if msg.sender is not payee or payer
	 * @param _requestId id of the request 
	 */
	modifier onlyRequestPayeeOrPayer(bytes32 _requestId) 
	{
		require(requestCore.getPayee(_requestId)==msg.sender || requestCore.getPayer(_requestId)==msg.sender);
		_;
	}

	/*
	 * @dev Modifier to check if request is in a specify state
	 * @dev Revert if request not in a specify state
	 * @param _requestId id of the request 
	 * @param _state state to check
	 */
	modifier onlyRequestState(bytes32 _requestId, RequestCore.State _state) 
	{
		require(requestCore.getState(_requestId)==_state);
		_;
	}

	/*
	 * @dev Modifier to check if the msg.sender is an extension of the request
	 * @dev Revert if msg.sender is not an extension of the request
	 * @param _requestId id of the request
	 */
	modifier onlyRequestExtensions(bytes32 _requestId) 
	{
		require(isOnlyRequestExtension(_requestId));
		_;
	}
}
