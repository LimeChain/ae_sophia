# About this repo
## Overview
This repo is representation of Solidity ERC721 smart contract written in Sophia language and based on the Aeternity blockchain. It is based on the Openzeppelin version of the ERC721 contract.

## Structure

The main components of this repo:
- contracts directory - containing the Sophia contracts
- test directory - containing the mocha-based unit tests and the 
- docker directory and docker-compose - you need to bring up the network via docker-compose if you want to run the unit tests.

## Running the tests

In order to run the unit tests one should do the following:
1. spawn up the test network `docker-compose up -d`
2. Wait for the network to be responding and healtyh
3. Run `npm test`

## Nonce Disclaimer
There is a nonce problem in the whole system. We mitigate it in the unit tests through keeping local nonce. It might be buggy. If it gives you problems, restart your docker network and remove the nonce.txt file

