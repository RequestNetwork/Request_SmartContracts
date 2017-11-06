var config = {
	"VERSION_CORE": 1,
	"all":false,
	// "core.js": {
		"requestAdministrable.js":false,    
		"requestCoreCreateRequest.js":false,    
		"requestCoreAcceptDeclineCancel.js":false,
		"requestCoreAdditionalSubtract.js":false,  
		"requestCorePaymentRefund.js":false,  
	// },
	// "synchrone.js": {
	//	 	"ethereum.js": {
				"requestEthereumCreateRequestAsPayee.js":false,
				"requestEthereumCreateRequestAsPayer.js":false,
				"requestEthereumBroadcastSignedRequestAsPayer.js":false,
				"requestEthereumAccept.js":false, 
				"requestEthereumDecline.js":false, 
"requestEthereumWithdraw.js":true, 
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