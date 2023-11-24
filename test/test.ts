import {queue} from '../src/bounded-queue.js';
import {assert, expect} from 'chai';

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

  constructor(private timeToConsume: number) {
  }

  async consume(batchedItem: T): Promise<void> {
    ++this.itemsReceived;
    return new Promise(resolve => setTimeout(resolve, this.timeToConsume));
  }
}

describe('bounded-queue', () => {

  it('should be able to handle a slow consumer and a fast consumer', async () => {
    const producer = new MockProducer<object>(10, 50);
    const consumer = new MockConsumer<object>(5);
    await queue<object>(5, () => producer.produce(), item => consumer.consume(item));
    assert.equal(consumer.itemsReceived, 10, "Consumer should receive all items");
  });

  it('should be able to handle a fast consumer and a slow consumer', async () => {
    const producer = new MockProducer<object>(10, 5);
    const consumer = new MockConsumer<object>(50);
    await queue<object>(5, () => producer.produce(), item => consumer.consume(item));
    assert.equal(consumer.itemsReceived, 10, "Consumer should receive all items");
  });

  it('should reject on producer error', async () => {
    const producer = new MockProducer<object>(10, 50);
    const consumer = new MockConsumer<object>(5);
    let itemsProduced = 0;
    const result = queue<object>(5, () => {
      if(itemsProduced > 2) {
        throw new Error("Error while producing item");
      }
      ++itemsProduced;
      return producer.produce();
    }, item => { return consumer.consume(item)});
    expect(result).to.throw;
  });

  it('should reject on consumer error', async () => {
    const producer = new MockProducer<object>(10, 5);
    const consumer = new MockConsumer<object>(50);
    let itemsConsumed = 0;
    const result = queue<object>(5, () => producer.produce(), item => {
      if(itemsConsumed > 2) {
        throw new Error("Error while consuming item");
      }
      ++itemsConsumed;
      return consumer.consume(item);
    });
    expect(result).to.throw;
  });

});