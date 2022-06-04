// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const transferABI = [
  // transfer
  {
   "constant": false,
   "inputs": [
    {
     "name": "_to",
     "type": "address"
    },
    {
     "name": "_value",
     "type": "uint256"
    }
   ],
   "name": "transfer",
   "outputs": [
    {
     "name": "",
     "type": "bool"
    }
   ],
   "type": "function"
  }
 ];

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy

  const KOVAN_KEYHASH = "0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4";
  const KOVAN_VRF_COORDINATOR = "0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9";
  const ETH_USD_PRICE_FEED = "0x9326BFA02ADD2366b30bacB125260Af641031331";
  const KOVAN_LINK_TOKEN = "0xa36085F69e2889c224210F603D836748e7dC0088";

  const BNB_USD_PRICE_FEED = "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526";
  const BSC_TESTNET_KEYHASH = "0xcaf3c3727e033261d383b315559476f48034c13b18f8cafed4d871abe5049186";
  const BSC_TESTNET_VRF_COORDINATOR = "0xa555fC018435bef5A13C6c6870a9d4C11DEC329C";
  const BSC_TESTNET_LINK_TOKEN = "0x84b9b910527ad5c03a9ca831909e21e236ea7b06";

  const accounts = await hre.ethers.getSigners();

  const GameContract = artifacts.require('GameContract');
  console.log("Deploying . . .")
  const game = await GameContract.new(BNB_USD_PRICE_FEED, BSC_TESTNET_VRF_COORDINATOR, BSC_TESTNET_LINK_TOKEN, BSC_TESTNET_KEYHASH, {from:accounts[1].address});
  console.log("Game deployed to:", game.address);
  console.log("Creating a new Game . . .");
  await game.createGame(1, {value: web3.utils.toWei("0.02", "ether"), from:accounts[1].address});
  console.log("Created!");
  //console.log("Joining the Game . . .")
  //await game.joinGame(0, 0, {value: web3.utils.toWei("0.02", "ether"), from:accounts[1].address});
  //console.log("Joined!");
  console.log("DONE!")
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });