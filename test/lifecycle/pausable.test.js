const Pausable = artifacts.require('JPT');

const { expectEvent, expectRevert } = require('@openzeppelin/test-helpers');

const { expect } = require('chai');


contract('Pausable', function (accounts) {
  const [ pauser, other, ...otherAccounts ] = accounts;

  beforeEach(async function () {
    this.pausable = await Pausable.new({ from: pauser });
  });

  context('when unpaused', function () {
    beforeEach(async function () {
      expect(await this.pausable.paused()).to.equal(false);
    });

    describe('pausing', function () {
      it('is pausable by the pauser', async function () {
        await this.pausable.pause({ from: pauser });
        expect(await this.pausable.paused()).to.equal(true);

        await this.pausable.unpause({ from: pauser });
        expect(await this.pausable.paused()).to.equal(false);
      });

      it('reverts when pausing from non-pauser', async function () {
        await expectRevert(this.pausable.pause({ from: other }),
          'Ownable: caller is not the owner'
        );
      });

      context('when paused', function () {
        beforeEach(async function () {
          ({ logs: this.logs } = await this.pausable.pause({ from: pauser }));
        });

        it('emits a Paused event', function () {
          expectEvent.inLogs(this.logs, 'Paused', { account: pauser });
        });

        it('reverts when re-pausing', async function () {
          await expectRevert(this.pausable.pause({ from: pauser }), 'Pausable: paused');
        });

        describe('unpausing', function () {
          it('is unpausable by the pauser', async function () {
            await this.pausable.unpause({ from: pauser });
            expect(await this.pausable.paused()).to.equal(false);
          });

          it('reverts when unpausing from non-pauser', async function () {
            await expectRevert(this.pausable.unpause({ from: other }),
              'Ownable: caller is not the owner'
            );
          });

          context('when unpaused', function () {
            beforeEach(async function () {
              ({ logs: this.logs } = await this.pausable.unpause({ from: pauser }));
            });

            it('emits an Unpaused event', function () {
              expectEvent.inLogs(this.logs, 'Unpaused', { account: pauser });
            });

            it('reverts when re-unpausing', async function () {
              await expectRevert(this.pausable.unpause({ from: pauser }), 'Pausable: not paused');
            });
          });
        });
      });
    });
  });
});
