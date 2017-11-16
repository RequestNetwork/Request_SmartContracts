var ethABI = require('ethereumjs-abi');
var ethUtil = require('ethereumjs-util');
var config = require("./config.js");

exports.getHashRequest = function(num) {
	return ethUtil.bufferToHex(ethABI.soliditySHA3(["uint256","uint256"], [num,config.VERSION_CORE]));
}

exports.expectThrow = async function(promise) {
  try {
    await promise;
  } catch (error) {
    const invalidOpcode = error.message.search('invalid opcode') >= 0;
    const invalidJump = error.message.search('invalid JUMP') >= 0;
    const outOfGas = error.message.search('out of gas') >= 0;
    const revert = error.message.search('revert') >= 0;

    assert(
      invalidOpcode || invalidJump || outOfGas || revert,
      "Expected throw, got '" + error + "' instead",
    );
    return;
  }
  assert.fail('Expected throw not received');
};