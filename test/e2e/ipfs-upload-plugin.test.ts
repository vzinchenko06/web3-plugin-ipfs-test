/// <reference types="@types/jest" />
import type { EventLog } from "web3";
import { core, Web3 } from "web3";
import { CID } from "multiformats/cid";
import type { Web3Account } from "web3-eth-accounts";

import { IPFSUploadPlugin } from "../../src";

const TEST_REGISTRY_ADDRESS = "0xa683bf985bc560c5dc99e8f33f3340d1e53736eb";

function getEnv(name: string): string {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  return global.Cypress ? Cypress.env(name) : process.env[name];
}

async function getFile(): Promise<File | string> {
  // @ts-expect-error missing Cypress types
  return global.Cypress
    ? new Promise((resolve) => {
        // @ts-expect-error missing Cypress types
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        cy.readFile("test/fixtures/upload-file.txt", "utf8").then((content) => {
          resolve(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
            new File([content], "upload-file.txt", {
              type: "text/plain",
            }),
          );
        });
      })
    : (await import("path")).resolve(
        process.cwd(),
        "test/fixtures/upload-file.txt",
      );
}

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
        getEnv("TEST_ACCOUNT_PK"),
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
      const { receipt, cid } = await web3.ipfsUpload.upload(await getFile());

      expect(cid).toBeInstanceOf(CID);
      expect(receipt).toEqual(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          blockHash: expect.stringMatching(/^0x[a-f0-9]+$/),
          from: String(testAccount.address).toLowerCase(),
          to: TEST_REGISTRY_ADDRESS,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          events: { CIDStored: expect.any(Object) },
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
