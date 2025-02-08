export type Producer<ItemType> = () => Promise<ItemType | null>;
export type Consumer<ItemType> = (item: ItemType) => Promise<void>;

/**
 * A bounded asynchronous queue that fills items via a producer
 * and consumes them via a consumer.
 */
export class BoundedQueue<ItemType> {
  private queue: ItemType[] = [];
  private productionEnded = false;
  // When the queue is full (for the producer) or empty (for the consumer),
  // the corresponding loop waits on one or more of these resolvers.
  private waiters: (() => void)[] = [];

  constructor(
    private maxQueueSize: number,
    private producer: Producer<ItemType>,
    private consumer: Consumer<ItemType>
  ) {
  }

  /**
   * Notifies all waiting producers/consumers that the queue state has changed.
   */
  private notifyAll(): void {
    for (const resolve of this.waiters) {
      resolve();
    }
    this.waiters = [];
  }

  /**
   * Returns a promise that resolves when a notification is sent.
   */
  private waitForNotification(): Promise<void> {
    return new Promise(resolve => {
      this.waiters.push(resolve);
    });
  }

  /**
   * The producer loop: repeatedly ask for new items until the producer
   * returns `null`. If the queue is full, wait until consumers have removed items.
   */
  private async produce(): Promise<void> {
    while (!this.productionEnded) {
      // Fill the queue until full.
      while (this.queue.length < this.maxQueueSize && !this.productionEnded) {
        const item = await this.producer();
        if (item === null) {
          this.productionEnded = true;
          // Wake up any waiting consumers.
          this.notifyAll();
          break;
        }
        this.queue.push(item);
        this.notifyAll();
      }
      // Wait until a consumer removes some items.
      if (!this.productionEnded) {
        await this.waitForNotification();
      }
    }
  }

  /**
   * The consumer loop: repeatedly removes items from the queue and
   * processes them. It keeps running until production ends and the queue is empty.
   */
  private async consume(): Promise<void> {
    while (!this.productionEnded || this.queue.length > 0) {
      while (this.queue.length > 0) {
        // Since the producer never enqueues null, we can safely assert the item exists.
        const item = this.queue.shift()!;
        await this.consumer(item);
        this.notifyAll();
      }
      // If production is complete and there are no items, exit.
      if (this.productionEnded && this.queue.length === 0) {
        break;
      }
      // Wait for new items to be enqueued.
      await this.waitForNotification();
    }
  }

  /**
   * Returns the current number of items in the queue.
   */
  public get length(): number {
    return this.queue.length;
  }

  /**
   * Runs the producer and consumer loops concurrently until all work is done.
   */
  public async run(): Promise<void> {
    await Promise.all([this.produce(), this.consume()]);
  }
}

/**
 * Creates and runs a bounded queue that uses the given producer and consumer.
 *
 * @param maxQueueSize - Maximum number of items allowed in the queue.
 * @param producer - A function producing items (or `null` when done).
 * @param consumer - A function that consumes an item.
 * @returns A promise that resolves when all production and consumption is complete.
 */
export function queue<ItemType>(
  maxQueueSize: number,
  producer: Producer<ItemType>,
  consumer: Consumer<ItemType>
): Promise<void> {
  return new BoundedQueue(maxQueueSize, producer, consumer).run();
}
