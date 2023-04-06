import { InjectQueue } from "@nestjs/bull";
import { Injectable } from "@nestjs/common";
import { Queue } from "bull";
import { Redis } from "ioredis";

@Injectable()
export class RedisService {
  constructor(@InjectQueue() private readonly queue: Queue) {}
  get client(): Redis {
    return this.queue.client;
  }
}
