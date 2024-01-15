import { resolve as pathResolve } from "path";
import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import type { EventLog } from "web3";
import { Web3, core } from "web3";
import type { Web3Account } from "web3-eth-accounts";
import { CID } from "multiformats/cid";

import { IPFSUploadPlugin } from "../../src";

const TEST_REGISTRY_ADDRESS = "0xa683bf985bc560c5dc99e8f33f3340d1e53736eb";

describe("IPFSUploadPlugin Tests", () => {
  it("should register IPFSUploadPlugin plugin on Web3Context instance", () => {
    const web3Context = new core.Web3Context("http://127.0.0.1:8545");
    web3Context.registerPlugin(
      new IPFSUploadPlugin({ registryAddress: TEST_REGISTRY_ADDRESS }),
    );
    expect(web3Context.ipfsUpload).toBeDefined();
  });

  describe("IPFSUploadPlugin method tests", () => {
    let web3: Web3;
    let testAccount: Web3Account;

    beforeAll(() => {
      web3 = new Web3("https://ethereum-sepolia.publicnode.com");
      testAccount = web3.eth.accounts.privateKeyToAccount(
        process.env.TEST_ACCOUNT_PK as string,
      );
      web3.eth.accounts.wallet.add(testAccount);
      web3.defaultAccount = testAccount.address;

      web3.registerPlugin(
        new IPFSUploadPlugin({
          registryAddress: TEST_REGISTRY_ADDRESS,
          earliestBlockNumber: BigInt("4546394"),
        }),
      );
    });

    afterAll(async () => {
      await web3.ipfsUpload.destroy();
    });

    it("should call IPFSUploadPlugin upload method with expected param", async () => {
      const path = pathResolve(
        process.cwd(),
        "./test/fixtures/upload-file.txt",
      );

      const { receipt, cid } = await web3.ipfsUpload.upload(path);
      expect(cid).toBeInstanceOf(CID);
      expect(receipt).toEqual(
        expect.objectContaining({
          blockHash: expect.stringMatching(/^0x[a-f0-9]+$/) as unknown,
          from: String(testAccount.address).toLowerCase(),
          to: TEST_REGISTRY_ADDRESS,
          events: { CIDStored: expect.any(Object) as unknown },
        }),
      );
    });

    it("should call IPFSUploadPlugin listCIDStored method with expected param", async () => {
      const ownerAddress = testAccount.address;
      const result = await web3.ipfsUpload.listCIDStored(ownerAddress);

      expect(Array.isArray(result)).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(
        result.every(
          (value) => (value as EventLog).returnValues.owner === ownerAddress,
        ),
      ).toBeTruthy();
    });
  });
});
