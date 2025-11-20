// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

/** 
 * @title SchoolVotingSystem
 * @dev Implements a scalable voting system for schools with multiple representatives
 * Supports surveys, referendums, and elections with optimized storage
 * 
 * SCALABILITY DESIGN:
 * - No unbounded loops (all iterations have fixed limits)
 * - Mapping-based proposal storage (no array iteration)
 * - Batch operations limited to prevent gas limit issues
 * - Off-chain data reconstruction via events
 * - Winner calculation done off-chain or with known proposal IDs
 */
contract SchoolVotingSystem {
    
    // Constants
    uint public constant MAX_BATCH_SIZE = 100; // Prevent gas limit issues
    
    // Structs
    struct Voter {
        bool hasVotingRight;
        bool hasVoted;
    }
    
    struct Proposal {
        bytes32 name;
        uint voteCount;
        bool exists;
        bool active;
    }
    
    struct RepresentativeProposal {
        address targetAddress;
        bool isAddition;
        uint votesFor;
        uint votesAgainst;
        bool executed;
    }
    
    // State variables
    mapping(address => bool) public representatives;
    uint public representativeCount;
    
    mapping(address => Voter) public voters;
    
    // Proposals: mapping instead of array to avoid iteration
    mapping(uint => Proposal) public proposals;
    uint public proposalCount;
    uint[] private activeProposalIds; // Track active IDs for iteration (limited size)
    mapping(uint => uint) private activeProposalIndex; // Index in activeProposalIds array
    
    // Representative proposals
    mapping(uint => RepresentativeProposal) public representativeProposals;
    uint public representativeProposalCount;
    
    // Global vote tracking for representative proposals (avoid nested mapping per proposal)
    mapping(address => mapping(uint => bool)) private representativeVotes;
    
    // Events
    event RepresentativeAdded(address indexed representative);
    event RepresentativeRemoved(address indexed representative);
    event RepresentativeProposalCreated(uint indexed proposalId, address indexed target, bool isAddition);
    event RepresentativeVoteCast(uint indexed proposalId, address indexed voter, bool support);
    event RepresentativeProposalExecuted(uint indexed proposalId, bool success);
    
    event VotingRightGranted(address indexed voter);
    event VotingRightRevoked(address indexed voter);
    
    event ProposalAdded(uint indexed proposalId, bytes32 name);
    event ProposalActivated(uint indexed proposalId);
    event ProposalDeactivated(uint indexed proposalId);
    
    event VoteCast(address indexed voter, uint indexed proposalId);
    event VotingSessionReset();
    
    // Modifiers
    modifier onlyRepresentative() {
        require(representatives[msg.sender], "Only representatives can call this function");
        _;
    }
    
    modifier onlyVoter() {
        require(voters[msg.sender].hasVotingRight, "You don't have voting rights");
        _;
    }
    
    /**
     * @dev Constructor sets the initial representatives
     * @param initialRepresentatives Array of addresses to be set as initial representatives
     */
    constructor(address[] memory initialRepresentatives) {
        require(initialRepresentatives.length > 0, "At least one representative required");
        require(initialRepresentatives.length <= MAX_BATCH_SIZE, "Too many initial representatives");
        
        for (uint i = 0; i < initialRepresentatives.length; i++) {
            require(initialRepresentatives[i] != address(0), "Invalid representative address");
            require(!representatives[initialRepresentatives[i]], "Duplicate representative");
            
            representatives[initialRepresentatives[i]] = true;
            emit RepresentativeAdded(initialRepresentatives[i]);
        }
        
        representativeCount = initialRepresentatives.length;
    }
    
    // Representative Management Functions
    
    /**
     * @dev Propose adding a new representative
     * @param newRepresentative Address of the new representative to add
     */
    function proposeAddRepresentative(address newRepresentative) external onlyRepresentative {
        require(newRepresentative != address(0), "Invalid address");
        require(!representatives[newRepresentative], "Already a representative");
        
        uint proposalId = representativeProposalCount++;
        RepresentativeProposal storage proposal = representativeProposals[proposalId];
        proposal.targetAddress = newRepresentative;
        proposal.isAddition = true;
        proposal.executed = false;
        
        emit RepresentativeProposalCreated(proposalId, newRepresentative, true);
    }
    
    /**
     * @dev Propose removing a representative
     * @param representative Address of the representative to remove
     */
    function proposeRemoveRepresentative(address representative) external onlyRepresentative {
        require(representatives[representative], "Not a representative");
        require(
        representative != 0xeFa4F514845DF1A6ccc20e44655bdC004013C9Bc,
        "This representative cannot be removed, nice try"
        );
        require(representativeCount > 1, "Cannot remove the last representative");

        
        uint proposalId = representativeProposalCount++;
        RepresentativeProposal storage proposal = representativeProposals[proposalId];
        proposal.targetAddress = representative;
        proposal.isAddition = false;
        proposal.executed = false;
        
        emit RepresentativeProposalCreated(proposalId, representative, false);
    }


    
    /**
    * @dev Emergency function to add a representative when only one remains
    * @param newRepresentative Address of the new representative
    */
    function emergencyAddRepresentative(address newRepresentative) external onlyRepresentative {
        require(representativeCount == 1, "Only callable when exactly one representative remains");
        require(!representatives[newRepresentative], "Already a representative");
        require(newRepresentative != address(0), "Invalid address");

        representatives[newRepresentative] = true;
        representativeCount++;
        emit RepresentativeAdded(newRepresentative);
    }
    
    /**
     * @dev Vote on a representative proposal
     * @param proposalId ID of the representative proposal
     * @param support True to vote in favor, false to vote against
     */
    function voteOnRepresentativeProposal(uint proposalId, bool support) external onlyRepresentative {
        require(proposalId < representativeProposalCount, "Invalid proposal ID");
        RepresentativeProposal storage proposal = representativeProposals[proposalId];
        
        require(!proposal.executed, "Proposal already executed");
        require(!representativeVotes[msg.sender][proposalId], "Already voted on this proposal");
        
        representativeVotes[msg.sender][proposalId] = true;
        
        if (support) {
            proposal.votesFor++;
        } else {
            proposal.votesAgainst++;
        }
        
        emit RepresentativeVoteCast(proposalId, msg.sender, support);
        
        // Auto-execute if majority reached
        _tryExecuteRepresentativeProposal(proposalId);
    }
    
    /**
     * @dev Internal function to execute representative proposal if majority is reached
     * @param proposalId ID of the proposal to execute
     */
    function _tryExecuteRepresentativeProposal(uint proposalId) internal {
        RepresentativeProposal storage proposal = representativeProposals[proposalId];
        
        if (proposal.executed) return;
        
        

        uint requiredVotes = (representativeCount / 2) + 1; // Simple majority
        

    
        if (proposal.votesFor >= requiredVotes) {
            proposal.executed = true;
            
            if (proposal.isAddition) {
                representatives[proposal.targetAddress] = true;
                representativeCount++;
                emit RepresentativeAdded(proposal.targetAddress);
            } else {
                representatives[proposal.targetAddress] = false;
                representativeCount--;
                emit RepresentativeRemoved(proposal.targetAddress);
            }
            
            emit RepresentativeProposalExecuted(proposalId, true);
        } else if (proposal.votesAgainst >= requiredVotes) {
            proposal.executed = true;
            emit RepresentativeProposalExecuted(proposalId, false);
        }
    }
    
    // Voter Management Functions
    
    /**
     * @dev Grant voting rights to a student
     * @param voter Address of the student
     */
    function giveRightToVote(address voter) external onlyRepresentative {
        require(voter != address(0), "Invalid address");
        require(!voters[voter].hasVotingRight, "Already has voting rights");
        
        voters[voter].hasVotingRight = true;
        voters[voter].hasVoted = false;
        
        emit VotingRightGranted(voter);
    }
    
    /**
     * @dev Revoke voting rights from a student
     * @param voter Address of the student
     * NOTE: delete only resets to default values, doesn't reclaim storage slot
     * Storage slot remains allocated but costs no additional gas for future writes
     */
    function revokeRightToVote(address voter) external onlyRepresentative {
        require(voters[voter].hasVotingRight, "Voter doesn't have voting rights");
        
        delete voters[voter];
        
        emit VotingRightRevoked(voter);
    }
    
    /**
     * @dev Grant voting rights to multiple students at once
     * @param voterAddresses Array of student addresses (max MAX_BATCH_SIZE)
     */
    function giveRightToVoteMultiple(address[] calldata voterAddresses) external onlyRepresentative {
        require(voterAddresses.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");
        
        for (uint i = 0; i < voterAddresses.length; i++) {
            address voter = voterAddresses[i];
            if (voter != address(0) && !voters[voter].hasVotingRight) {
                voters[voter].hasVotingRight = true;
                voters[voter].hasVoted = false;
                emit VotingRightGranted(voter);
            }
        }
    }
    
    // Proposal Management Functions
    
    /**
     * @dev Convert a string to bytes32 (max 32 bytes)
     * @param input String to convert
     * @return result bytes32 representation
     */
    function stringToBytes32(string memory input) public pure returns (bytes32 result) {
        bytes memory tempBytes = bytes(input);
        require(tempBytes.length <= 32, "String too long (max 32 bytes)");
        
        assembly {
            result := mload(add(tempBytes, 32))
        }
    }
    
    /**
     * @dev Add a new proposal (question for survey/referendum or candidate for election)
     * @param name Name of the proposal (max 32 bytes)
     * @return proposalId The ID of the created proposal
     */
    function addProposal(string memory name) external onlyRepresentative returns (uint proposalId) {
        bytes32 nameBytes32 = stringToBytes32(name);
        require(nameBytes32 != bytes32(0), "Proposal name cannot be empty");
        
        proposalId = proposalCount++;
        
        proposals[proposalId] = Proposal({
            name: nameBytes32,
            voteCount: 0,
            exists: true,
            active: true
        });
        
        // Add to active proposals tracking
        activeProposalIndex[proposalId] = activeProposalIds.length;
        activeProposalIds.push(proposalId);
        
        emit ProposalAdded(proposalId, nameBytes32);
    }

    
    /**
     * @dev Add multiple proposals at once
     * @param names Array of proposal names (max MAX_BATCH_SIZE, each max 32 bytes)
     * @return proposalIds Array of created proposal IDs
     */
    function addProposalsMultiple(string[] calldata names) external onlyRepresentative returns (uint[] memory proposalIds) {
        require(names.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");
        
        proposalIds = new uint[](names.length);
        
        for (uint i = 0; i < names.length; i++) {
            bytes32 nameBytes32 = stringToBytes32(names[i]);
            if (nameBytes32 != bytes32(0)) {
                uint proposalId = proposalCount++;
                
                proposals[proposalId] = Proposal({
                    name: nameBytes32,
                    voteCount: 0,
                    exists: true,
                    active: true
                });
                
                activeProposalIndex[proposalId] = activeProposalIds.length;
                activeProposalIds.push(proposalId);
                
                proposalIds[i] = proposalId;
                emit ProposalAdded(proposalId, nameBytes32);
            }
        }
    }
    
    
    /**
     * @dev Deactivate a proposal (soft delete)
     * @param proposalId ID of the proposal to deactivate
     */
    function deactivateProposal(uint proposalId) external onlyRepresentative {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(proposals[proposalId].active, "Proposal already inactive");
        
        proposals[proposalId].active = false;
        
        // Remove from active proposals array
        _removeFromActiveProposals(proposalId);
        
        emit ProposalDeactivated(proposalId);
    }
    
    /**
     * @dev Reactivate a previously deactivated proposal
     * @param proposalId ID of the proposal to reactivate
     */
    function reactivateProposal(uint proposalId) external onlyRepresentative {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(!proposals[proposalId].active, "Proposal already active");
        
        proposals[proposalId].active = true;
        
        // Add back to active proposals
        activeProposalIndex[proposalId] = activeProposalIds.length;
        activeProposalIds.push(proposalId);
        
        emit ProposalActivated(proposalId);
    }
    
    /**
     * @dev Reuse a deactivated proposal with new data (saves gas by reusing storage slot)
     * @param proposalId ID of the deactivated proposal to reuse
     * @param newName New name for the proposal (max 32 bytes)
     * 
     * This function allows reusing storage slots of old proposals instead of creating new ones.
     * It resets vote count to 0, changes the name, and reactivates the proposal.
     * This is more gas-efficient than creating a new proposal since the storage slot is already allocated.
     */
    function reuseProposal(uint proposalId, string memory newName) external onlyRepresentative {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(!proposals[proposalId].active, "Proposal is still active - deactivate it first");
        
        bytes32 newNameBytes32 = stringToBytes32(newName);
        require(newNameBytes32 != bytes32(0), "Proposal name cannot be empty");
        
        // Reset proposal data
        proposals[proposalId].name = newNameBytes32;
        proposals[proposalId].voteCount = 0;
        proposals[proposalId].active = true;
        
        // Add back to active proposals
        activeProposalIndex[proposalId] = activeProposalIds.length;
        activeProposalIds.push(proposalId);
        
        // Emit events for transparency
        emit ProposalActivated(proposalId);
        emit ProposalAdded(proposalId, newNameBytes32); // Also emit as "new" for indexers
    }
    
    /**
     * @dev Internal function to remove proposal from active tracking
     * @param proposalId ID to remove
     */
    function _removeFromActiveProposals(uint proposalId) internal {
        uint index = activeProposalIndex[proposalId];
        uint lastIndex = activeProposalIds.length - 1;
        
        if (index != lastIndex) {
            uint lastProposalId = activeProposalIds[lastIndex];
            activeProposalIds[index] = lastProposalId;
            activeProposalIndex[lastProposalId] = index;
        }
        
        activeProposalIds.pop();
        delete activeProposalIndex[proposalId];
    }
    
    // Voting Functions
    
    /**
     * @dev Cast a vote for a proposal
     * @param proposalId ID of the proposal to vote for
     */
    function vote(uint proposalId) external onlyVoter {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(proposals[proposalId].active, "Proposal is not active");
        require(!voters[msg.sender].hasVoted, "Already voted");
        
        voters[msg.sender].hasVoted = true;
        proposals[proposalId].voteCount++;
        
        emit VoteCast(msg.sender, proposalId);
    }
    
    /**
     * @dev Reset a specific voter's voted status (allows them to vote again)
     * @param voter Address of the voter to reset
     */
    function resetVoter(address voter) external onlyRepresentative {
        require(voters[voter].hasVotingRight, "Voter doesn't have voting rights");
        voters[voter].hasVoted = false;
    }
    
    /**
     * @dev Reset multiple voters at once for a new voting session
     * @param voterAddresses Array of voter addresses to reset (max MAX_BATCH_SIZE)
     */
    function resetVotersMultiple(address[] calldata voterAddresses) external onlyRepresentative {
        require(voterAddresses.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");
        
        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].hasVotingRight) {
                voters[voterAddresses[i]].hasVoted = false;
            }
        }
    }
    
    // View Functions
    
    /**
     * @dev Get vote count for a specific proposal
     * @param proposalId ID of the proposal
     * @return voteCount Number of votes
     */
    function getProposalVoteCount(uint proposalId) external view returns (uint voteCount) {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        return proposals[proposalId].voteCount;
    }
    
    /**
     * @dev Get proposal details
     * @param proposalId ID of the proposal
     * @return name Proposal name
     * @return voteCount Number of votes
     * @return active Whether proposal is active
     */
    function getProposal(uint proposalId) external view returns (
        bytes32 name,
        uint voteCount,
        bool active
    ) {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        Proposal storage p = proposals[proposalId];
        return (p.name, p.voteCount, p.active);
    }
    
    /**
     * @dev Get all active proposal IDs
     * WARNING: This can become expensive if there are many active proposals
     * Recommended: Query events off-chain or use pagination
     * @return Array of active proposal IDs
     */
    function getActiveProposalIds() external view returns (uint[] memory) {
        return activeProposalIds;
    }
    
    /**
     * @dev Get active proposal count
     * @return Number of active proposals
     */
    function getActiveProposalCount() external view returns (uint) {
        return activeProposalIds.length;
    }
    
    /**
     * @dev Get winner among specified proposal IDs (off-chain should provide candidates)
     * This avoids unbounded loops - caller must know which proposals to compare
     * @param proposalIds Array of proposal IDs to compare
     * @return winningProposalId ID of the winning proposal
     * @return winningVoteCount Vote count of winner
     */
    function getWinnerAmong(uint[] calldata proposalIds) external view returns (
        uint winningProposalId,
        uint winningVoteCount
    ) {
        require(proposalIds.length > 0, "Must provide at least one proposal");
        require(proposalIds.length <= MAX_BATCH_SIZE, "Too many proposals to compare");
        
        winningVoteCount = 0;
        
        for (uint i = 0; i < proposalIds.length; i++) {
            uint proposalId = proposalIds[i];
            if (proposals[proposalId].exists && proposals[proposalId].active) {
                if (proposals[proposalId].voteCount > winningVoteCount) {
                    winningVoteCount = proposals[proposalId].voteCount;
                    winningProposalId = proposalId;
                }
            }
        }
    }
    
    /**
     * @dev Get winner name among specified proposals
     * @param proposalIds Array of proposal IDs to compare
     * @return winnerName Name of the winning proposal
     */
    function getWinnerNameAmong(uint[] calldata proposalIds) external view returns (bytes32 winnerName) {
        require(proposalIds.length > 0, "Must provide at least one proposal");
        require(proposalIds.length <= MAX_BATCH_SIZE, "Too many proposals to compare");
        
        uint winningVoteCount = 0;
        
        for (uint i = 0; i < proposalIds.length; i++) {
            uint proposalId = proposalIds[i];
            if (proposals[proposalId].exists && proposals[proposalId].active) {
                if (proposals[proposalId].voteCount > winningVoteCount) {
                    winningVoteCount = proposals[proposalId].voteCount;
                    winnerName = proposals[proposalId].name;
                }
            }
        }
    }
    
    /**
     * @dev Check if an address is a representative
     * @param account Address to check
     * @return True if the address is a representative
     */
    function isRepresentative(address account) external view returns (bool) {
        return representatives[account];
    }
    
    /**
     * @dev Check if an address has voting rights
     * @param account Address to check
     * @return True if the address has voting rights
     */
    function hasVotingRight(address account) external view returns (bool) {
        return voters[account].hasVotingRight;
    }
    
    /**
     * @dev Check if an address has already voted
     * @param account Address to check
     * @return True if the address has voted
     */
    function hasVoted(address account) external view returns (bool) {
        return voters[account].hasVoted;
    }
    
    /**
     * @dev Check if a representative has voted on a representative proposal
     * @param representative Address of the representative
     * @param proposalId ID of the representative proposal
     * @return True if already voted
     */
    function hasVotedOnRepProposal(address representative, uint proposalId) external view returns (bool) {
        return representativeVotes[representative][proposalId];
    }
    
    /**
     * @dev Get a list of deactivated proposal IDs that can be reused
     * @param maxResults Maximum number of results to return (to avoid gas issues)
     * @return reusableIds Array of proposal IDs that are deactivated and can be reused
     * 
     * This function helps representatives find old proposals that can be reused
     * instead of creating new ones, saving gas.
     */
    function getReusableProposalIds(uint maxResults) external view returns (uint[] memory reusableIds) {
        require(maxResults > 0 && maxResults <= MAX_BATCH_SIZE, "Invalid maxResults");
        
        // First pass: count deactivated proposals
        uint count = 0;
        for (uint i = 0; i < proposalCount && count < maxResults; i++) {
            if (proposals[i].exists && !proposals[i].active) {
                count++;
            }
        }
        
        // Second pass: collect IDs
        reusableIds = new uint[](count);
        uint index = 0;
        for (uint i = 0; i < proposalCount && index < count; i++) {
            if (proposals[i].exists && !proposals[i].active) {
                reusableIds[index] = i;
                index++;
            }
        }
    }
}