var config = {
	"all":true,
	// "core.js": {
		"requestAdministrable.js":false,    
		"requestCoreCreateRequest.js":false,    
		"requestCoreAcceptDeclineCancel.js":false,
		"requestCoreAdditionalSubtract.js":false,  
		"requestCorePaymentRefund.js":false,  
	// },
	// "synchrone.js": {
	//	 	"ethereum.js": {
				"requestEthereumAccept.js":false, 
				"requestEthereumDecline.js":false, 
				"requestEthereumWithdraw.js":false, 
				"requestEthereumCancel.js":false, 
				"requestEthereumDiscount.js":false, 
				"requestEthereumWithEscrow.js":false, 
				"requestEthereumCreateQuickRequest.js":false, 
				"requestEthereumPay.js":false, 
	//		},
	//		"extensions.js": {
				"requestSyncExtEscrow.js":false
	//		}
	// },
};
module.exports = config;