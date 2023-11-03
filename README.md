[![Node.js CI](https://github.com/Borewit/bounded-queue/actions/workflows/nodejs-ci.yml/badge.svg)](https://github.com/Borewit/bounded-queue/actions/workflows/nodejs-ci.yml)

# bounded-queue

`bounded-queue` helps you to solve the [Producer–consumer problem](https://en.wikipedia.org/wiki/Producer%E2%80%93consumer_problem).

## Introduction

Imagine you have read records from a database and write those to another database.
A simple wait to that. is with the following code:

```js
import {queue} from 'bounded-queue';

async function convertDatabaseRecords() {

  while(dbA.moreRecorrdsAviable) {
    const record = await dbA.readRecord();
    // Consumer
    await dbB.writeRecord(record); // expenive async write (consume) operation
  }
}
```
In the previous example, we either read from database A, or write to database B. Would be faster if read from database A, while we write to database B at the same time.
As `dbA.readRecord()` and dbB.readRecord()` are `async` functions, there is no need to introduce threading to accomplish that.  

The `bounded-queue` helps you with that. The following example used a `bounded-queue` with a maximum of 3 queued records.:

```js
import {queue} from 'bounded-queue';

async function convertDatabaseRecords() {

  await queue(3, () => {
    // Producer
    return readItemFromOneDatabase(); // expenive async read (produce) operation
  }, record => {
    // Consumer
    writeRecordToAnotherDataBase(record); // expenive async write (consume) operation
  });
}
```

## Installation

```shell
npm install bounded-queue
```
