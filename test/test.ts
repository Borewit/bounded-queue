import {queue} from '../src/bounded-queue.js';
import {assert} from 'chai';

class MockProducer<T> {

  constructor(private numberOfItems: number, private timeToProduce: number) {
  }

  async produce(): Promise<T | null> {
    if (this.numberOfItems-- === 0) {
      return null;
    }
    return new Promise(resolve => setTimeout(resolve, this.timeToProduce));
  }
}

class MockConsumer<T> {

  public itemsReceived: number = 0;

  constructor(private timeToProduce: number) {
  }

  async consume(batchedItem: T): Promise<void> {
    ++this.itemsReceived;
    return new Promise(resolve => setTimeout(resolve, this.timeToProduce));
  }
}

describe('bounded-queue', () => {

  it('slow consumer, fast consumer', async () => {
    const producer = new MockProducer<object>(10, 50);
    const consumer = new MockConsumer<object>(25);
    await queue<object>(5, () => producer.produce(), item => consumer.consume(item));
    assert.equal(consumer.itemsReceived, 10, "Consumer should receive all items");
  });

  it('fast consumer, slow consumer', async () => {
    const producer = new MockProducer<object>(10, 25);
    const consumer = new MockConsumer<object>(50);
    await queue<object>(5, () => producer.produce(), item => consumer.consume(item));
    assert.equal(consumer.itemsReceived, 10, "Consumer should receive all items");
  });

});