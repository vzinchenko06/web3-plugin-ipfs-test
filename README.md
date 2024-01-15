web3-plugin-ipfs-test
===========

Web3.js Plugin that have two main functions for uploading a provided local file to IPFS, then store the CID in a smart
contract,
and another function for listing all stored CIDs of given ethereum address.

How to use
------------
- Register the plugin:

    ```javascript
      import Web3 from "web3";
      import { IPFSUploadPlugin } from "web3-plugin-ipfs-test";
   
      web3 = new Web3('https://ethereum-sepolia.publicnode.com')
      web3.registerPlugin(new IPFSUploadPlugin({
        registryAddress: '0xa683bf985bc560c5dc99e8f33f3340d1e53736eb', // Address of the registry contract
        initBlockNumber: BigInt('4546394'), // Block number to start searching for events (contract deployment block number). [0 by default]
      }))
    ```

- Uploads local files to IPFS and stores CID on Ethereum:

    ```javascript 
     // Node.js - path to a file shoud be used
     const {cid} = await web3.ipfs.upload('path/to/file')
     console.log(cid) // CID(...)
     
     // Browser - a File object should be used
     const {cid} = await web3.ipfs.upload(input.files[0])
     console.log(cid) // CID(...)
    ```  
  to send a store transaction to the smart contract, you need to provide the wallet:
    ```javascript
      web3.eth.accounts.wallet.add(myAccount);
      // set wallet as default account
      web3.defaultAccount = myAccount.address;
      // or provide it as a parameter
      await web3.ipfs.upload('path/to/file', myAccount.address)
    ```

- Lists all stored CIDs of given ethereum address:

    ```javascript
      const result = await web3.ipfsUpload.listCIDStored('0x11dde53b21fd8368cd3b7213e9a7e5e40c76ec19');
      result.forEach((event) => {
        console.log(event.returnValues.cid);
      });
    ```

How to test
------------
Use [.env.example](.env.example) to create your own `.env` file and set up the environment variables.

Run `yarn install && yarn test` to run all tests.

Or you can run the tests separately using the scripts in `package.json` file.


License
-------

[MIT](https://choosealicense.com/licenses/mit/)
