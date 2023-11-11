const { ethers } = require("hardhat");
const { BigNumber } = require("ethers");

const num = 10;

async function generate() {
    for(let i = 0; i < num; i++){
        // uint256, 256/8
        console.log(ethers.BigNumber);
        let n = BigNumber.from(ethers.utils.randomBytes(32));
        console.log(n.toString());
    }
}

generate()
    .catch((err) => { console.log(err); process.exit(1); })