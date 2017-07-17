pragma solidity 0.4 .11;
import "../Request.sol";



/// Request factory contract - Allows to create request contracts
contract StandardRequest is Request {
  

  /*
   *  Constants
   */

  /*
   *  Modifiers
   */
  modifier isCreator() {
    // Only creator is allowed to proceed
    require(msg.sender == creator);
    _;
  }

  modifier isRecipient() {
    // Only recipient is allowed to proceed
    require(msg.sender == recipient);
    _;
  }

  modifier atStatus(Status _status) {
    // Contract has to be in given status
    require(status == _status);
    _;
  }


  /*
   *  Public functions
   */
  function StandardRequest(address _creator, address _recipient, uint _amount)
  public {
    // Validate inputs
    require(_amount > 0); 

    creator = _creator; //Can this be called by something else thatn the standardrequestFactory?
    createdAtBlock = block.number;
    recipient = _recipient;
    amount = _amount;
    status = Status.RequestCreated;
    RequestCreated();
  }


  function acceptOrReject(bool _accept)
  public
  isRecipient
  atStatus(Status.RequestCreated) //TODO : Attention seulement si pas accepté ou rejeté
    {
      if (_accept) {
        status = Status.RequestAccepted;
      } else {
        status = Status.RequestRejected;
      }
      RequestAcceptedOrRejected(_acceptOrReject);
    }


  function cancel()
  public
  isCreator
  atStatus(Status.RequestCreated) {
    status = Status.RequestCanceled;
    RequestCanceled();
  }

  function pay()
  public
  isRecipient
  payable {
  	require(status == Status.RequestCreated || status == Status.RequestAccepted);
  	require(msg.value == _amount); //TODO : Only accept perfect amount for now... Also, verify that if not correct, reimburse. 
  	
  	recipient.transfer(_amount);
  	status = Status.RequestPaid;
  	RequestPaid();

  }


}
