const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");


contract("Game", accounts => {
  const Game = artifacts.require('GameContract');
  //const VRFCoordinatoMock = artifacts.require('@chainlink/contracts/src/v0.6/tests/VRFCoordinatorMock');  // could use contracts in test folder, but guves artifacts error
  const MockPriceFeed = artifacts.require("@chainlink/contracts/src/v0.6/tests/MockV3Aggregator");
  //const { LinkToken } = require("../../basics/truffle/truffle/v0.4/LinkToken");

  const defaultAccount = accounts[0];
  const player1 = accounts[1];
  const player2 = accounts[2];
  const player3 = accounts[3];

  let game, mockPriceFeed;

  describe("#plays correctly", () => {
    let price = "200000000000";

    beforeEach(async () => {
      mockPriceFeed = await MockPriceFeed.new(8, price, {from: defaultAccount}); // 8 - decimals
      game = await Game.new(mockPriceFeed.address, {from: defaultAccount})
    });

    it("correctly gets the minimum bet", async () => {
      let entranceFee = await game.getMinimalBet();
      assert.equal(entranceFee.toString(), "25000000000000000"); // price: 2000$ (hardcoded above), 50$ = 0.025 ETH
    });

    it("should revert if bet value is not correct", async () => {
      await truffleAssert.reverts(
        game.createGame({ from: player1, value: 0 })
      )
    });

    it("should create new game correctly", async () => {
      await truffleAssert.passes(
        game.createGame({ from: player1, value: web3.utils.toWei("0.025", "ether") })
      );

      let lastGameId = await game.gameId() - 1;
      let createdGame = await game.gameMapping(lastGameId);
      
      assert.equal(lastGameId, 0, "Game hasn't been created!");
      assert.equal(web3.utils.fromWei(createdGame.prize), 0.025, "Prize was set incorrectly!");
      assert.equal(createdGame.player1.toLowerCase(), player1.toLowerCase(), "Player 1 was set incorrectly!");
      assert.equal(createdGame.player2.toLowerCase(), "0x0000000000000000000000000000000000000000", "Player2 was set incorrectly!");
      assert.equal(createdGame.finished, false, "Finished was set incorrectly!");
      assert.equal(createdGame.id, 0, "Game id was set incorrectly!");
    });
  });

  describe("#handle change min bet correctly", async () => {
    beforeEach(async () => {
      game = await Game.new(mockPriceFeed.address, {from: defaultAccount})
    });

    it("should revert if not owner tries to change min bet", async () => {
      await truffleAssert.reverts(
        game.changeMinBet(100, {from: player1})
      );
    });

    it("should change min bet correctly", async () => {
      let prevMinBet = await game.minBet();

      await truffleAssert.passes(
        game.changeMinBet(100, {from: defaultAccount})
      );

      let currentMinBet = await game.minBet();

      assert(currentMinBet.toNumber() >  prevMinBet.toNumber(), "Current Min Bet is not larger then previus min bet!");
      assert.equal(currentMinBet.toNumber(), 100, "Bet did not change correctly!");
      assert.equal(prevMinBet.toNumber(), 50, "Previus min bet was not correct!");
    });
  });
});