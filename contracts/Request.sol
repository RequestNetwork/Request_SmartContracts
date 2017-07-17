pragma solidity 0.4.11;


/// Abstract request contract - Functions to be implemented by request contracts
contract Request {

    /*
     *  Events
     */
    event RequestCreation(address indexed creator, Request request);
    event RequestAcceptedOrRejected(bool accept); //TODO : Which parameter? Accept, reject, paid, canceled...
    event RequestCanceled();
    event RequestPaid();
    
    /*
     *  Storage
     */
    address public creator;
    uint public createdAtBlock;
    address public recipient;
    uint public amount;
    string public currency; //Type? Enum, ISO...?
    Status public status;
    // Hash of all the additional data stored into IFPS?



    enum Status {
        RequestCreated,
        RequestCanceled,
        RequestAccepted,
        RequestRejected,
        RequestPaid
    }

    /*
     *  Public functions
     */
     function acceptOrReject(bool accept) public; 
     function cancel() public; 
     //get a request?
     //detect a payment?

}

