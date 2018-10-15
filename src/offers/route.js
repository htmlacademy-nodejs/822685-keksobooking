'use strict';

const express = require(`express`);
const offersRouter = express.Router(); // eslint-disable-line new-cap
const NotFoundError = require(`../error/not-found-error`);
const InvalidParamError = require(`../error/invalid-param-error`);
const offersGenerator = require(`../offers-generator`);
const multer = require(`multer`);

const upload = multer({storage: multer.memoryStorage()});

const offers = offersGenerator();

offersRouter.get(``, (req, res) => {
  const query = req.query;
  let limit = 20;
  let skip = 0;
  if (query.hasOwnProperty(`skip`)) {
    skip = parseInt(query.skip, 10) ? parseInt(query.skip, 10) : skip;
  }
  if (query.hasOwnProperty(`limit`)) {
    limit = parseInt(query.limit, 10) ? parseInt(query.limit, 10) : limit;
  }
  res.send(offers.slice(skip, limit + skip));
});

offersRouter.get(`/:date`, (req, res) => {
  const offerDate = req.params.date;
  if (!offerDate) {
    throw new NotFoundError(`В запросе не указана дата`);
  }
  if (isNaN(parseInt(offerDate, 10))) {
    throw new InvalidParamError(`Неверный формат даты {${offerDate}}`);
  }
  const foundOffer = offers.find((item) => item.date === parseInt(offerDate, 10));
  if (!foundOffer) {
    throw new NotFoundError(`Предложений по указанной дате не найдено`);
  }
  res.send(foundOffer);
});

offersRouter.post(``, upload.none(), (req, res) => {
  const body = req.body;
  res.send(body);
});

module.exports = offersRouter;
