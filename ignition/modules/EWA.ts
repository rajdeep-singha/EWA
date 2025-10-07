import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("EWAModule", (m) => {
  const tokenAddress = m.getParameter("tokenAddress", "0xYourTokenAddressHere"); // Replace with your ERC20 token address

  const ewa = m.contract("EWA", [tokenAddress]);

  return { ewa };
});
