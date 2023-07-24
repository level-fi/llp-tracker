import { Address, BigInt } from '@graphprotocol/graph-ts';

class Config {
  pool: Address;
  poolLens: Address;
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
  pool: Address.fromString('0x32B7bF19cb8b95C27E644183837813d4b595dcc6'),
  poolLens: Address.fromString('0x451acd3643D37B2841bEAc94E9a7320f11FDA06F'),
  oracle: Address.fromString('0x1E56Ab83AC0cb52713762E48915Fb368eC99BaA1'),
  tranches: [
    Address.fromString('0x5573405636F4b895E511C9C54aAfbefa0E7Ee458'), // Senior Tranche
    Address.fromString('0xb076f79f8D1477165E2ff8fa99930381FB7d94c1'), // Mezzanine Tranche
    Address.fromString('0x502697AF336F7413Bb4706262e7C506Edab4f3B9'), // Junior Tranche
  ],
  stableTokens: [
    Address.fromString('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'), // usdt
    Address.fromString('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'), // usdc
  ],
  excludeTrackLp: [
    Address.fromString('0x0000000000000000000000000000000000000000'),
    Address.fromString('0x0180dee5Df18eBF76642e50FaaEF426f7b2874f7'), // farm
    Address.fromString('0x1E46Ab9D3D9e87b95F2CD802208733C90a608805'), // Liquidity Router
    Address.fromString('0xf37DAc12B916356c44585333F33Cd2dF366dA487'), // LlpRewardDistributor
  ],
  poolTokens: [
    Address.fromString('0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'), // usdt
    Address.fromString('0xaf88d065e77c8cC2239327C5EDb3A432268e5831'), // usdc
    Address.fromString('0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f'), // btc
    Address.fromString('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'), // eth
    Address.fromString('0x912CE59144191C1204E64559FE8253a0e49E6548'), // arb
  ],
  oracle_block_update: BigInt.fromI32(0),
  dao_fee_block_update: BigInt.fromI32(0),
  wrong_price_feed_timestamp: BigInt.fromI32(0),
};
