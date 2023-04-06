import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator'

@ValidatorConstraint({ name: 'isTimestamp', async: false })
export class IsTimestamp implements ValidatorConstraintInterface {
  validate(value: number) {
    return value > 0
  }
  defaultMessage(): string {
    return `($value) must be an timestamp in seconds format`
  }
}
