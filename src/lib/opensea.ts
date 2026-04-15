import { ethers } from 'ethers';
import axios from 'axios';
import https from 'https';

export const OS_GQL = "https://gql.opensea.io/graphql";

export const HEADERS = {
    "content-type": "application/json",
    "x-app-id": "os2-web",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "origin": "https://opensea.io",
    "referer": "https://opensea.io/"
};

export const agent = new https.Agent({ keepAlive: true, maxSockets: 100 });

export async function generateNonce(address: string) {
    const res = await axios.post(OS_GQL, {
        query: `mutation { auth { generateNonce(address: "${address.toLowerCase()}", chain: EVM) { nonce } } }`
    }, { headers: HEADERS, httpsAgent: agent } as any);
    
    return (res.data as any).data.auth.generateNonce.nonce;
}

export async function verifyOwnership(wallet: ethers.Wallet, nonce: string, chainId: number) {
    const addr = wallet.address.toLowerCase();
    const issuedAt = new Date().toISOString();

    const message = `opensea.io wants you to sign in with your account:
${addr}

I accept the OpenSea Terms of Service

URI: https://opensea.io/
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`;

    const signature = await wallet.signMessage(message);

    const res = await axios.post(OS_GQL, {
        operationName: "VerifyOwnershipMutation",
        variables: {
            input: {
                identity: { address: addr, chain: "EVM" },
                message: {
                    domain: "opensea.io",
                    address: addr,
                    statement: "I accept the OpenSea Terms of Service",
                    uri: "https://opensea.io/",
                    version: "1",
                    chainId: chainId.toString(),
                    nonce: nonce,
                    issuedAt: issuedAt,
                    chainArch: "EVM",
                    connectorId: "injected"
                },
                signature: signature
            }
        },
        query: `mutation VerifyOwnershipMutation($input: VerifyOwnershipInput!) { verify(input: $input) }`
    }, { headers: HEADERS, httpsAgent: agent } as any);

    return res.headers['set-cookie']?.join('; ');
}

export function buildBatchMintQuery(wallets: string[], contract: string, chain: string, quantity: string) {
    const normalizedChain = chain.toUpperCase();
    let queryParts = "";
    wallets.forEach((addr, index) => {
        queryParts += `
        w${index}: swap(
            address: "${addr.toLowerCase()}"
            fromAssets: [{ asset: { chain: "${normalizedChain}", contractAddress: "0x0000000000000000000000000000000000000000" } }]
            toAssets: [{ asset: { chain: "${normalizedChain}", contractAddress: "${contract}", tokenId: "0" }, quantity: "${quantity}" }]
            action: MINT
            capabilities: { eip7702: false }
        ) {
            actions {
                ... on TransactionAction {
                    transactionSubmissionData {
                        to
                        data
                        value
                    }
                }
            }
        }`;
    });

    return {
        operationName: "B",
        query: `query B { ${queryParts} }`
    };
}
