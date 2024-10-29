import { Logs } from "@ubiquity-os/ubiquity-os-logger";
import { MaxUint256 } from "@uniswap/permit2-sdk";
import { Wallet, providers, utils } from "ethers";

interface Erc721PermitSignatureData {
    beneficiary: string;
    deadline: bigint;
    keys: string[];
    nonce: bigint;
    values: string[];
}

const SIGNING_DOMAIN_NAME = "NftReward-Domain";
const SIGNING_DOMAIN_VERSION = "1";

const types = {
    MintRequest: [
        { name: "beneficiary", type: "address" },
        { name: "deadline", type: "uint256" },
        { name: "keys", type: "bytes32[]" },
        { name: "nonce", type: "uint256" },
        { name: "values", type: "string[]" },
    ],
};


export async function getErc721SignatureDetails(
    _logger: Logs,
    _nftContractAddress: string,
    _evmNetworkId: number,
    _nftMinterPrivateKey: string,
    _userId: number,
    _walletAddress: string,
    _issueNodeId: string,
    _organizationName: string,
    _repositoryName: string,
    username: string,
    contributionType: string,
    provider: providers.Provider
) {
    let adminWallet;

    try {
        adminWallet = new Wallet(_nftMinterPrivateKey, provider);
    } catch (err) {
        _logger.error("Failed to instantiate wallet", { err });
        throw new Error("Failed to instantiate wallet");
    }

    const erc721Metadata = {
        GITHUB_ORGANIZATION_NAME: _organizationName,
        GITHUB_REPOSITORY_NAME: _repositoryName,
        GITHUB_ISSUE_NODE_ID: _issueNodeId,
        GITHUB_USERNAME: username,
        GITHUB_CONTRIBUTION_TYPE: contributionType,
    };

    const metadata = Object.entries(erc721Metadata);
    const erc721SignatureData: Erc721PermitSignatureData = {
        beneficiary: _walletAddress,
        deadline: MaxUint256.toBigInt(),
        keys: metadata.map(([key]) => utils.keccak256(utils.toUtf8Bytes(key))),
        nonce: BigInt(utils.keccak256(utils.toUtf8Bytes(`${_userId}-${_issueNodeId}`))),
        values: metadata.map(([, value]) => value),
    };

    const domain = {
        name: SIGNING_DOMAIN_NAME,
        version: SIGNING_DOMAIN_VERSION,
        verifyingContract: _nftContractAddress,
        chainId: _evmNetworkId,
    };

    const signature = await adminWallet._signTypedData(domain, types, erc721SignatureData).catch((err: unknown) => {
        _logger.error("Failed to sign typed data", { err });
        throw new Error(`Failed to sign typed data: ${err}`);
    });

    return { erc721SignatureData, erc721Metadata, signature, adminWallet };
}
