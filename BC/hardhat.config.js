// require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-waffle");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
        settings:{
          optimizer: {
            enabled: true,
            runs: 200,
          },
        }
      }
    ],
  },
  networks: {
    local: {
      url: "http://localhost:24012/rpc"
    },
}
};
