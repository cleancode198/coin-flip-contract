//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GameContract is Ownable {

  using Counters for Counters.Counter;
  Counters.Counter public gameId;

  AggregatorV3Interface internal priceFeed;
  uint256 public minBet;

  enum GameOptions { ROCK, PAPER, SCRISSORS }
  GameOptions public gameOptions;

  struct Game {
    uint256 id;
    address payable player1;  // creator
    address payable player2;  // joiner
    bool finished;
    uint256 prize;
  }

  mapping(uint256 => Game) public gameMapping;

  event GameCreated(address creator, uint256 betValue);
  event GameJoined(address joiner);
  event GameFinished(address winner, uint256 prize);
  event MinBetChanged(uint256 newBet, address changedBy);

  constructor(address _priceFeed) {
    priceFeed = AggregatorV3Interface(_priceFeed);
    minBet = 50;
  }

  function createGame() public payable {
    uint256 _minBet = getMinimalBet();
    require(msg.value >= _minBet, "Bet value is below the minimal bet value!");

    uint256 _id = gameId.current();
    gameId.increment();
    Game memory _game = Game({
      id: _id,
      player1: payable(msg.sender),
      player2: payable(address(0)),
      finished: false,
      prize: msg.value
    });
    gameMapping[_id] = _game;

    emit GameCreated(msg.sender, msg.value);
  }

  function joinGame(uint256 _gameId) public payable {
    require(gameMapping[_gameId].finished = false, "Game already finished!");
    require(gameMapping[_gameId].player2 != address(0), "Player already joined!");

    gameMapping[_gameId].player2 = payable(msg.sender);
    gameMapping[_gameId].prize += msg.value;

    // call VRF

    emit GameJoined(msg.sender);
  }

  function changeMinBet(uint256 _new) public onlyOwner {
    minBet = _new;
    emit MinBetChanged(_new, msg.sender);
  }

  function getMinimalBet() public view returns(uint256) {
    uint256 precision = 1 * 10 ** 18;
    uint256 price = getLatestEthUsdPrice(); // 8 decimals (fiat pair)
    uint256 costToEnter = (precision / price) * (minBet * 100000000);
    return costToEnter; // min bet in ETH worth 50$
  }

  function getLatestEthUsdPrice() public view returns(uint256) {
    (
      uint80 roundID,
      int price,
      uint startedAt,
      uint timeStamp,
      uint80 answeredInRound
    ) = priceFeed.latestRoundData();
    return uint256(price);
  }

  /*function requestRandomness() internal {

  }

  function fulfillRandomness() external {

  }*/

}

