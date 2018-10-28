'use strict';

const logger = require(`../../logger`);

const toStream = require(`buffer-to-stream`);
const express = require(`express`);
const multer = require(`multer`);

const jsonParser = express.json();
const upload = multer({storage: multer.memoryStorage()});

const NotFoundError = require(`../../error/not-found-error`);
const InvalidParamError = require(`../../error/invalid-param-error`);

const validate = require(`../validate`);
const schemeOfferDB = require(`../validation-scheme-db`);

const names = require(`../../../test/generator/generate-conditions`).author.name.values;

const asyncMiddleware = require(`./async-middle-ware`);

const prepareOffer = (offerData, avatar) => {
  if (!offerData.hasOwnProperty(`offer`)) {
    const date = Math.floor(new Date() / 1000);
    const [x, y] = offerData.address ? offerData.address.match(/\d+/g) : [undefined, undefined];
    if (!offerData.hasOwnProperty(`photos`)) {
      offerData.photos = [];
    }
    if (offerData.hasOwnProperty(`features`) && !Array.isArray(offerData.features)) {
      offerData.features = [offerData.features];
    }
    offerData = {
      author: {
        name: offerData.name ? offerData.name : names[Math.floor(Math.random() * names.length)],
      },
      offer: offerData,
      location: {x, y},
      date,
    };

    if (avatar && avatar.length > 0) {
      logger.verbose(`Загружен файл аватара: ${avatar[0].originalname}, тип: ${avatar[0].mimetype}, размер ${avatar[0].size} байт`);
      offerData.author.avatar = `/api/offers/${date}/avatar`;
    }
    logger.verbose(`Преобразованное содержимое запроса: ${JSON.stringify(offerData)}`);
  }
  return offerData;
};

module.exports = (offersRouter) => {

  offersRouter.get(`/:date/avatar`, asyncMiddleware(async (req, res) => {
    const offerDate = req.params.date;

    logger.verbose(`В запросе указана дата {${offerDate}}`);

    if (isNaN(parseInt(offerDate, 10))) {
      throw new InvalidParamError(`Неверный формат даты {${offerDate}}`);
    }
    const foundOffer = await offersRouter.offerStore.getOfferByDate(parseInt(offerDate, 10));

    if (!foundOffer) {
      throw new NotFoundError(`Предложений по указанной дате {${offerDate}} не найдено`);
    }

    const result = await offersRouter.imageStore.get(foundOffer._id);
    if (!result) {
      throw new NotFoundError(`Предложение на дату ${offerDate} не имеет аватара`);
    }
    res.header(`Content-Type`, `image/*`);
    res.header(`Content-Length`, result.info.length);

    logger.verbose(`Передаём аватар, размер: ${result.info.length} байт`);
    res.on(`error`, (err) => logger.error(`Ошибка чтения потока: ${err.message}`));
    res.on(`end`, () => {
      logger.verbose(`Передача аватара завершена: поток чтения`);
      res.end();
    });

    const stream = result.stream;

    stream.on(`error`, (err) => logger.error(`Ошибка записи потока: ${err.message}`));
    stream.on(`end`, () => {
      logger.verbose(`Передача аватара завершена: поток записи`);
      res.end();
    });
    stream.pipe(res);
  }));

  offersRouter.post(``, jsonParser, upload.any(), asyncMiddleware(async (req, res) => {
    let offerDate = {...req.body};
    const pictures = req.files;

    logger.verbose(`Содержимое запроса: ${JSON.stringify(offerDate)}`);
    logger.verbose(`Тип содержимого: ${req.headers[`content-type`]}`);

    offerDate = prepareOffer(offerDate, pictures);

    const validated = validate(schemeOfferDB, offerDate);

    const result = await offersRouter.offerStore.putOffer(validated);
    const insertedId = result.insertedId;

    if (pictures && pictures[0]) {
      await offersRouter.imageStore.save(insertedId, toStream(pictures[0].buffer));
      logger.verbose(`Файл аватара: ${pictures[0].originalname}, размер ${pictures[0].size} байт сохранён в БД`);
    }
    res.send(validated);
  }));
};
