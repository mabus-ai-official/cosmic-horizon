// Human-readable ABIs for Cosmic Horizon on-chain contracts
// Only includes functions the game server actually calls

export const gameTokenAbi = [
  "function mint(address to, uint256 amount)",
  "function burn(address from, uint256 amount)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalSupply() view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

export const shipNftAbi = [
  "function mintShip(address to, (string shipType, uint16 hullHp, uint16 maxHullHp, uint16 weaponEnergy, uint16 engineEnergy, uint16 cargoBays, bool hasCloakDevice, bool hasRacheDevice, bool hasJumpDrive) data) returns (uint256)",
  "function updateShip(uint256 tokenId, (string shipType, uint16 hullHp, uint16 maxHullHp, uint16 weaponEnergy, uint16 engineEnergy, uint16 cargoBays, bool hasCloakDevice, bool hasRacheDevice, bool hasJumpDrive) data)",
  "function destroyShip(uint256 tokenId)",
  "function getShip(uint256 tokenId) view returns ((string shipType, uint16 hullHp, uint16 maxHullHp, uint16 weaponEnergy, uint16 engineEnergy, uint16 cargoBays, bool hasCloakDevice, bool hasRacheDevice, bool hasJumpDrive))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "event ShipMinted(uint256 indexed tokenId, address indexed owner, string shipType)",
  "event ShipDestroyed(uint256 indexed tokenId)",
] as const;

export const equipmentNftAbi = [
  "function mintEquipment(address to, (string equipType, string name, uint16 tier, uint256 installedOnShip) data) returns (uint256)",
  "function installOnShip(uint256 tokenId, uint256 shipId)",
  "function uninstallFromShip(uint256 tokenId)",
  "function destroyEquipment(uint256 tokenId)",
  "function getEquipment(uint256 tokenId) view returns ((string equipType, string name, uint16 tier, uint256 installedOnShip))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "event EquipmentMinted(uint256 indexed tokenId, address indexed owner, string equipType)",
  "event EquipmentInstalled(uint256 indexed tokenId, uint256 indexed shipId)",
] as const;

export const characterNftAbi = [
  "function mintCharacter(address to, (string race, uint32 level, uint64 xp, uint64 totalCombatXp, uint64 totalMissionXp, uint64 totalTradeXp, uint64 totalExploreXp, uint256 syndicateIndex) data) returns (uint256)",
  "function updateCharacter(uint256 tokenId, (string race, uint32 level, uint64 xp, uint64 totalCombatXp, uint64 totalMissionXp, uint64 totalTradeXp, uint64 totalExploreXp, uint256 syndicateIndex) data)",
  "function updateSyndicate(uint256 tokenId, uint256 syndicateIndex)",
  "function updateFactionRep(uint256 tokenId, bytes32 factionId, int64 rep)",
  "function getCharacter(uint256 tokenId) view returns ((string race, uint32 level, uint64 xp, uint64 totalCombatXp, uint64 totalMissionXp, uint64 totalTradeXp, uint64 totalExploreXp, uint256 syndicateIndex))",
  "function getFactionRep(uint256 tokenId, bytes32 factionId) view returns (int64)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "event CharacterMinted(uint256 indexed tokenId, address indexed owner, string race)",
  "event CharacterUpdated(uint256 indexed tokenId)",
  "event SyndicateUpdated(uint256 indexed tokenId, uint256 syndicateIndex)",
  "event FactionRepUpdated(uint256 indexed tokenId, bytes32 indexed factionId, int64 rep)",
] as const;

export const planetNftAbi = [
  "function mintPlanet(address to, (string planetClass, string name, uint32 sectorId) data) returns (uint256)",
  "function updatePlanet(uint256 tokenId, (string planetClass, string name, uint32 sectorId) data)",
  "function transferPlanet(uint256 tokenId, address from, address to)",
  "function getPlanet(uint256 tokenId) view returns ((string planetClass, string name, uint32 sectorId))",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "event PlanetMinted(uint256 indexed tokenId, address indexed owner, string planetClass, uint32 sectorId)",
  "event PlanetUpdated(uint256 indexed tokenId)",
  "event PlanetTransferred(uint256 indexed tokenId, address indexed from, address indexed to)",
] as const;

export const syndicateFactoryAbi = [
  "function createSyndicate(string name, address founder, uint64 votingPeriod, uint256 quorumPercent) returns (uint256)",
  "function addMember(uint256 syndicateIndex, address member)",
  "function removeMember(uint256 syndicateIndex, address member)",
  "function syndicateCount() view returns (uint256)",
  "function getSyndicate(uint256 index) view returns ((string name, address token, address treasury, address governor, address founder, uint64 createdAt))",
  "event SyndicateCreated(uint256 indexed index, string name, address indexed founder, address token, address treasury, address governor)",
  "event MemberAdded(uint256 indexed syndicateIndex, address indexed member)",
  "event MemberRemoved(uint256 indexed syndicateIndex, address indexed member)",
] as const;

export const syndicateGovernorAbi = [
  "function propose(string description, address target, bytes callData) returns (uint256)",
  "function castVote(uint256 proposalId, bool support)",
  "function execute(uint256 proposalId)",
  "function cancel(uint256 proposalId)",
  "function proposalCount() view returns (uint256)",
  "function proposals(uint256) view returns (uint256 id, address proposer, string description, bytes callData, address target, uint64 voteStart, uint64 voteEnd, uint256 forVotes, uint256 againstVotes, bool executed, bool cancelled)",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight)",
  "event ProposalExecuted(uint256 indexed proposalId)",
  "event ProposalCancelled(uint256 indexed proposalId)",
] as const;

export const memberFactoryAbi = [
  "function registerMember(address player) returns (address clone)",
  "function getMemberContract(address player) view returns (address)",
  "function predictMemberAddress(address player) view returns (address)",
  "function memberCount() view returns (uint256)",
  "event MemberRegistered(address indexed player, address indexed memberContract)",
] as const;

export const memberContractAbi = [
  "function deposit(address token, uint256 amount)",
  "function depositNFT(address nftContract, uint256 tokenId)",
  "function executeAction(bytes32 actionType, bytes data)",
  "function creditFungible(address token, uint256 amount)",
  "function debitFungible(address token, uint256 amount)",
  "function creditNFT(address nftContract, uint256 tokenId)",
  "function debitNFT(address nftContract, uint256 tokenId)",
  "function transferFungibleTo(address token, address toMember, uint256 amount)",
  "function transferNFTTo(address nftContract, uint256 tokenId, address toMember)",
  "function withdraw(address token, uint256 amount, bytes proof)",
  "function withdrawNFT(address nftContract, uint256 tokenId, bytes proof)",
  "function fungibleLedger(address token) view returns (uint256)",
  "function nftLedger(address nftContract, uint256 tokenId) view returns (bool)",
  "function getActionCount() view returns (uint256)",
  "function player() view returns (address)",
  "function gameServer() view returns (address)",
  "event ActionExecuted(bytes32 indexed actionType, uint256 logIndex)",
  "event Deposited(address indexed token, uint256 amount)",
  "event AssetTransferred(address indexed token, address indexed toMember, uint256 amount)",
  "event Withdrawn(address indexed token, uint256 amount)",
] as const;
