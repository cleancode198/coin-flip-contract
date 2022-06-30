const { assert } = require("chai");
const truffleAssert = require("truffle-assertions");

/**
 * GAME_STATE:
 *  OPEN - 0
 *  CLOSED - 1
 *  GETTING_WINNER - 2
 */

/**
 * GAME_OPTIONS:
 *  HEAD - 0
 *  TAIL - 1
 *  NOT_SET - 2
 */

contract("Game", accounts => {
  const Game = artifacts.require('GameContract');
  const VRFCoordinatoMock = artifacts.require('VRFCoordinatorMock');
  const MockPriceFeed = artifacts.require("@chainlink/contracts/src/v0.6/tests/MockV3Aggregator");
  const LinkToken = artifacts.require("LinkToken");

  const defaultAccount = accounts[0];
  const player1 = accounts[1];
  const player2 = accounts[2];
  const player3 = accounts[3];

  let game, mockPriceFeed, vrfCoordinatoMock, link, keyHash;

  describe("#plays game correctly", () => {
    let price = "200000000000";

    beforeEach(async () => {
      keyhash = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
      link = await LinkToken.new({from: defaultAccount});
      vrfCoordinatoMock = await VRFCoordinatoMock.new(link.address, {from: defaultAccount});
      mockPriceFeed = await MockPriceFeed.new(8, price, {from: defaultAccount}); // 8 - decimals
      game = await Game.new(mockPriceFeed.address, vrfCoordinatoMock.address, link.address, keyhash, {from: defaultAccount})
    });

    it("correctly gets the minimum bet", async () => {
      let entranceFee = await game.getMinimalBet();
      assert.equal(entranceFee.toString(), "2500000000000000"); // price: 2000$ (hardcoded above), 5$ = 0.0025 ETH
    });

    it("should revert if bet value is not correct", async () => {
      await truffleAssert.reverts(
        game.createGame(1, { from: player1, value: 0 })
      )
    });

    it("should create new game correctly", async () => {
      await truffleAssert.passes(
        game.createGame(1, { from: player1, value: web3.utils.toWei("0.0025", "ether") })
      );

      let lastGameId = await game.gameId() - 1;
      let createdGame = await game.gameMapping(lastGameId);
      
      assert.equal(lastGameId, 0, "Game hasn't been created!");
      assert.equal(web3.utils.fromWei(createdGame.prize), 0.0025, "Prize was set incorrectly!");
      assert.equal(createdGame.player1.toLowerCase(), player1.toLowerCase(), "Player 1 was set incorrectly!");
      assert.equal(createdGame.player2.toLowerCase(), "0x0000000000000000000000000000000000000000", "Player2 was set incorrectly!");
      assert.equal(createdGame.state, 0, "Game state was set incorrectly!");
      assert.equal(createdGame.id, 0, "Game id was set incorrectly!");
    });

    it("should revert if trying to join game created by the same address", async () => {
      await truffleAssert.passes(
        game.createGame(1, { from: player1, value: web3.utils.toWei("0.0025", "ether") })
      );
      await truffleAssert.reverts(
        game.joinGame(0, 0, { from: player1, value: 0 })
      );
    });

    it("should revert if trying to join game without needed value", async () => {
      await truffleAssert.passes(
        game.createGame(1, { from: player1, value: web3.utils.toWei("0.0025", "ether") })
      );
      await truffleAssert.reverts(
        game.joinGame(0, 0, { from: player2, value: 0 })
      );
    });

    it("should create, join and play game correctyl", async () => {
      // transfer LINK to game contract for VRF fee
      await link.transfer(game.address, web3.utils.toWei("0.5", "ether"), {from:defaultAccount});

      game.createGame(1, { from: player1, value: web3.utils.toWei("0.0035", "ether") })

      let tx = await game.joinGame(0, 0, { from: player2, value: web3.utils.toWei("0.0035", "ether") })
      let requestId = tx.receipt.rawLogs[3].topics[0];  // get reauestId emitted in the event

      // winner should be player2 3%2=1
      await vrfCoordinatoMock.callBackWithRandomness(requestId, "3", game.address, {from: defaultAccount});  // calls fulfillRandomness

      let playedGame = await game.gameMapping(0);

      assert.equal(playedGame.winner, player2, "Incorrect winner!");
      assert.equal(playedGame.prize.toNumber(), web3.utils.toWei("0.0035", "ether")*2, "Prize was set to 0!");
      assert.equal(playedGame.state.toNumber(), 1, "Game state wasn't set to CLOSED!");
    });

    it("should revert if trying to join game that has already finished", async () => {
      // transfer LINK to game contract for VRF fee
      await link.transfer(game.address, web3.utils.toWei("0.5", "ether"), {from:defaultAccount});

      game.createGame(1, { from: player1, value: web3.utils.toWei("0.0035", "ether") })

      let tx = await game.joinGame(0, 0, { from: player2, value: web3.utils.toWei("0.035", "ether") })
      let requestId = tx.receipt.rawLogs[3].topics[0];  // get reauestId emitted in the event

      await vrfCoordinatoMock.callBackWithRandomness(requestId, "2", game.address, {from: defaultAccount});  // calls fulfillRandomness

      await truffleAssert.reverts(
        game.joinGame(0, 0, { from: player2, value: web3.utils.toWei("0.0035", "ether") })
      );
    });

    it("should revert if trying to create or join the game eith NOT_SET option", async () => {
      await game.createGame(1, { from: player1, value: web3.utils.toWei("0.0035", "ether") });
      await truffleAssert.reverts(
        game.createGame(2, { from: player2, value: web3.utils.toWei("0.0035", "ether") })
      );
      await truffleAssert.reverts(
        game.joinGame(0, 2, { from: player2, value: web3.utils.toWei("0.0035", "ether") })
      );
    });

    // add test for delete functipon
  });

  describe("#handle change min bet correctly", async () => {
    beforeEach(async () => {
      game = await Game.new(mockPriceFeed.address, vrfCoordinatoMock.address, link.address, keyhash, {from: defaultAccount})
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
      assert.equal(prevMinBet.toNumber(), 5, "Previus min bet was not correct!");
    });
  });
});