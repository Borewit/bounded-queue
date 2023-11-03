
/**
 * return null to indicate the end of the production
 */

export type Producer<ItemType> = () => Promise<ItemType>;
export type Consumer<ItemType> = (item: ItemType) => Promise<void>;

class BatchQueue<ItemType> {

  private queue: ItemType[];
  private idlePromise?: Promise<boolean> | null;
  private resolveIdle: (value: boolean) => void;
  private endOfProduction: boolean;

  constructor(private maxQueueSize: number, private producer: Producer<ItemType>, private consumer: Consumer<ItemType>) {
    this.queue = [];
    this.endOfProduction = false;
    this.resolveIdle = () => undefined; // ignore TypeScript errors
  }

  async #asyncFillQueue(): Promise<void> {
    do {
      while(this.queue.length < this.maxQueueSize) {
        const batch = await this.producer();
        if (batch === null) {
          this.endOfProduction = true;
          this.#wakeUp();
          return;
        }
        this.queue.push(await this.producer());
        this.#wakeUp();
      }
    } while(await this.#idleWait());
  }

  async #asyncEmptyQueue(): Promise<void> {
    do {
      while(this.queue.length > 0) {
        const batchItem = this.queue.shift() as ItemType;
        this.#wakeUp();
        if (batchItem === null) {
          if (this.idlePromise) {
            this.idlePromise = null;
            this.resolveIdle(false);
          }
          return;
        }
        await this.consumer(batchItem);
      }
    } while(await this.#idleWait());
  }

  #wakeUp(): void {
    if(this.idlePromise) {
      this.idlePromise = null;
      this.resolveIdle(!this.endOfProduction);
    }
  }

  async #idleWait(): Promise<boolean> {
    if (this.endOfProduction) {
      return false;
    }
    this.idlePromise = new Promise((resolve, reject) => {
      this.resolveIdle = resolve;
    });
    return this.idlePromise;
  }

  async run(): Promise<void> {
    await Promise.all([this.#asyncFillQueue(), this.#asyncEmptyQueue()]);
  }
}

/**
 * @param maxQueueSize Maximum number of items that can be in the queue.
 * @param producer A function that produces items to be added to the queue.
 * @param consumer A function that consumes items from the queue.
 * @returns {Promise<void>}
 */
export function queue<ItemType>(maxQueueSize: number, producer: Producer<ItemType>, consumer: Consumer<ItemType>): Promise<void> {
  return new BatchQueue(maxQueueSize, producer, consumer).run();
}
