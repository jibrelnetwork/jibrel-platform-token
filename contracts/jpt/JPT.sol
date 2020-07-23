pragma solidity ^0.5.16;

import "../ERC20/ERC20Pausable.sol";
import "../ERC20/ERC20Votable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";

/**
 * @title Jibrel Platform Token (ERC20)
 */
contract JPT is ERC20Detailed, ERC20Pausable, ERC20Votable {
  constructor () public
    ERC20Detailed("Jibrel Platform Token", "JPT", 18)
  {
    _mint(
      msg.sender,
      200000000 * (10 ** uint256(decimals()))
    );
  }
}
