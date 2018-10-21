'use strict';

const dBase = require(`../database/db`);

const setupCollection = async () => {
  const db = await dBase;

  const collection = db.collection(`offers`);
  collection.createIndex({date: 1});
  return collection;
};

class OfferStore {
  constructor(collection) {
    this.collection = collection;
  }

  async getOfferByDate(date) {
    return (await this.collection).findOne({date});
  }

  async getOffersBySkipAndLimit(skip, limit) {
    return (await this.collection).find().skip(skip).limit(limit).toArray();
  }

  async putOffer(offerData) {
    return (await this.collection).insertOne(offerData);
  }
}

module.exports = new OfferStore(setupCollection().catch((e) => console.error(`Не удалось настроить коллекцию offers`, e.message)));