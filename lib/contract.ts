import { Contract, JsonRpcSigner, BrowserProvider } from "ethers";
import ABI from "./abi.json";

export const CONTRACT_ADDRESS = "0x88F2D5c26395dEdbF978079e5142cAf548688e72";

// Usa l'ABI completa generata
export const CONTRACT_ABI = ABI as any;

export function getContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider as any);
}