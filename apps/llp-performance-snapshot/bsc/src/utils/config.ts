import { Address, BigInt } from '@graphprotocol/graph-ts';

class Config {
  pool: Address;
  oracleV1: Address;
  oracle: Address;
  tranches: Address[];
  stableTokens: Address[];
  excludeTrackLp: Address[];
  oracle_block_update: BigInt;
  dao_fee_block_update: BigInt;
  poolTokens: Address[];
  wrong_price_feed_timestamp: BigInt;
}

export const config: Config = {
  pool: Address.fromString('0xA5aBFB56a78D2BD4689b25B8A77fd49Bb0675874'),
  oracle: Address.fromString('0x04Db83667F5d59FF61fA6BbBD894824B233b3693'),
  oracleV1: Address.fromString('0x6e021445ae6Aa7bFD144E9fc7dAb8ed3b0CDDaAa'),
  tranches: [
    Address.fromString('0xB5C42F84Ab3f786bCA9761240546AA9cEC1f8821'), // Senior Tranche
    Address.fromString('0x4265af66537F7BE1Ca60Ca6070D97531EC571BDd'), // Mezzanine Tranche
    Address.fromString('0xcC5368f152453D497061CB1fB578D2d3C54bD0A0'), // Junior Tranche
  ],
  stableTokens: [
    Address.fromString('0x55d398326f99059fF775485246999027B3197955'), // usdt
    Address.fromString('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'), // busd
  ],
  excludeTrackLp: [
    Address.fromString('0x0000000000000000000000000000000000000000'),
    Address.fromString('0x1Ab33A7454427814a71F128109fE5B498Aa21E5d'), // farm
    Address.fromString('0x5aE081b6647aEF897dEc738642089D4BDa93C0e7'), // farm v2
    Address.fromString('0xBD8638C1fF477275E49aaAe3E4691b74AE76BeCd'), // Liquidity Router
    Address.fromString('0x70f1555889dD1bD458A430bD57D22c12C6FCF9a4'), // LockDrop Old
    Address.fromString('0xd804ea7306abe2456bdd04a31f6f6a2f55dc0d21'), // LockDrop
    Address.fromString('0xf37DAc12B916356c44585333F33Cd2dF366dA487'), // LlpRewardDistributor
    Address.fromString('0xB61c13458626e33ee362390e2AD2D4F15F2a2031'), // GovernanceRedemptionPoolV2
    Address.fromString('0xe5f3b669fd58AF914111759da054f3029734678C'), // Staking LGO
    Address.fromString('0x08A12FFedf49fa5f149C73B07E31f99249e40869'), // Staking LVL
  ],
  poolTokens: [
    Address.fromString('0x55d398326f99059fF775485246999027B3197955'), // usdt
    Address.fromString('0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56'), // busd
    Address.fromString('0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c'), // btc
    Address.fromString('0x2170Ed0880ac9A755fd29B2688956BD959F933F8'), // eth
    Address.fromString('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'), // wbnb
    Address.fromString('0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'), // cake
  ],
  oracle_block_update: BigInt.fromI32(24148430),
  dao_fee_block_update: BigInt.fromI32(24088804),
  wrong_price_feed_timestamp: BigInt.fromI32(1673481600),
};
