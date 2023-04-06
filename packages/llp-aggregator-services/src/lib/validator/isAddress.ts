import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'
import { isAddress } from 'ethers/lib/utils'

@ValidatorConstraint({ name: 'isAddress', async: false })
export class IsAddress implements ValidatorConstraintInterface {
  validate(value: string) {
    return isAddress(value)
  }
  defaultMessage(): string {
    return `($value) must be an address`
  }
}
