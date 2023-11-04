[![Node.js CI](https://github.com/Borewit/bounded-queue/actions/workflows/nodejs-ci.yml/badge.svg)](https://github.com/Borewit/bounded-queue/actions/workflows/nodejs-ci.yml)
[![NPM version](https://badge.fury.io/js/bounded-queue.svg)](https://npmjs.org/package/bounded-queue)

# bounded-queue

`bounded-queue` helps solves the [producer–consumer problem](https://en.wikipedia.org/wiki/Producer%E2%80%93consumer_problem).

```mermaid
graph LR;
    P(Producer);
    B[bounded-queue];
    C(Consumer);
    P-- batched item -->B;
    B-- batched item -->C;
    style B fill:#99E,stroke:#333
```
The `bounded-queue` allows the producer and consumer to operate in 

## Introduction

Imagine you have to read records from a database and write those to another database.
A simple way to that move the records is to first read from database _A_ and sequentially write each record to database _B_.

```js
async function convertDatabaseRecords() {

  while(dbA.moreRecordsAvailable) {
    const record = await dbA.readRecord();
    // Consumer
    await dbB.writeRecord(record); // expenive async write (consume) operation
  }
}
```
In the previous example, we either read from database A, or write to database B. 
It would be faster if read from database A, while we write to database B, at the same time.
As `dbA.readRecord()` and dbB.readRecord()` are `async` functions, there is no need to introduce threading to accomplish that.  

The `bounded-queue` helps you with that. The following example uses `bounded-queue`, with a maximum of 3 queued records:

```js
import {queue} from 'bounded-queue';

async function convertDatabaseRecords() {

  await queue(3, () => {
    // Producer
    return dbA.moreRecordsAvailable ? null : dbA.readRecord(); // expenive async read (produce) operation
  }, record => {
    // Consumer
    return dbB.writeRecord(record); // expenive async write (consume) operation
  });
}
```

## Installation

```shell
npm install bounded-queue
```

## API

### Producer

The producer returns (produces) a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) which resolves the batched item tp be placed on the queue.
`null` can be returns to indicate end of the production.

### Consumer

The consumer will be called with the first batch item available on the queue.
It returns a [promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), and when resolves, it indicates it can handle the next batch item.

