import bnbChain from '../assets/icons/chains/bnb.svg';
import arbChain from '../assets/icons/chains/arb.png';
import { Config as bsc } from './bsc';
import { Config as arbitrum } from './arbitrum';

export const chainIcons = {
  [arbitrum.chainId]: arbChain,
  [bsc.chainId]: bnbChain,
};
