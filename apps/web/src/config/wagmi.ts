import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base } from "wagmi/chains";
import { getConfig } from "@/config/index";

const appConfig = getConfig();

export const config = getDefaultConfig({
  appName: "Router 402",
  projectId: appConfig.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
  chains: [base],
  ssr: true,
});
