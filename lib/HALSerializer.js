'use strict';

const _ = require('lodash');
const joi = require('joi');

module.exports = class HALSerializer {
  constructor(opts) {
    this.opts = opts || {};
    this.schemas = {};
  }

  validateOptions(options) {
    const optionsSchema = joi.object({
      blacklist: joi.array().items(joi.string()).single().default([]),
      whitelist: joi.array().items(joi.string()).single().default([]),
      links: joi.alternatives([joi.func(), joi.object()]).default({}),
      embedded: joi.object().pattern(/.+/, joi.object({
        type: joi.string().required(),
        schema: joi.string(),
        links: joi.alternatives([joi.func(), joi.object()]).default({}),
      })).default({}),
      topLevelLinks: joi.alternatives([joi.func(), joi.object()]).default({}),
      topLevelMeta: joi.alternatives([joi.func(), joi.object()]).default({}),
    }).required();

    const validated = joi.validate(options, optionsSchema);

    if (validated.error) {
      throw new Error(validated.error);
    }

    return validated.value;
  }

  register(type, schemaName, options) {
    if (_.isObject(schemaName)) {
      options = schemaName;
      schemaName = 'default';
    }

    const name = schemaName || 'default';
    const opts = this.validateOptions(_.defaults({}, options));

    _.set(this.schemas, [type, name].join('.'), opts);
  }

  serialize(type, data, schemaName, extraOptions) {
    // Support optional arguments
    if (arguments.length === 3) {
      if (_.isPlainObject(schemaName)) {
        extraOptions = schemaName;
        schemaName = 'default';
      }
    }

    const schema = schemaName || 'default';
    const extraOpts = extraOptions || {};

    if (!this.schemas[type]) {
      throw new Error('No type registered for ' + type);
    }

    if (schema && !this.schemas[type][schema]) {
      throw new Error('No schema ' + schema + ' registered for ' + type);
    }

    const serialized = {};
    serialized._links = this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelLinks);
    _.assign(serialized, this.processOptionsValues(extraOpts, this.schemas[type][schema].topLevelMeta));
    _.assign(serialized, this.serializeData(type, data, this.schemas[type][schema]));

    return serialized;
  }

  serializeData(type, data, options) {
    // Empty data
    if (_.isEmpty(data)) {
      // Return [] or null
      return _.isArray(data) ? data : null;
    }

    // Array data
    if (_.isArray(data)) {
      const serializedCollection = {};
      serializedCollection._embedded = {};
      serializedCollection._embedded[type] = data.map(d => this.serializeData(type, d, options));
      return serializedCollection;
    }

    // Single data
    const serializedData = {};
    serializedData._links = this.processOptionsValues(data, options.links);
    _.assign(serializedData, this.serializeAttributes(data, options));
    serializedData._embedded = this.serializeEmbedded(data, options, serializedData._links);


    return serializedData;
  }

  serializeAttributes(data, options) {
    // Filter whitelist attributes
    if (options.whitelist.length > 0) {
      data = _.pick(data, options.whitelist);
    }

    // Remove embedded and blacklist attributes
    return _.pick(data, _.difference(Object.keys(data), _.concat(Object.keys(options.embedded), options.blacklist)));
  }

  serializeEmbedded(data, options, links) {
    const SerializedEmbedded = {};

    _.forOwn(options.embedded, (rOptions, embedded) => {
      const schema = rOptions.schema || 'default';
      const serializeEmbeddedResource = this.serializeEmbeddedResource(embedded, data[embedded], rOptions, this.schemas[options.embedded[embedded].type][schema], links);
      if (!_.isEmpty(serializeEmbeddedResource)) {
        _.set(SerializedEmbedded, embedded, serializeEmbeddedResource);
      }
    });

    return !_.isEmpty(SerializedEmbedded) ? SerializedEmbedded : undefined;
  }

  serializeEmbeddedResource(embedded, rData, rOptions, typeOptions, links) {
    // Empty embedded data
    if (_.isEmpty(rData)) {
      // Return [] or null
      return _.isArray(rData) ? rData : null;
    }

    // To-many embedded resources
    if (_.isArray(rData)) {
      links[embedded] = [];
      const arrayEmbedded = _.compact(rData.map(d => this.serializeEmbeddedResource(embedded, d, rOptions, typeOptions, links)));
      if (_.isEmpty(links[embedded])) {
        delete links[embedded];
      }
      return !_.isEmpty(arrayEmbedded) ? arrayEmbedded : undefined;
    }

    // To-One embedded resource
    let serializedEmbedded;
    let rLinks;

    rLinks = this.processOptionsValues(rData, rOptions.links);

    if (_.isPlainObject(rData)) {
      // Embedded resource has been populated
      serializedEmbedded = {};
      serializedEmbedded._links = rLinks;
      _.assign(serializedEmbedded, this.serializeData(rOptions.type, rData, typeOptions));
    }

    // Populate links
    if (!_.isUndefined(rLinks)) {
      if (_.isArray(links[embedded])) {
        links[embedded].push(rLinks);
      } else {
        links[embedded] = rLinks;
      }
    }

    return !_.isEmpty(serializedEmbedded) ? serializedEmbedded : undefined;
  }

  /**
  * Process options values.
  * Allows options to be an object or a function.
  *
  * @method JSONAPISerializer#processOptionsValues
  * @private
  * @param {Object} data data passed to functions options
  * @param {Object} options configuration options.
  * @return {Object}
  */
 processOptionsValues(data, options) {
   let processedOptions;
   if (_.isFunction(options)) {
     processedOptions = options(data);
   } else {
     processedOptions = _.mapValues(options, value => {
       let processed;
       if (_.isFunction(value)) {
         processed = value(data);
       } else {
         processed = value;
       }
       return processed;
     });
   }

   // Clean all undefined values
   processedOptions = _.omitBy(processedOptions, _.isUndefined);

   return !_.isEmpty(processedOptions) ? processedOptions : undefined;
 }
};
