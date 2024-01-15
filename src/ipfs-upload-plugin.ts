import type { Address, EventLog, TransactionReceipt } from "web3";
import {
  Contract,
  DEFAULT_RETURN_FORMAT,
  eth,
  validator,
  Web3PluginBase,
} from "web3";
import type { Helia } from "helia";
import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";

import type { CID } from "multiformats/cid";
import RegistryContractAbi from "./registry-contract-abi";

export class IPFSUploadPlugin extends Web3PluginBase {
  public pluginNamespace = "ipfsUpload";

  protected registryAddress: Address;
  protected earliestBlockNumber: bigint;
  protected registryContract?: Contract<typeof RegistryContractAbi>;
  protected helia?: Helia;

  /**
   * Creates an instance of IPFSUploadPlugin.
   * @param {Address} options.registryAddress - Address of the registry contract
   * @param {bigint} [options.earliestBlockNumber] - Block number to start searching for events (contract deployment block number)
   */
  constructor(options: {
    registryAddress: Address;
    earliestBlockNumber?: bigint;
  }) {
    super();

    if (!validator.isAddress(options.registryAddress)) {
      throw new Error(`Provided registryAddress is not a valid address!`);
    }

    this.registryAddress = options.registryAddress;
    this.earliestBlockNumber = options.earliestBlockNumber ?? 0n;
  }

  protected async startHelia(): Promise<Helia> {
    if (validator.isNullish(this.helia)) {
      this.helia = await createHelia({ start: false });
    }

    await this.helia.start();

    return this.helia;
  }

  protected async stopHelia(): Promise<void> {
    if (validator.isNullish(this.helia)) {
      return;
    }

    await this.helia.stop();
  }

  protected getRegistryContract(): Contract<typeof RegistryContractAbi> {
    if (validator.isNullish(this.registryContract)) {
      this.registryContract = new Contract(
        RegistryContractAbi,
        this.registryAddress,
      );
      this.registryContract.link(this);
    }

    return this.registryContract;
  }

  protected async getFileContent(file: string | File): Promise<Uint8Array> {
    // Running in Node.js
    if (typeof window === "undefined" && typeof file === "string") {
      const fs = await import("fs");
      return fs.promises.readFile(file);
    }

    // Running in a browser
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }

    throw new Error("Invalid file provided!");
  }

  /**
   * Uploads local files to IPFS and stores CID on Ethereum
   * @param {string | File} file - Path to local file in Node.js or File object in browser
   * @param {Address} [fromAccount] - Address of the registry contract
   * @returns {Promise<{ cid: CID; receipt: TransactionReceipt }>} - CID of the uploaded file and transaction receipt
   */
  public async upload(
    file: string | File,
    fromAccount?: Address,
  ): Promise<{ cid: CID; receipt: TransactionReceipt }> {
    const from = fromAccount ?? this.defaultAccount;
    if (!(from && validator.isAddress(from))) {
      throw new Error(`Owner Address is not provided or invalid address!`);
    }
    // upload file to IPFS
    const content = await this.getFileContent(file);

    const fs = unixfs(await this.startHelia());
    const cid = await fs.addFile({ content });

    // store CID on Ethereum
    const receipt = await this.getRegistryContract()
      .methods.store(cid.toString())
      .send({ from });

    return { cid, receipt };
  }

  /**
   * Lists all CIDs stored on the registry contract
   * @param {Address} ownerAddress - Owner Address for filtering events
   * @param {{ fromBlock: bigint toBlock: bigint }} [options] - Options for filtering events
   * @returns {Promise<string[]>} - Array of CIDs
   */
  public async listCIDStored(
    ownerAddress?: Address,
    options?: {
      fromBlock?: bigint;
      toBlock?: bigint;
    },
  ): Promise<(string | EventLog)[]> {
    const owner = ownerAddress ?? this.defaultAccount;

    if (!(owner && validator.isAddress(owner))) {
      throw new Error(`Owner Address is not provided or invalid address!`);
    }

    let allEvents: (string | EventLog)[] = [];

    let toBlock = !options?.toBlock
      ? await eth.getBlockNumber(
          this.getRegistryContract(),
          DEFAULT_RETURN_FORMAT,
        )
      : options.toBlock;

    const earliestBlock = options?.fromBlock ?? this.earliestBlockNumber;

    while (toBlock >= earliestBlock) {
      const fromBlock = toBlock - 50000n;

      const results = await this.getRegistryContract().getPastEvents(
        "CIDStored",
        {
          filter: { owner },
          fromBlock: fromBlock > earliestBlock ? fromBlock : earliestBlock,
          toBlock,
        },
      );
      toBlock = fromBlock - 1n;
      allEvents = allEvents.concat(results);
    }

    return allEvents;
  }

  /**
   * Destroys the plugin and stops the Helia instance
   * @returns {Promise<void>}
   */
  public async destroy(): Promise<void> {
    await this.stopHelia();
    this.helia = undefined;
    this.registryContract = undefined;
  }
}

// Module Augmentation
declare module "web3" {
  interface Web3Context {
    ipfsUpload: IPFSUploadPlugin;
  }
}
