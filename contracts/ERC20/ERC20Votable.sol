pragma solidity ^0.5.0;

import "../ERC20/ERC20Blockable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @title Votable token
 * @dev Implementation of a contract that provide voting
 *
 * Useful if you want to add voting functions into contract
 */
contract ERC20Votable is ERC20Blockable {
  using SafeMath for uint256;

  /* Data structures */

  struct Voter {
    address account;
    uint256 tokensCount;
    bool isTokensBlocked;
  }

  struct Proposal {
    bool stoped;
    string title;
    string description;
    uint256 tokensInSupport;
    uint256 tokensAgainst;
    mapping (address => bool) voted;
    Voter[] voters;
    bytes32 hash;
    uint256 startDate;
    uint256 endDate;
  }

  /* Storage */

  Proposal[] private _proposals;

  /* Events */

  event CreateProposal(uint256 proposalId, bytes32 proposalHash, string title, string description, uint256 startDate, uint256 endDate);
  event Voted(uint256 proposalId, uint256 votedJNT, bool inSupport);
  event StopVoting(uint256 proposalId, uint256 numberOfVoters, uint256 tokensInSupport, uint256 tokensAgainst);
  event VotingTokensUnblocked(address indexed account, uint256 value);

  /* Getters */

  /**
   * @dev Returns total number of voters by proposal id
   */
  function getTotalVotersNumber(uint256 proposalId) external view returns (uint256) {
    Proposal storage p = _proposals[proposalId];

    return p.voters.length;
  }

  /**
   * @dev Returns total number of "in support" tokens by proposal id
   */
  function getTokensInSupport(uint256 proposalId) external view returns (uint256) {
    Proposal storage p = _proposals[proposalId];

    return p.tokensInSupport;
  }

  /**
   * @dev Returns total number of "against" tokens by proposal id
   */
  function getTokensAgainst(uint256 proposalId) external view returns (uint256) {
    Proposal storage p = _proposals[proposalId];

    return p.tokensAgainst;
  }

  /**
   * @dev Returns title by proposal id
   */
  function getTitle(uint256 proposalId) external view returns (string memory) {
    Proposal storage p = _proposals[proposalId];

    return p.title;
  }

  /**
   * @dev Returns description by proposal id
   */
  function getDescription(uint256 proposalId) external view returns (string memory) {
    Proposal storage p = _proposals[proposalId];

    return p.description;
  }

  /**
   * @dev Returns total numbers of proposals
   */
  function getProposalsNumber() external view returns (uint256) {
    return _proposals.length;
  }

  /**
   * @dev Returns proposal's hash
   */
  function getProposalHash(uint256 proposalId) external view returns (bytes32) {
    Proposal storage p = _proposals[proposalId];

    return p.hash;
  }

  /**
   * @dev Returns proposal's dates
   */
  function getProposalDates(uint256 proposalId) external view returns (uint256, uint256) {
    Proposal storage p = _proposals[proposalId];

    return (p.startDate, p.endDate);
  }


  /* Voting logic */

  /**
   * @dev Create a new proposal
   */
  function createProposal(string calldata title, string calldata description, uint256 startDate, uint256 endDate)
    external
    onlyOwner
  {
    uint256 proposalId = _proposals.length++;
    Proposal storage p = _proposals[proposalId];
    p.hash = keccak256(abi.encodePacked(proposalId, description));
    p.title = title;
    p.description = description;
    p.stoped = false;
    p.tokensInSupport = 0;
    p.tokensAgainst = 0;
    p.startDate = startDate;
    p.endDate = endDate;

    emit CreateProposal(proposalId, p.hash, title, description, startDate, endDate);
  }

  /**
   * @dev Stop voting
   */
  function stopVoting(uint256 proposalId) external onlyOwner {
    Proposal storage p = _proposals[proposalId];
    require(!p.stoped, "ERC20Votable: voting is stoped");

    for (uint256 i = 0; i < p.voters.length; i++) {
      Voter storage voter = p.voters[i];
      if (voter.isTokensBlocked) {
        unblockAccountFunds(voter.account, voter.tokensCount);
        voter.isTokensBlocked = false;
      }
    }

    p.stoped = true;

    emit StopVoting(proposalId, p.voters.length, p.tokensInSupport, p.tokensAgainst);
  }

  /**
   * @dev Add vote with an arbitrary number of tokens
   */
  function _vote(uint256 proposalId, bool inSupport, uint256 tokensCount) internal {
    Proposal storage p = _proposals[proposalId];

    require(!p.stoped, "ERC20Votable: voting is stoped");
    require(p.startDate <= now && now <= p.endDate, "ERC20Votable: voting time expired");
    require(!p.voted[msg.sender], "ERC20Votable: already voted");
    require(tokensCount > 0, "ERC20Votable: balance is zero");
    require(balanceOf(msg.sender) >= tokensCount, "ERC20Votable: no enough balance");

    _blockedFunds[msg.sender] = _blockedFunds[msg.sender].add(tokensCount);

    p.voted[msg.sender] = true;
    p.voters.push(Voter(msg.sender, tokensCount, true)); 
    if (inSupport) {
      p.tokensInSupport = p.tokensInSupport.add(tokensCount);
    } else {
      p.tokensAgainst = p.tokensAgainst.add(tokensCount);
    }

    emit Voted(proposalId, tokensCount, inSupport);
  }

  /**
   * @dev Add a vote with all available tokens
   */
  function vote(uint256 proposalId, bool inSupport) public {
    uint256 balance = balanceOf(msg.sender);
    require(balance > 0, "ERC20Votable: balance is zero");

    _vote(proposalId, inSupport, balance);
  }

  /*
   * @dev Unblock voting tokens
   */
  function unblockVotingTokens(uint256 proposalId, address account) public {
    Proposal storage p = _proposals[proposalId];
    require(account != address(0x0), "ERC20Votable: account is the zero address");
    require(msg.sender == account, "ERC20Votable: wrong sender");
    require(p.stoped || p.endDate <= now, "ERC20Votable: voting time is not expired");

    for (uint256 i = 0; i < p.voters.length; i++) {
      Voter storage voter = p.voters[i];
      if (voter.account == account && voter.isTokensBlocked) {
        _blockedFunds[account] = _blockedFunds[account].sub(voter.tokensCount);
        voter.isTokensBlocked = false;

        emit VotingTokensUnblocked(voter.account, voter.tokensCount);
      }
    }
  }
}
