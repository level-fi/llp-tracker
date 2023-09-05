import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>()
    const key = req.headers['x-api-key'] || req['query']?.['apiKey']
    if (!key) {
      return false
    }
    return key === this.config.get('auth.apikey')
  }
}
