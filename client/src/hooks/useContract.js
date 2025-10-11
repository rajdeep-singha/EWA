import {ethers} from "ethers";
import { CONTRACT_ADDRESS,CONTRACT_ABI } from "../config/contractConfig";
import { useWeb3 } from "../context/Web3Context";

export const useContract = () => {
    const { signer } = useWeb3();
    if(!signer ) return null;
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
};
                                                                                                                                                                    