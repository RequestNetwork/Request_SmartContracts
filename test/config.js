var config = {
	"VERSION_CORE": 1,
	"all":true,
	// "core.js": {
		"requestAdministrable.js":false,    
		"requestCoreCreateRequest.js":false,    
		"requestCoreAcceptCancel.js":false,
		"requestCoreAdditionalSubtract.js":false,  
		"requestCorePaymentRefund.js":false,  
	// },
	// "synchrone.js": {
	//	 	"ethereum.js": {
				"requestEthereumCreateRequestAsPayee.js":false,
				"requestEthereumCreateRequestAsPayer.js":false,
				"requestEthereumBroadcastSignedRequestAsPayer.js":false,
				"requestEthereumAccept.js":false, 
				"requestEthereumCancelByPayer.js":false, 
				"requestEthereumWithdraw.js":false, 
				"requestEthereumCancel.js":false, 
				"requestEthereumDiscount.js":false, 
				"requestEthereumWithEscrow.js":false, 
				"requestEthereumPay.js":false, 
				"requestEthereumPayBack.js":false, 
	//		},
	//		"extensions.js": {
				"requestSyncExtEscrow.js":false
	//		}
	// },
};
module.exports = config;