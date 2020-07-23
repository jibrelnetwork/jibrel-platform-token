const ERC20Votable = artifacts.require('JPT');

const { constants, BN, expectEvent, expectRevert, time } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');

function doSleep(sleepTimeMsec) {
  return new Promise((resolve) => setTimeout(resolve, sleepTimeMsec));
}

contract('ERC20Votable', function (accounts) {
  const [ owner, other, voterInSupport, voterAgainst, voterZeroBalance, ...otherAccounts ] = accounts;

  const voterInSupportBalance = new BN("10000000000000000000");
  const voterAgainstBalance = new BN("20000000000000000000");

  beforeEach(async function () {
    this.token = await ERC20Votable.new({ from: owner });
    await this.token.transfer(voterInSupport, voterInSupportBalance, { from: owner });
    await this.token.transfer(voterAgainst, voterAgainstBalance, { from: owner });

    const startDate = (await time.latest()).sub(time.duration.minutes(1));
    const endDate = (await time.latest()).add(time.duration.minutes(1));
    const receipt = await this.token.createProposal("Proposal", "Desccription", startDate, endDate, { from: owner });
    expect(await this.token.getProposalsNumber()).to.be.bignumber.equal(new BN(1));
  });

  describe('vote', function () {
    it('changes after create proposal', async function () {
      const startDate = (await time.latest()).sub(time.duration.minutes(1));
      const endDate = (await time.latest()).add(time.duration.minutes(1));
      const receipt = await this.token.createProposal("Proposal1", "Desccription1", startDate, endDate, { from: owner });

      expect(await this.token.getProposalsNumber()).to.be.bignumber.equal(new BN(2));
      expectEvent(receipt, 'CreateProposal');

      expect(await this.token.getTitle(new BN(1))).to.equal('Proposal1');
      expect(await this.token.getDescription(new BN(1))).to.equal('Desccription1');
      expect(await this.token.getProposalHash(new BN(1))).to.equal('0xb44977bdb7a3ffb8e106ac5a0f9d0cdc0f37567365f309855768e0e84428090c');
      expect(await this.token.getTokensInSupport(new BN(1))).to.be.bignumber.equal(new BN(0));
      expect(await this.token.getTokensAgainst(new BN(1))).to.be.bignumber.equal(new BN(0));
      expect(await this.token.getTotalVotersNumber(new BN(1))).to.be.bignumber.equal(new BN(0));
    });

    it('changes after vote', async function () {
      let receipt = await this.token.vote(new BN(0), true, { from: voterInSupport });
      expectEvent(receipt, 'Voted');

      receipt = await this.token.vote(new BN(0), false, { from: voterAgainst });
      expectEvent(receipt, 'Voted');

      expect(await this.token.getTokensInSupport(new BN(0))).to.be.bignumber.equal(voterInSupportBalance);
      expect(await this.token.getTokensAgainst(new BN(0))).to.be.bignumber.equal(voterAgainstBalance);
      expect(await this.token.getTotalVotersNumber(new BN(0))).to.be.bignumber.equal(new BN(2));

      expect(await this.token.getAccountBlockedFunds(voterInSupport)).to.be.bignumber.equal(voterInSupportBalance);
      expect(await this.token.getAccountBlockedFunds(voterAgainst)).to.be.bignumber.equal(voterAgainstBalance);

      await expectRevert(
        this.token.transfer(owner, voterInSupportBalance, { from: voterInSupport }),
        "ERC20Blockable: funds is blocked"
      );
      await expectRevert(
        this.token.transfer(owner, voterAgainstBalance, { from: voterAgainst }),
        "ERC20Blockable: funds is blocked"
      );
      await expectRevert(
        this.token.vote(new BN(0), true, { from: voterInSupport }),
        "ERC20Votable: already voted"
      );
      await expectRevert(
        this.token.vote(new BN(0), false, { from: voterAgainst }),
        "ERC20Votable: already voted"
      );
    });

    it('changes after stop voting', async function () {
      await this.token.vote(new BN(0), true, { from: voterInSupport });
      await this.token.vote(new BN(0), false, { from: voterAgainst });
      const receipt = await this.token.stopVoting(new BN(0), { from: owner });
      expectEvent(receipt, 'StopVoting');
      expectEvent(receipt, 'AccountFundsUnblocked');

      expect(await this.token.getAccountBlockedFunds(voterInSupport)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.getAccountBlockedFunds(voterAgainst)).to.be.bignumber.equal(new BN(0));
    });

    it('changes from unblock voting tokens', async function () {
      const startDate = (await time.latest()).sub(time.duration.minutes(1));
      const endDate = (await time.latest()).add(time.duration.seconds(2));
      let receipt = await this.token.createProposal("Proposal1", "Desccription1", startDate, endDate, { from: owner });

      await this.token.vote(new BN(1), true, { from: voterInSupport });
      await this.token.vote(new BN(1), false, { from: voterAgainst });

      await doSleep(2000);

      receipt = await this.token.unblockVotingTokens(new BN(1), voterInSupport, { from: voterInSupport });
      expectEvent(receipt, 'VotingTokensUnblocked');
      receipt = await this.token.unblockVotingTokens(new BN(1), voterAgainst, { from: voterAgainst });
      expectEvent(receipt, 'VotingTokensUnblocked');

      expect(await this.token.getAccountBlockedFunds(voterInSupport)).to.be.bignumber.equal(new BN(0));
      expect(await this.token.getAccountBlockedFunds(voterAgainst)).to.be.bignumber.equal(new BN(0));
    });

    it('guard non-expired proposal from unblock voting tokens', async function () {
      const startDate = (await time.latest()).sub(time.duration.minutes(1));
      const endDate = (await time.latest()).add(time.duration.minutes(2));
      let receipt = await this.token.createProposal("Proposal1", "Desccription1", startDate, endDate, { from: owner });

      await this.token.vote(new BN(1), true, { from: voterInSupport });
      await this.token.vote(new BN(1), false, { from: voterAgainst });

      await expectRevert(
        this.token.unblockVotingTokens(new BN(1), voterInSupport, { from: voterInSupport }),
        "ERC20Votable: voting time is not expired"
      );
      await expectRevert(
        this.token.unblockVotingTokens(new BN(1), voterAgainst, { from: voterAgainst }),
        "ERC20Votable: voting time is not expired"
      );

      expect(await this.token.getAccountBlockedFunds(voterInSupport)).to.be.bignumber.equal(new BN(voterInSupportBalance));
      expect(await this.token.getAccountBlockedFunds(voterAgainst)).to.be.bignumber.equal(new BN(voterAgainstBalance));
    });

    it('should guard blocked tokens from unauthorized unblock', async function () {
      await this.token.vote(new BN(0), true, { from: voterInSupport });
      await this.token.vote(new BN(0), false, { from: voterAgainst });

      await expectRevert(
        this.token.unblockVotingTokens(new BN(0), voterInSupport, { from: other }),
        "ERC20Votable: wrong sender"
      );
      await expectRevert(
        this.token.unblockVotingTokens(new BN(0), voterAgainst, { from: other }),
        "ERC20Votable: wrong sender"
      );

      expect(await this.token.getAccountBlockedFunds(voterInSupport)).to.be.bignumber.equal(new BN(voterInSupportBalance));
      expect(await this.token.getAccountBlockedFunds(voterAgainst)).to.be.bignumber.equal(new BN(voterAgainstBalance));
    });

    it('should guard ownership against stuck state', async function () {
      await expectRevert(
        this.token.unblockVotingTokens(new BN(0), ZERO_ADDRESS, { from: other }),
        "ERC20Votable: account is the zero address"
      );
    });

    it('should guard expired proposal from voting', async function () {
      const startDate = (await time.latest()).sub(time.duration.minutes(1));
      const endDate = (await time.latest()).add(time.duration.seconds(2));
      let receipt = await this.token.createProposal("Proposal1", "Desccription1", startDate, endDate, { from: owner });
      await doSleep(3000);

      await expectRevert(
        this.token.vote(new BN(1), true, { from: voterInSupport }),
        "ERC20Votable: voting time expired"
      );
      await expectRevert(
        this.token.vote(new BN(1), false, { from: voterAgainst }),
        "ERC20Votable: voting time expired"
      );
    });

    it('should guard proposal from vote with zero balance', async function () {
      await expectRevert(
        this.token.vote(new BN(0), false, { from: voterZeroBalance }),
        "ERC20Votable: balance is zero"
      );
    });

    it('should guard stoped proposal from vote', async function () {
      await this.token.stopVoting(new BN(0), { from: owner });

      await expectRevert(
        this.token.vote(new BN(0), false, { from: voterInSupport }),
        "ERC20Votable: voting is stoped"
      );
    });

    it('should guard stoped proposal from re-stop', async function () {
      await this.token.stopVoting(new BN(0), { from: owner });

      await expectRevert(
        this.token.stopVoting(new BN(0), { from: owner }),
        "ERC20Votable: voting is stoped"
      );
    });

    it('should prevent non-owners from create proposal', async function () {
      const startDate = (await time.latest()).sub(time.duration.minutes(1));
      const endDate = (await time.latest()).add(time.duration.minutes(1));
      await expectRevert(
        this.token.createProposal("Proposal1", "Desccription", startDate, endDate, { from: other }),
        'Ownable: caller is not the owner'
      );
    });

    it('should prevent non-owners from stop voting', async function () {
      await expectRevert(
        this.token.stopVoting(new BN(0), { from: other }),
        'Ownable: caller is not the owner'
      );
    });
  });
});
