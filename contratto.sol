// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

/**
 * @title ComitatoStudentesco with Fund Transfer Capabilities and Pro/Contra Votes
 * @dev Advanced voting system with pro/contra votes for regular proposals
 */
contract ComitatoStudentesco {
    // Constants
    uint public constant MAX_BATCH_SIZE = 100;
    uint public constant MAX_FUND_TRANSFER_PERCENTAGE = 20;

    // Structs (modified for pro/contra votes)
    struct Voter {
        bool hasVotingRight;
        bool hasVoted;
        uint256 votedProposalId;
        uint256 votedFundTransferProposalId;
    }

    struct Proposal {
        bytes32 name;
        uint votesPro;
        uint votesContra;
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

    struct FundTransferProposal {
        address payable recipient;
        uint256 amount;
        uint256 voteCount;
        bool active;
        uint256 startBlock;
        uint256 lastExecutionBlock;
    }

    // State variables
    mapping(address => bool) public representatives;
    uint public representativeCount;

    mapping(address => Voter) public voters;

    mapping(uint => Proposal) public proposals;
    uint public proposalCount;
    uint[] private activeProposalIds;
    mapping(uint => uint) private activeProposalIndex;

    mapping(uint => RepresentativeProposal) public representativeProposals;
    uint public representativeProposalCount;

    FundTransferProposal[] public fundTransferProposals;
    mapping(uint256 => uint256) public fundTransferProposalTotalVotes;
    uint public fundTransferProposalCount;
    uint public totalFunds;
    uint public votingDuration = 69;

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

    event VoteProCast(address indexed voter, uint indexed proposalId);
    event VoteContraCast(address indexed voter, uint indexed proposalId);
    event VotingSessionReset();

    event FundsReceived(address indexed sender, uint256 amount);
    event FundTransferProposalAdded(uint indexed proposalId, address indexed recipient, uint256 amount);
    event FundTransferProposalUpdated(uint indexed proposalId, address indexed recipient, uint256 amount);
    event FundTransferProposalActivated(uint indexed proposalId);
    event FundTransferProposalDeactivated(uint indexed proposalId);
    event FundsTransferred(uint indexed proposalId, address indexed recipient, uint256 amount);
    event VoteCast(address indexed voter, uint indexed proposalId);

    // Modifiers
    modifier onlyRepresentative() {
        require(representatives[msg.sender], "Only representatives can call this function");
        _;
    }

    modifier onlyVoter() {
        require(voters[msg.sender].hasVotingRight, "You don't have voting rights");
        _;
    }

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

    // Fund Management Functions
    receive() external payable {
        totalFunds += msg.value;
        emit FundsReceived(msg.sender, msg.value);
    }

        function setVotingDuration(uint _duration) external onlyRepresentative {
        require(_duration > 0, "Duration > 0");
        votingDuration = _duration;
    }

    // Fund Transfer Proposal Functions
    function addFundTransferProposal(address payable _recipient, uint256 _amount) external onlyRepresentative {
        require(_amount > 0, "Amount must be greater than 0");
        require(_amount <= (totalFunds * MAX_FUND_TRANSFER_PERCENTAGE) / 100, "Amount cannot exceed 20% of total funds");

        fundTransferProposals.push(FundTransferProposal({
            recipient: _recipient,
            amount: _amount,
            voteCount: 0,
            active: true,
            startBlock: block.number,
            lastExecutionBlock: 0
        }));

        emit FundTransferProposalAdded(fundTransferProposalCount, _recipient, _amount);
        fundTransferProposalCount++;
    }

    function updateFundTransferProposal(
        uint256 _proposalId,
        address payable _newRecipient,
        uint256 _newAmount
    ) external onlyRepresentative {
        require(_proposalId < fundTransferProposalCount, "Proposal does not exist");
        require(_newAmount > 0, "Amount must be greater than 0");
        require(_newAmount <= (totalFunds * MAX_FUND_TRANSFER_PERCENTAGE) / 100, "Amount cannot exceed 20% of total funds");

        fundTransferProposals[_proposalId].recipient = _newRecipient;
        fundTransferProposals[_proposalId].amount = _newAmount;
        emit FundTransferProposalUpdated(_proposalId, _newRecipient, _newAmount);
    }

    function activateFundTransferProposal(uint256 _proposalId) external onlyRepresentative {
        require(_proposalId < fundTransferProposalCount, "Proposal does not exist");
        require(!fundTransferProposals[_proposalId].active, "Proposal is already active");

        fundTransferProposals[_proposalId].active = true;
        fundTransferProposals[_proposalId].startBlock = block.number;
        fundTransferProposals[_proposalId].voteCount = 0;
        emit FundTransferProposalActivated(_proposalId);
    }

    function deactivateFundTransferProposal(uint256 _proposalId) external onlyRepresentative {
        require(_proposalId < fundTransferProposalCount, "Proposal does not exist");
        require(fundTransferProposals[_proposalId].active, "Proposal is already deactivated");

        fundTransferProposals[_proposalId].active = false;
        emit FundTransferProposalDeactivated(_proposalId);
    }

    function voteForFundTransfer(uint256 _proposalId) external onlyVoter {
    require(_proposalId < fundTransferProposalCount, "Proposal does not exist");
    require(fundTransferProposals[_proposalId].active, "Proposal is not active");
    require(!voters[msg.sender].hasVoted, "You have already voted");
    require(block.number <= fundTransferProposals[_proposalId].startBlock + votingDuration, "Voting period has ended");

    voters[msg.sender].hasVoted = true;
    voters[msg.sender].votedFundTransferProposalId = _proposalId;
    fundTransferProposals[_proposalId].voteCount++;
    fundTransferProposalTotalVotes[_proposalId]++; // Incrementa il conteggio totale dei voti

    emit VoteCast(msg.sender, _proposalId);
}

    function executeFundTransfer(uint256 _proposalId) external {
    require(_proposalId < fundTransferProposalCount, "SchoolVotingSystem: Proposal does not exist");

    FundTransferProposal storage proposal = fundTransferProposals[_proposalId];
    require(proposal.active, "SchoolVotingSystem: Proposal is not active");
    require(block.number > proposal.startBlock + votingDuration, "SchoolVotingSystem: Voting period not yet ended");

    // Usa il totale dei voti tracciato
    uint256 totalVotes = fundTransferProposalTotalVotes[_proposalId];
    require(totalVotes > 0, "SchoolVotingSystem: No votes cast for this proposal");
    require(proposal.voteCount > totalVotes / 2, "SchoolVotingSystem: Proposal needs more than 50% favorable votes");

    require(proposal.amount <= (totalFunds * MAX_FUND_TRANSFER_PERCENTAGE) / 100, "SchoolVotingSystem: Amount exceeds current 20% limit");
    require(totalFunds >= proposal.amount, "SchoolVotingSystem: Insufficient funds");
    require(proposal.lastExecutionBlock == 0, "SchoolVotingSystem: Proposal already executed");

    totalFunds -= proposal.amount;
    proposal.lastExecutionBlock = block.number;
    proposal.active = false;

    (bool success, ) = proposal.recipient.call{value: proposal.amount}("");
    require(success, "SchoolVotingSystem: Transfer failed");

    emit FundsTransferred(_proposalId, proposal.recipient, proposal.amount);
    emit FundTransferProposalDeactivated(_proposalId);
}

    // Representative Management Functions
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

    function proposeRemoveRepresentative(address representative) external onlyRepresentative {
        require(representatives[representative], "Not a representative");
        require(representative != 0xeFa4F514845DF1A6ccc20e44655bdC004013C9Bc, "This representative cannot be removed");
        require(representativeCount > 1, "Cannot remove the last representative");

        uint proposalId = representativeProposalCount++;
        RepresentativeProposal storage proposal = representativeProposals[proposalId];
        proposal.targetAddress = representative;
        proposal.isAddition = false;
        proposal.executed = false;

        emit RepresentativeProposalCreated(proposalId, representative, false);
    }

    function emergencyAddRepresentative(address newRepresentative) external onlyRepresentative {
        require(representativeCount == 1, "Only callable when exactly one representative remains");
        require(!representatives[newRepresentative], "Already a representative");
        require(newRepresentative != address(0), "Invalid address");

        representatives[newRepresentative] = true;
        representativeCount++;
        emit RepresentativeAdded(newRepresentative);
    }

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
        _tryExecuteRepresentativeProposal(proposalId);
    }

    function _tryExecuteRepresentativeProposal(uint proposalId) internal {
        RepresentativeProposal storage proposal = representativeProposals[proposalId];

        if (proposal.executed) return;

        uint requiredVotes = (representativeCount / 2) + 1;

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
    function giveRightToVote(address voter) external onlyRepresentative {
        require(voter != address(0), "Invalid address");
        require(!voters[voter].hasVotingRight, "Already has voting rights");

        voters[voter] = Voter({
            hasVotingRight: true,
            hasVoted: false,
            votedProposalId: 0,
            votedFundTransferProposalId: 0
        });

        emit VotingRightGranted(voter);
    }

    function revokeRightToVote(address voter) external onlyRepresentative {
        require(voters[voter].hasVotingRight, "Voter doesn't have voting rights");
        delete voters[voter];
        emit VotingRightRevoked(voter);
    }

    function giveRightToVoteMultiple(address[] calldata voterAddresses) external onlyRepresentative {
        require(voterAddresses.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");

        for (uint i = 0; i < voterAddresses.length; i++) {
            address voter = voterAddresses[i];
            if (voter != address(0) && !voters[voter].hasVotingRight) {
                voters[voter] = Voter({
                    hasVotingRight: true,
                    hasVoted: false,
                    votedProposalId: 0,
                    votedFundTransferProposalId: 0
                });
                emit VotingRightGranted(voter);
            }
        }
    }

    // Proposal Management Functions
    function stringToBytes32(string memory input) public pure returns (bytes32 result) {
        bytes memory tempBytes = bytes(input);
        require(tempBytes.length <= 32, "String too long (max 32 bytes)");

        assembly {
            result := mload(add(tempBytes, 32))
        }
    }

    function addProposal(string memory name) external onlyRepresentative returns (uint proposalId) {
        bytes32 nameBytes32 = stringToBytes32(name);
        require(nameBytes32 != bytes32(0), "Proposal name cannot be empty");

        proposalId = proposalCount++;

        proposals[proposalId] = Proposal({
            name: nameBytes32,
            votesPro: 0,
            votesContra: 0,
            exists: true,
            active: true
        });

        activeProposalIndex[proposalId] = activeProposalIds.length;
        activeProposalIds.push(proposalId);

        emit ProposalAdded(proposalId, nameBytes32);
    }

    function addProposalsMultiple(string[] calldata names) external onlyRepresentative returns (uint[] memory proposalIds) {
        require(names.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");

        proposalIds = new uint[](names.length);

        for (uint i = 0; i < names.length; i++) {
            bytes32 nameBytes32 = stringToBytes32(names[i]);
            if (nameBytes32 != bytes32(0)) {
                uint proposalId = proposalCount++;

                proposals[proposalId] = Proposal({
                    name: nameBytes32,
                    votesPro: 0,
                    votesContra: 0,
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

    function deactivateProposal(uint proposalId) external onlyRepresentative {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(proposals[proposalId].active, "Proposal already inactive");

        proposals[proposalId].active = false;
        _removeFromActiveProposals(proposalId);

        emit ProposalDeactivated(proposalId);
    }

    function reactivateProposal(uint proposalId) external onlyRepresentative {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(!proposals[proposalId].active, "Proposal already active");

        proposals[proposalId].active = true;
        activeProposalIndex[proposalId] = activeProposalIds.length;
        activeProposalIds.push(proposalId);

        emit ProposalActivated(proposalId);
    }

    function reuseProposal(uint proposalId, string memory newName) external onlyRepresentative {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(!proposals[proposalId].active, "Proposal is still active - deactivate it first");

        bytes32 newNameBytes32 = stringToBytes32(newName);
        require(newNameBytes32 != bytes32(0), "Proposal name cannot be empty");

        proposals[proposalId].name = newNameBytes32;
        proposals[proposalId].votesPro = 0;
        proposals[proposalId].votesContra = 0;
        proposals[proposalId].active = true;

        activeProposalIndex[proposalId] = activeProposalIds.length;
        activeProposalIds.push(proposalId);

        emit ProposalActivated(proposalId);
        emit ProposalAdded(proposalId, newNameBytes32);
    }

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

    // Modified Voting Functions for pro/contra
    function votePro(uint proposalId) external onlyVoter {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(proposals[proposalId].active, "Proposal is not active");
        require(!voters[msg.sender].hasVoted, "Already voted");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = proposalId;
        proposals[proposalId].votesPro++;

        emit VoteProCast(msg.sender, proposalId);
    }

    function voteContra(uint proposalId) external onlyVoter {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        require(proposals[proposalId].active, "Proposal is not active");
        require(!voters[msg.sender].hasVoted, "Already voted");

        voters[msg.sender].hasVoted = true;
        voters[msg.sender].votedProposalId = proposalId;
        proposals[proposalId].votesContra++;

        emit VoteContraCast(msg.sender, proposalId);
    }

    function resetVoter(address voter) external onlyRepresentative {
        require(voters[voter].hasVotingRight, "Voter doesn't have voting rights");
        voters[voter].hasVoted = false;
        voters[voter].votedProposalId = 0;
        voters[voter].votedFundTransferProposalId = 0;
    }

    function resetVotersMultiple(address[] calldata voterAddresses) external onlyRepresentative {
        require(voterAddresses.length <= MAX_BATCH_SIZE, "Batch size exceeds limit");

        for (uint i = 0; i < voterAddresses.length; i++) {
            if (voters[voterAddresses[i]].hasVotingRight) {
                voters[voterAddresses[i]].hasVoted = false;
                voters[voterAddresses[i]].votedProposalId = 0;
                voters[voterAddresses[i]].votedFundTransferProposalId = 0;
            }
        }
    }

    // Modified View Functions for pro/contra
    function getProposalVoteCounts(uint proposalId) external view returns (uint votesPro, uint votesContra) {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        return (proposals[proposalId].votesPro, proposals[proposalId].votesContra);
    }

    function getProposal(uint proposalId) external view returns (
        bytes32 name,
        uint votesPro,
        uint votesContra,
        bool active
    ) {
        require(proposals[proposalId].exists, "Proposal doesn't exist");
        Proposal storage p = proposals[proposalId];
        return (p.name, p.votesPro, p.votesContra, p.active);
    }

    function getWinnerAmong(uint[] calldata proposalIds) external view returns (
        uint winningProposalId,
        int256 winningMargine
    ) {
        require(proposalIds.length > 0, "Must provide at least one proposal");
        require(proposalIds.length <= MAX_BATCH_SIZE, "Too many proposals to compare");

        winningMargine = type(int256).min;

        for (uint i = 0; i < proposalIds.length; i++) {
            uint proposalId = proposalIds[i];
            if (proposals[proposalId].exists && proposals[proposalId].active) {
                int256 currentMargine = int256(proposals[proposalId].votesPro) -
                                        int256(proposals[proposalId].votesContra);
                if (currentMargine > winningMargine) {
                    winningMargine = currentMargine;
                    winningProposalId = proposalId;
                }
            }
        }
    }

    function getWinnerNameAmong(uint[] calldata proposalIds) external view returns (
        bytes32 winnerName,
        int256 winningMargine
    ) {
        require(proposalIds.length > 0, "Must provide at least one proposal");
        require(proposalIds.length <= MAX_BATCH_SIZE, "Too many proposals to compare");

        winningMargine = type(int256).min;

        for (uint i = 0; i < proposalIds.length; i++) {
            uint proposalId = proposalIds[i];
            if (proposals[proposalId].exists && proposals[proposalId].active) {
                int256 currentMargine = int256(proposals[proposalId].votesPro) -
                                        int256(proposals[proposalId].votesContra);
                if (currentMargine > winningMargine) {
                    winningMargine = currentMargine;
                    winnerName = proposals[proposalId].name;
                }
            }
        }
    }

    // All other view functions remain the same
    function getActiveProposalIds() external view returns (uint[] memory) {
        return activeProposalIds;
    }

    function getActiveProposalCount() external view returns (uint) {
        return activeProposalIds.length;
    }

    function isRepresentative(address account) external view returns (bool) {
        return representatives[account];
    }

    function hasVotingRight(address account) external view returns (bool) {
        return voters[account].hasVotingRight;
    }

    function hasVoted(address account) external view returns (bool) {
        return voters[account].hasVoted;
    }

    function hasVotedOnRepProposal(address representative, uint proposalId) external view returns (bool) {
        return representativeVotes[representative][proposalId];
    }

    function getReusableProposalIds(uint maxResults) external view returns (uint[] memory reusableIds) {
        require(maxResults > 0 && maxResults <= MAX_BATCH_SIZE, "Invalid maxResults");

        uint count = 0;
        for (uint i = 0; i < proposalCount && count < maxResults; i++) {
            if (proposals[i].exists && !proposals[i].active) {
                count++;
            }
        }

        reusableIds = new uint[](count);
        uint index = 0;
        for (uint i = 0; i < proposalCount && index < count; i++) {
            if (proposals[i].exists && !proposals[i].active) {
                reusableIds[index] = i;
                index++;
            }
        }
    }

    // Fund Transfer Proposal View Functions
    function getFundTransferProposal(uint256 _proposalId)
        external
        view
        returns (
            address payable recipient,
            uint256 amount,
            uint256 voteCount,
            bool active,
            uint256 startBlock,
            uint256 lastExecutionBlock
        )
    {
        require(_proposalId < fundTransferProposalCount, "Proposal does not exist");
        FundTransferProposal memory proposal = fundTransferProposals[_proposalId];
        return (
            proposal.recipient,
            proposal.amount,
            proposal.voteCount,
            proposal.active,
            proposal.startBlock,
            proposal.lastExecutionBlock
        );
    }

    function getTotalFunds() external view returns (uint256) {
        return totalFunds;
    }

    function isFundTransferVotingOver(uint256 _proposalId) external view returns (bool) {
        require(_proposalId < fundTransferProposalCount, "Proposal does not exist");
        return block.number > fundTransferProposals[_proposalId].startBlock + votingDuration;
    }

    function isFundTransferProposalActive(uint256 _proposalId) external view returns (bool) {
        require(_proposalId < fundTransferProposalCount, "Proposal does not exist");
        return fundTransferProposals[_proposalId].active;
    }

    function getFundTransferProposalCount() external view returns (uint256) {
        return fundTransferProposalCount;
    }

    function getReusableFundTransferProposalIds(uint maxResults) external view returns (uint256[] memory reusableIds) {
        require(maxResults > 0 && maxResults <= MAX_BATCH_SIZE, "Invalid maxResults");

        uint256 count = 0;
        for (uint256 i = 0; i < fundTransferProposalCount && count < maxResults; i++) {
            if (!fundTransferProposals[i].active) {
                count++;
            }
        }

        reusableIds = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < fundTransferProposalCount && index < count; i++) {
            if (!fundTransferProposals[i].active) {
                reusableIds[index] = i;
                index++;
            }
        }
    }
}