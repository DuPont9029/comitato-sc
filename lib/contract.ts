import { Contract, JsonRpcSigner, BrowserProvider } from "ethers";

export const CONTRACT_ADDRESS = "0x67c7eAB1Ac4480b24E2B0C5477a1fcD57ec8e42e";

// Minimal ABI for required interactions
export const CONTRACT_ABI = [
  // State views
  {
    type: "function",
    name: "representatives",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "voters",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [
      { name: "hasVotingRight", type: "bool" },
      { name: "hasVoted", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "proposals",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "name", type: "bytes32" },
      { name: "voteCount", type: "uint256" },
      { name: "exists", type: "bool" },
      { name: "active", type: "bool" },
    ],
  },
  { type: "function", name: "proposalCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "representativeCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "getActiveProposalIds",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256[]" }],
  },
  // Representative management
  {
    type: "function",
    name: "proposeAddRepresentative",
    stateMutability: "nonpayable",
    inputs: [{ name: "newRepresentative", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "proposeRemoveRepresentative",
    stateMutability: "nonpayable",
    inputs: [{ name: "representative", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "emergencyAddRepresentative",
    stateMutability: "nonpayable",
    inputs: [{ name: "newRepresentative", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "voteOnRepresentativeProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "bool" },
    ],
    outputs: [],
  },
  // Voter management
  {
    type: "function",
    name: "giveRightToVote",
    stateMutability: "nonpayable",
    inputs: [{ name: "voter", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "revokeRightToVote",
    stateMutability: "nonpayable",
    inputs: [{ name: "voter", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "giveRightToVoteMultiple",
    stateMutability: "nonpayable",
    inputs: [{ name: "voterAddresses", type: "address[]" }],
    outputs: [],
  },
  // Proposals
  {
    type: "function",
    name: "addProposal",
    stateMutability: "nonpayable",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "addProposalsMultiple",
    stateMutability: "nonpayable",
    inputs: [{ name: "names", type: "string[]" }],
    outputs: [{ type: "uint256[]" }],
  },
  {
    type: "function",
    name: "deactivateProposal",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reactivateProposal",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reuseProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "newName", type: "string" },
    ],
    outputs: [],
  },
  // Voting
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resetVoter",
    stateMutability: "nonpayable",
    inputs: [{ name: "voter", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resetVotersMultiple",
    stateMutability: "nonpayable",
    inputs: [{ name: "voterAddresses", type: "address[]" }],
    outputs: [],
  },
];

export function getContract(signerOrProvider: JsonRpcSigner | BrowserProvider) {
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider as any);
}