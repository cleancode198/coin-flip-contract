//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";

contract GameContract is Ownable, VRFConsumerBase {

  using Counters for Counters.Counter;
  Counters.Counter public gameId;

  AggregatorV3Interface internal priceFeed;

  uint256 public minBet;
  uint256 public fee;
  bytes32 public keyHash;

  enum GAME_OPTIONS { HEAD, TAIL, NOT_SET }
  GAME_OPTIONS public gameOptions;

  enum GAME_STATE { OPEN, CLOSED, GETTING_WINNER, DELETED }
  GAME_STATE public gameState;

  struct Game {
    uint256 id;
    address payable player1;  // creator
    address payable player2;  // joiner
    GAME_OPTIONS player1Option;
    GAME_OPTIONS player2Option;
    GAME_STATE state;
    uint256 prize;
    address payable winner;
  }

  mapping(uint256 => Game) public gameMapping;
  mapping(bytes32 => uint256) public requestIdToGameId; // to be able to edit winner after the results are back

  event GameCreated(address creator, uint256 betValue, uint256 gameId);
  event GameJoined(address joiner);
  event GameFinished(address winner, uint256 prize, uint256 gameId);
  event MinBetChanged(uint256 newBet, address changedBy);
  event RequestedRandomness(bytes32 requestId);

  constructor(address _priceFeed, address _vfrCoordinator, address _link, bytes32 _keyHash)
    VRFConsumerBase(
      _vfrCoordinator,
      _link
    )
  {
    priceFeed = AggregatorV3Interface(_priceFeed);
    minBet = 5;  // change to 50 when doing tests
    keyHash = _keyHash;
    fee = 100000000000000000; // 0.1 LINK
  }

  modifier validOptionInput(GAME_OPTIONS option) {
    require(option != GAME_OPTIONS.NOT_SET, "Cannot use this option!");
    _;
  }

  function createGame(GAME_OPTIONS option) public payable validOptionInput(option) {
    uint256 _minBet = getMinimalBet();
    require(msg.value >= _minBet, "Bet value is below the minimal bet value!");

    uint256 _id = gameId.current();
    gameId.increment();
    Game memory _game = Game({
      id: _id,
      player1: payable(msg.sender),
      player2: payable(address(0)),
      player1Option: option,
      player2Option: GAME_OPTIONS.NOT_SET,
      state: GAME_STATE.OPEN,
      prize: msg.value,
      winner: payable(address(0))
    });
    gameMapping[_id] = _game;

    emit GameCreated(msg.sender, msg.value, _id);
  }

  function joinGame(uint256 _gameId, GAME_OPTIONS option) public payable validOptionInput(option) {
    require(msg.sender != gameMapping[_gameId].player1, "Cannot join the game you have created!");
    require(gameMapping[_gameId].state == GAME_STATE.OPEN, "Game already finished!");
    require(gameMapping[_gameId].player2 == address(0), "Player already joined!");
    require(gameMapping[_gameId].player1Option != option, "Oponent has already chosen this option!");

    gameMapping[_gameId].player2 = payable(msg.sender);
    gameMapping[_gameId].player2Option = option;
    gameMapping[_gameId].prize += msg.value;
    gameMapping[_gameId].state = GAME_STATE.GETTING_WINNER;

    // call VRF
    getWinner(_gameId);

    emit GameJoined(msg.sender);
  }

  function deleteGame(uint256 _gameId) public {
    require(msg.sender == gameMapping[_gameId].player1, "Not your game!");
    require(gameMapping[_gameId].state == GAME_STATE.OPEN, "Game must be open!");
    gameMapping[_gameId].state = GAME_STATE.DELETED;
    payable(msg.sender).transfer(gameMapping[_gameId].prize);
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

  function getWinner(uint256 _gameId) internal {
    require(gameMapping[_gameId].state == GAME_STATE.GETTING_WINNER, "Needs to be getting winner!"); 

    bytes32 requestId = requestRandomness(keyHash, fee);
    requestIdToGameId[requestId] = _gameId;

    emit RequestedRandomness(requestId);
  }

  function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
    require(randomness > 0, "Random number not found!");
    
    uint256 _gameId = requestIdToGameId[requestId];
    uint256 _wonId = randomness % 5;
    
    address payable winner;
    if(_wonId == 0) {
      // dao
      winner = payable(address(this));
    }else{
      if(_wonId % 2 == 1) {
        // head
        if(gameMapping[_gameId].player1Option == GAME_OPTIONS.HEAD) {
          winner = gameMapping[_gameId].player1;
        }else{
          winner = gameMapping[_gameId].player2;
        }
      }else{
        // tail
        if(gameMapping[_gameId].player1Option == GAME_OPTIONS.TAIL) {
          winner = gameMapping[_gameId].player1;
        }else{
          winner = gameMapping[_gameId].player2;
        }
      }
      winner.transfer(gameMapping[_gameId].prize); // send winner the game prize
    }


    gameMapping[_gameId].winner = winner;
    gameMapping[_gameId].state = GAME_STATE.CLOSED;

    emit GameFinished(winner, gameMapping[_gameId].prize, _gameId);
  }

  function getLastId() view public returns(uint256) {
    return gameId.current();
  }

  function getGameForId(uint256 id) view public returns(Game memory) {
    return gameMapping[id];
  }

}

