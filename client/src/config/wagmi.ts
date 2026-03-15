import { http, createConfig } from "wagmi";
import { mainnet, type Chain } from "wagmi/chains";
import { walletConnect, injected } from "wagmi/connectors";
import { GAME_CHAIN_ID } from "./contracts";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

const gameChainRpc =
  import.meta.env.VITE_GAME_RPC_URL || "http://192.168.6.56:8545";

export const gameChain: Chain = {
  id: GAME_CHAIN_ID,
  name: "Cosmic Horizon",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [gameChainRpc] } },
};

export const wagmiConfig = createConfig({
  chains: [mainnet, gameChain],
  connectors: [
    injected(),
    ...(projectId ? [walletConnect({ projectId })] : []),
  ],
  transports: {
    [mainnet.id]: http(),
    [gameChain.id]: http(gameChainRpc),
  },
});
