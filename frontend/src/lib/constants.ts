import { PublicKey } from "@solana/web3.js";
import { NetworkCluster } from "../types/vault";

export const PROGRAM_ID = new PublicKey(
  "12o36QLa5vizehVGtGd41hwHonLw66Vh56mH7xozniZy"
);

export const CLUSTERS: Record<NetworkCluster, { name: string; endpoint: string }> = {
  devnet: {
    name: "Solana Devnet",
    endpoint: "https://api.devnet.solana.com",
  },
  localnet: {
    name: "Localnet (127.0.0.1:8899)",
    endpoint: "http://127.0.0.1:8899",
  },
  "mainnet-beta": {
    name: "Mainnet Beta",
    endpoint: "https://api.mainnet-beta.solana.com",
  },
};

export const VAULT_PDA_SEED = new TextEncoder().encode("vault");
export const RENT_EXEMPT_ESTIMATE_SOL = 0.00146;
