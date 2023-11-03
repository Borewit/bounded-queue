export type Producer<ItemType> = () => Promise<ItemType| null>;
export type Consumer<ItemType> = (item: ItemType) => Promise<void>;

export class BoundedQueue<ItemType> {
  private queue: ItemType[] = [];
  private idlePromise?: Promise<boolean> | null = null;
  private resolveIdle: (value: boolean) => void = () => undefined;
  private endOfProduction = false;

  constructor(
    private maxQueueSize: number,
    private producer: Producer<ItemType>,
    private consumer: Consumer<ItemType>
  ) {
  }

  private async asyncFillQueue(): Promise<void> {
    do {
      while (this.queue.length < this.maxQueueSize) {
        const batch = await this.producer();
        if (batch === null) {
          this.endOfProduction = true;
          this.wakeUp();
          return;
        }
        this.queue.push(batch);
        this.wakeUp();
      }
    } while (await this.idleWait());
  }

  private async asyncEmptyQueue(): Promise<void> {
    do {
      while (this.queue.length > 0) {
        const batchItem = this.queue.shift() as ItemType;
        this.wakeUp();
        if (batchItem === null) {
          if (this.idlePromise) {
            this.idlePromise = null;
            this.resolveIdle(false);
          }
          return;
        }
        await this.consumer(batchItem);
      }
    } while (await this.idleWait());
  }

  private wakeUp(): void {
    if (this.idlePromise) {
      this.idlePromise = null;
      this.resolveIdle(!this.endOfProduction);
    }
  }

  private async idleWait(): Promise<boolean> {
    if (this.endOfProduction) {
      return false;
    }
    this.idlePromise = new Promise(resolve => {
      this.resolveIdle = resolve;
    });
    return this.idlePromise;
  }

  /**
   * Number of items queued
   */
  public length(): number {
    return this.queue.length;
  }

  async run(): Promise<void> {
    await Promise.all([this.asyncFillQueue(), this.asyncEmptyQueue()]);
  }
}

/**
 * @param maxQueueSize Maximum number of items that can be in the queue.
 * @param producer A function that produces items to be added to the queue.
 * @param consumer A function that consumes items from the queue.
 * @returns {Promise<void>}
 */
export function queue<ItemType>(maxQueueSize: number, producer: Producer<ItemType>, consumer: Consumer<ItemType>): Promise<void> {
  return new BoundedQueue(maxQueueSize, producer, consumer).run();
}