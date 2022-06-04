require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-waffle");
//const hre = require("hardhat");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  // !!!!!!
  // CLEAR YOUR PRIVATE KEY AND INFURA KEY BEFORE COMMITING!!!!!
  // !!!!!!
  // uncoment for deployment and fill in needed info, nut SEE ABOVE!!!!!
  networks: {
    /*mainnet: {
      url: `https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}`,
      chainId: 1,
      accounts: [`0x${DEPLOYER_PRIVATE_KEY}`],
    },
    kovan: {
      url: `https://kovan.infura.io/v3/{...}`,
      chainId: 42,
      accounts: [`{DEPLOYER_PRIVATE_KEY}`],
    },
    fuji: {
      url: ``,
      chainId: 97,
      accounts: [``],
    },*/
  },
  solidity: {
    compilers: [
      {
        version: "0.8.7",
      },
      {
        version: "0.8.0",
      },
      {
        version: "0.6.0",
      },
      {
        version: "0.6.6",
      },
      {
        version: "0.4.24",
      },
      {
        version: "0.4.11",
      },
    ],
  },
};
