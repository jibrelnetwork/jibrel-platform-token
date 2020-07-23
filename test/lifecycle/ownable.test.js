const Ownable = artifacts.require('JPT');

const { constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const { expect } = require('chai');


contract('Ownable', function (accounts) {
  const [ owner, proposedOwner, other, ...otherAccounts ] = accounts;

  beforeEach(async function () {
    this.ownable = await Ownable.new({ from: owner });
  });

  context('should behave like ownable', function () {
    describe('as an ownable', function () {
      it('should have an owner', async function () {
        expect(await this.ownable.owner()).to.equal(owner);
      });

      it('should prevent non-owners from transferring', async function () {
        await expectRevert(
          this.ownable.createOwnershipOffer(other, { from: other }),
          'Ownable: caller is not the owner'
        );
      });

      it('should guard ownership against stuck state', async function () {
        await expectRevert(
          this.ownable.createOwnershipOffer(ZERO_ADDRESS, { from: owner }),
          'Ownable: proposed owner is the zero address'
        );
        await expectRevert(
          this.ownable.createOwnershipOffer(this.ownable.address, { from: owner }),
          'Ownable: the contract cannot be owner'
        );
        await expectRevert(
          this.ownable.acceptOwnershipOffer({ from: owner }),
          'Ownable: proposed owner is the zero address'
        );
      });

      it('changes after create offer', async function () {
        expect(await this.ownable.isOwner({ from: proposedOwner })).to.equal(false);
        const receipt = await this.ownable.createOwnershipOffer(proposedOwner, { from: owner });
        expectEvent(receipt, 'OwnershipOfferCreated');

        expect(await this.ownable.owner()).to.equal(owner);
        expect(await this.ownable.isOwner({ from: proposedOwner })).to.equal(false);
      });

      it('should guard offer from re-creating', async function () {
        const receipt = await this.ownable.createOwnershipOffer(proposedOwner, { from: owner });

        await expectRevert(
          this.ownable.createOwnershipOffer(other, { from: owner }),
          'Ownable: the proposal already exists'
        );
      });

      it('changes after accept offer', async function () {
        await this.ownable.createOwnershipOffer(proposedOwner, { from: owner });
        const receipt = await this.ownable.acceptOwnershipOffer({ from: proposedOwner });

        expectEvent(receipt, 'OwnershipTransferred');
        expectEvent(receipt, 'OwnershipOfferAccepted');

        expect(await this.ownable.owner()).to.equal(proposedOwner);
        expect(await this.ownable.isOwner({ from: proposedOwner })).to.equal(true);
      });

      it('should prevent non-owners from accepting offer', async function () {
        await this.ownable.createOwnershipOffer(proposedOwner, { from: owner });
        await expectRevert(
          this.ownable.acceptOwnershipOffer({ from: other }),
          'Ownable: caller is not the proposed owner'
        );
        await expectRevert(
          this.ownable.acceptOwnershipOffer({ from: owner }),
          'Ownable: caller is not the proposed owner'
        );
      });

      it('canceling offer by owner', async function () {
        let receipt = await this.ownable.createOwnershipOffer(proposedOwner, { from: owner });
        expectEvent(receipt, 'OwnershipOfferCreated');

        receipt = await this.ownable.cancelOwnershipOffer({ from: owner }),
        expectEvent(receipt, 'OwnershipOfferCancelled');
      });

      it('canceling offer by proposed owner', async function () {
        let receipt = await this.ownable.createOwnershipOffer(proposedOwner, { from: owner });
        expectEvent(receipt, 'OwnershipOfferCreated');

        receipt = await this.ownable.cancelOwnershipOffer({ from: proposedOwner }),
        expectEvent(receipt, 'OwnershipOfferCancelled');
      });

      it('should guard offer from canceling by non-owners', async function () {
        const receipt = await this.ownable.createOwnershipOffer(proposedOwner, { from: owner });

        await expectRevert(
          this.ownable.cancelOwnershipOffer({ from: other }),
          'Ownable: caller neither owner nor proposed owner'
        );
      });

      it('loses owner after renouncement', async function () {
        const receipt = await this.ownable.renounceOwnership({ from: owner });
        expectEvent(receipt, 'OwnershipTransferred');
  
        expect(await this.ownable.owner()).to.equal(ZERO_ADDRESS);
      });

      it('should prevent non-owners from renouncement', async function () {
        await expectRevert(
          this.ownable.renounceOwnership({ from: other }),
          'Ownable: caller is not the owner'
        );
      });
    });
  });
});
