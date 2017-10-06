'use strict';
/* eslint-disable */

const expect = require('chai').expect;
const _ = require('lodash');

const TickCounter = require('../helpers/tick-counter');

const HALSerializer = require('../../');

describe('HALSerializer', function() {
  describe('register', function() {
    it('should register an empty schema with the \'default\' schema name and default options', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles');
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('default');
      expect(Serializer.schemas.articles.default).to.eql(Serializer.validateOptions({}));
      done();
    });

    it('should register a schema with the \'default\' schema name', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles');
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('default');
      expect(Serializer.schemas.articles.default).to.eql(Serializer.validateOptions({}));
      done();
    });

    it('should register a schema with the \'custom\' schema name', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', 'custom');
      expect(Serializer.schemas).to.have.property('articles');
      expect(Serializer.schemas.articles).to.have.property('custom');
      done();
    });

    it('should throw an error for a bad options', function(done) {
      const Serializer = new HALSerializer();
      expect(function() {
        Serializer.register('bad', {
          blacklist: {
            bad: 'badOptions',
          },
        });
      }).to.throw(Error);
      done();
    });
  });

  describe('serializeData', function() {
    const Serializer = new HALSerializer();
    Serializer.register('articles');
    const defaultOptions = Serializer.validateOptions({});

    it('should return null for an empty single data', function(done) {
      const serializedData = Serializer.serializeData('articles', {}, defaultOptions);
      expect(serializedData).to.eql(null);
      done();
    });

    it('should return empty array for an empty array data', function(done) {
      const serializedData = Serializer.serializeData('articles', [], defaultOptions);
      expect(serializedData).to.eql([]);
      done();
    });

    it('should return serialized data for a single data', function(done) {
      const singleData = {
        id: '1',
        body: 'test body',
      };
      const serializedData = Serializer.serializeData('articles', singleData, defaultOptions);

      expect(serializedData).to.have.property('id').to.eql('1');
      expect(serializedData).to.have.property('body').to.eql('test body');
      expect(serializedData._embedded).to.be.undefined;
      expect(serializedData._links).to.be.undefined;

      done();
    });

    it('should return serialized data for an array data', function(done) {
      const arrayData = [{
        id: '1',
        body: 'test body 1',
      }, {
        id: '2',
        body: 'test body 2',
      }];

      const serializedData = Serializer.serializeData('articles', arrayData, defaultOptions);
      expect(serializedData).to.have.property('_embedded').to.have.property('articles');
      expect(serializedData._embedded.articles).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedData._embedded.articles[0]).to.have.property('id').to.eql('1');
      expect(serializedData._embedded.articles[0]).to.have.property('body').to.eql('test body 1');
      expect(serializedData._embedded.articles[0]._embedded).to.be.undefined;
      expect(serializedData._embedded.articles[0]._links).to.be.undefined;
      expect(serializedData._embedded.articles[1]).to.have.property('id').to.eql('2');
      expect(serializedData._embedded.articles[1]).to.have.property('body').to.eql('test body 2');
      expect(serializedData._embedded.articles[1]._embedded).to.be.undefined;
      expect(serializedData._embedded.articles[1]._links).to.be.undefined;
      done();
    });
  });

  describe('serializeEmbeddedResource', function() {
    const Serializer = new HALSerializer();
    Serializer.register('authors');
    Serializer.register('articles', {
      embedded: {
        author: {
          type: 'authors',
          links: {
            href: function(data) {
              return '/peoples/' + data.id;
            }
          }
        },
      },
    });

    it('should return null for an empty single embedded resource', function(done) {
      const serializedEmbedded = Serializer.serializeEmbeddedResource('author', {});
      expect(serializedEmbedded).to.eql(null);
      done();
    });

    it('should return empty array for an empty array of embedded resources', function(done) {
      const serializedEmbedded = Serializer.serializeEmbeddedResource('author', []);
      expect(serializedEmbedded).to.eql([]);
      done();
    });

    it('should return serialized embedded resource and populate links for a to one populated embedded resource', function(done) {
      const links = {}
      const serializedEmbedded = Serializer.serializeEmbeddedResource('author', {
        id: '1',
        name: 'Author 1',
      }, Serializer.schemas.articles.default.embedded.author, Serializer.schemas.authors.default, links);
      expect(serializedEmbedded).to.have.property('id').to.eql('1');
      expect(serializedEmbedded).to.have.property('name').to.eql('Author 1');
      expect(links).to.have.property('author').to.have.property('href').to.eql('/peoples/1');
      done();
    });

    it('should return serialized embedded resource and populate links for a to many populated embedded resources', function(done) {
      const links = {};
      const serializedEmbedded = Serializer.serializeEmbeddedResource('authors', [{
        id: '1',
        name: 'Author 1',
      }, {
        id: '2',
        name: 'Author 2',
      }], Serializer.schemas.articles.default.embedded.author, Serializer.schemas.authors.default, links);
      expect(serializedEmbedded).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedEmbedded[0]).to.have.property('id').to.eql('1');
      expect(serializedEmbedded[0]).to.have.property('name').to.eql('Author 1');
      expect(serializedEmbedded[1]).to.have.property('id').to.eql('2');
      expect(serializedEmbedded[1]).to.have.property('name').to.eql('Author 2');
      expect(links).to.have.property('authors').to.be.instanceof(Array).to.have.lengthOf(2);
      expect(links.authors[0]).to.have.property('href').to.eql('/peoples/1');
      expect(links.authors[1]).to.have.property('href').to.eql('/peoples/2');
      done();
    });

    it('should only populate links and not serialized embedded resource for a to one unpopulated embedded resource', function(done) {
      Serializer.register('articles', {
        embedded: {
          author: {
            type: 'authors',
            links: {
              href: function(data) {
                return '/peoples/' + data;
              }
            }
          },
        },
      });
      const links = {};
      const serializedEmbedded = Serializer.serializeEmbeddedResource('author', '1', Serializer.schemas.articles.default.embedded.author, Serializer.schemas.authors.default, links);
      expect(serializedEmbedded).to.be.undefined;
      expect(links).to.have.property('author').to.have.property('href').to.eql('/peoples/1');
      done();
    });

    it('should only populate links and not serialized embedded resource for a to many unpopulated embedded resource', function(done) {
      const links = {};
      const serializedEmbedded = Serializer.serializeEmbeddedResource('authors', ['1', '2'], Serializer.schemas.articles.default.embedded.author, Serializer.schemas.authors.default, links);
      expect(serializedEmbedded).to.be.undefined;
      expect(links).to.have.property('authors').to.be.instanceof(Array).to.have.lengthOf(2);
      expect(links.authors[0]).to.have.property('href').to.eql('/peoples/1');
      expect(links.authors[1]).to.have.property('href').to.eql('/peoples/2');
      done();
    });
  });

  describe('serializeEmbedded', function() {
    const Serializer = new HALSerializer();
    Serializer.register('authors');
    Serializer.register('comments');
    Serializer.register('articles', {
      embedded: {
        author: {
          type: 'authors',
        },
        comments: {
          type: 'comments',
        },
      },
    });

    it('should return undefined embedded for no embedded options', function(done) {
      const links = {};
      const serializedEmbedded = Serializer.serializeEmbedded({
        id: '1',
        name: 'Author 1',
      }, Serializer.schemas.authors.default, links);
      expect(serializedEmbedded).to.be.undefined;
      done();
    });

    it('should return embedded for author and comments', function(done) {
      const links = {};
      const serializedEmbedded = Serializer.serializeEmbedded({
        id: '1',
        author: {
          id: '1'
        },
        comments: [{
          id: '1'
        }, {
          id: '2'
        }],
      }, Serializer.schemas.articles.default, links);
      expect(serializedEmbedded).to.have.property('author');
      expect(serializedEmbedded.author).to.have.property('id').to.eql('1');
      expect(serializedEmbedded.author).to.have.property('_links').to.be.undefined;
      expect(serializedEmbedded).to.have.property('comments');
      expect(serializedEmbedded.comments).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedEmbedded.comments[0]).to.have.property('id').to.eql('1');
      expect(serializedEmbedded.comments[0]).to.have.property('_links').to.be.undefined;
      done();
    });

    it('should return relationships with the convertCase options', function(done) {
      const Serializer = new HALSerializer();
      const links = {};
      Serializer.register('author');
      Serializer.register('articles', {
        convertCase: 'kebab-case',
        embedded: {
          articleAuthor: {
            type: 'author',
          }
        }
      });
      const included = [];
      const serializedEmbedded = Serializer.serializeEmbedded({
        id: '1',
        articleAuthor: {
          id: '1'
        },
      }, Serializer.schemas.articles.default, links);
      expect(serializedEmbedded).to.have.property('article-author');
      done();
    });
  });

  describe('serializeAttributes', function() {
    const Serializer = new HALSerializer();
    Serializer.register('articles');

    it('should return only whitelisted attributes', function(done) {
      const data = {
        id: '1',
        title: 'My First article',
        body: 'Content of my article',
      };
      Serializer.register('articles', {
        whitelist: ['body'],
      });
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.not.have.property('id');
      expect(serializedAttributes).to.not.have.property('title');
      expect(serializedAttributes).to.have.property('body');
      done();
    });

    it('should convert attributes to kebab-case format', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', {
        convertCase: 'kebab-case'
      });
      const data = {
        id: '1',
        firstName: 'firstName',
        lastName: 'lastName',
        articles: [{
          createdAt: '2016-06-04T06:09:24.864Z'
        }],
        address: {
          zipCode: 123456
        }
      };
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.have.property('first-name');
      expect(serializedAttributes).to.have.property('last-name');
      expect(serializedAttributes.articles[0]).to.have.property('created-at');
      expect(serializedAttributes.address).to.have.property('zip-code');
      done();
    });

    it('should convert attributes to snake_case format', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', {
        convertCase: 'snake_case'
      });
      const data = {
        id: '1',
        firstName: 'firstName',
        lastName: 'lastName',
        articles: [{
          createdAt: '2016-06-04T06:09:24.864Z'
        }],
        address: {
          zipCode: 123456
        }
      };
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.have.property('first_name');
      expect(serializedAttributes).to.have.property('last_name');
      expect(serializedAttributes.articles[0]).to.have.property('created_at');
      expect(serializedAttributes.address).to.have.property('zip_code');
      done();
    });

    it('should convert attributes to camelCase format', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', {
        convertCase: 'camelCase'
      });
      const data = {
        id: '1',
        'first-name': 'firstName',
        'last-name': 'lastName',
        articles: [{
          'created-at': '2016-06-04T06:09:24.864Z'
        }],
        address: {
          'zip-code': 123456
        }
      };
      const serializedAttributes = Serializer.serializeAttributes(data, Serializer.schemas.articles.default);
      expect(serializedAttributes).to.have.property('firstName');
      expect(serializedAttributes).to.have.property('lastName');
      expect(serializedAttributes.articles[0]).to.have.property('createdAt');
      expect(serializedAttributes.address).to.have.property('zipCode');
      done();
    });
  });

  describe('processOptionsValues', function() {

    const Serializer = new HALSerializer();
    it('should process options with string values', function(done) {
      const linksOptions = {
        self: '/articles',
      };
      const links = Serializer.processOptionsValues({}, linksOptions);
      expect(links).to.have.property('self').to.eql('/articles');
      done();
    });

    it('should process options with functions values', function(done) {
      const linksOptions = {
        self: function(data) {
          return '/articles/' + data.id;
        },
      };
      const links = Serializer.processOptionsValues({
        id: '1',
      }, linksOptions);
      expect(links).to.have.property('self').to.eql('/articles/1');
      done();
    });

    it('should process options function', function(done) {
      const optionsFn = function(data) {
        return {
          self: '/articles/' + data.id
        }
      };
      const links = Serializer.processOptionsValues({
        id: '1',
      }, optionsFn);
      expect(links).to.have.property('self').to.eql('/articles/1');
      done();
    });
  });

  describe('serialize', function() {
    const Serializer = new HALSerializer();
    Serializer.register('articles', {
      topLevelMeta: {
        count: function(options) {
          return options.count
        }
      }
    });

    it('should serialize with extra options as the third argument', function(done) {
      const serializedData = Serializer.serialize('articles', [], {
        count: 0
      });
      expect(serializedData).to.have.property('count').to.eql(0);
      done();
    });

    it('should serialize with a custom schema', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', 'only-title', {
        whitelist: ['id', 'title']
      });

      const data = {
        id: '1',
        title: 'Hal !',
        body: 'The shortest article. Ever.'
      };

      const serializedData = Serializer.serialize('articles', data, 'only-title');
      expect(serializedData).to.have.property('id', '1');
      expect(serializedData).to.have.property('title');
      expect(serializedData).to.not.have.property('body');
      done();
    });

    it('should throw an error if type as not been registered', function(done) {
      expect(function() {
        Serializer.serialize('authors', {});
      }).to.throw(Error, 'No type registered for authors');
      done();
    });

    it('should throw an error if custom schema as not been registered', function(done) {
      expect(function() {
        Serializer.serialize('articles', {}, 'custom');
      }).to.throw(Error, 'No schema custom registered for articles');
      done();
    });
  });


  describe('serializeAsync', function() {
    const Serializer = new HALSerializer();
    const dataArray = [{
      id: 1,
      title: 'Article 1',
    }, {
      id: 2,
      title: 'Article 2',
    }, {
      id: 3,
      title: 'Article 3',
    }]

    Serializer.register('articles', {
      topLevelMeta: {
        count: function(options) {
          return options.count
        }
      }
    });

    it('should return a Promise', () => {
      const promise = Serializer.serializeAsync('articles', {});
      expect(promise).to.be.instanceOf(Promise);
    });

    it('should serialize empty array data', () =>
      Serializer.serializeAsync('articles', [])
        .then((serializedData) => {
          expect(serializedData._embedded.articles).to.eql([]);
        })
    );

    it('should serialize a single object of data', () =>
      Serializer.serializeAsync('articles', dataArray[0])
        .then((serializedData) => {
          expect(serializedData).to.have.property('id').to.eql(1);
          expect(serializedData).to.have.property('title').to.eql('Article 1');
          expect(serializedData._embedded).to.be.undefined;
          expect(serializedData._links).to.be.undefined;
        })
    );

    it('should serialize an array of data', () =>
      Serializer.serializeAsync('articles', dataArray)
        .then((serializedData) => {
          expect(serializedData).to.have.property('_embedded').to.have.property('articles');
          expect(serializedData._embedded.articles).to.be.instanceof(Array).to.have.lengthOf(3);
        })
    );

    it('should serialize each array item on next tick', () => {
      const tickCounter = new TickCounter(5);
      return Serializer.serializeAsync('articles', dataArray)
        .then(() => {
          expect(tickCounter.ticks).to.eql(4);
        })
    });

    it('should serialize with extra options as the third argument', () => {
      return Serializer.serializeAsync('articles', [], { count: 0 })
        .then((serializedData) => {
          expect(serializedData).to.have.property('count').to.eql(0);
        });
    });

    it('should serialize with a custom schema', () => {
      const Serializer = new HALSerializer();
      Serializer.register('articles', 'only-title', {
        whitelist: ['id', 'title']
      });

      const data = {
        id: '1',
        title: 'Hal !',
        body: 'The shortest article. Ever.'
      };

      return Serializer.serializeAsync('articles', data, 'only-title')
        .then((serializedData) => {
          expect(serializedData).to.have.property('id', '1');
          expect(serializedData).to.have.property('title');
          expect(serializedData).to.not.have.property('body');
        });
    });

    it('should throw an error if type has not been registered', function(done) {
      expect(function() {
        Serializer.serializeAsync('authors', {});
      }).to.throw(Error, 'No type registered for authors');
      done();
    });

    it('should throw an error if custom schema has not been registered', function(done) {
      expect(function() {
        Serializer.serializeAsync('articles', {}, 'custom');
      }).to.throw(Error, 'No schema custom registered for articles');
      done();
    });
  });

  describe('deserialize', function() {
    it('should deserialize data with embedded relationships', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', {
        embedded: {
          author: {
            type: 'authors'
          },
          comments: {
            type: 'comments'
          }
        }
      });
      Serializer.register('authors', {});
      Serializer.register('comments', {});

      const data = {
        id: '1',
        title: 'Hal !',
        body: 'The shortest article. Ever.',
        created: '2015-05-22T14:56:29.000Z',
        _embedded: {
          author: {
            _links: {
              self: {
                href: '/peoples/1'
              }
            }
          },
          comments: [{
            _links: {
              self: {
                href: '/comments/1'
              }
            }
          }, {
            _links: {
              self: {
                href: '/comments/2'
              }
            }
          }]
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('id');
      expect(deserializedData).to.have.property('title');
      expect(deserializedData).to.have.property('body');
      expect(deserializedData).to.have.property('created');
      expect(deserializedData).to.have.property('author', '1');
      expect(deserializedData).to.have.property('comments').to.be.instanceof(Array).to.eql(['1', '2']);
      done();
    });

    it('should deserialize data with full embedded relationships', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', {
        embedded: {
          author: {
            type: 'authors'
          },
          comments: {
            type: 'comments'
          }
        }
      });
      Serializer.register('authors', {});
      Serializer.register('comments', {});

      const data = {
        id: '1',
        title: 'Hal !',
        body: 'The shortest article. Ever.',
        created: '2015-05-22T14:56:29.000Z',
        _embedded: {
          author: {
            _links: {
              self: {
                href: '/peoples/1'
              }
            },
            firstName: 'Kaley',
            lastName: 'Maggio',
            email: 'Kaley-Maggio@example.com',
            age: '80',
            gender: 'male'
          },
          comments: [{
            _links: {
              self: {
                href: '/comments/1'
              }
            },
            body: 'First !'
          }, {
            _links: {
              self: {
                href: '/comments/2'
              }
            },
            body: 'I Like !'
          }]
        }
      }

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.property('id');
      expect(deserializedData).to.have.property('title');
      expect(deserializedData).to.have.property('body');
      expect(deserializedData).to.have.property('created');
      expect(deserializedData).to.have.property('author').to.deep.equal({
        firstName: 'Kaley',
        lastName: 'Maggio',
        email: 'Kaley-Maggio@example.com',
        age: '80',
        gender: 'male'
      });
      expect(deserializedData).to.have.property('comments').to.be.instanceof(Array);
      expect(deserializedData.comments[0]).to.deep.equal({
        body: 'First !'
      });
      expect(deserializedData.comments[1]).to.deep.equal({
        body: 'I Like !'
      });
      done();
    });

    it('should deserialize an array of data', function(done) {
      const Serializer = new HALSerializer();
      Serializer.register('articles', {});

      const data = {
        _embedded: {
          articles: [{
            id: '1',
            title: 'Hal !',
            body: 'The shortest article. Ever.',
            created: '2015-05-22T14:56:29.000Z'
          }, {
            id: '2',
            title: 'Hal again !',
            body: 'The second shortest article. Ever.',
            created: '2015-06-22T14:56:29.000Z'
          }]
        }
      };

      const deserializedData = Serializer.deserialize('articles', data);
      expect(deserializedData).to.have.length(2);
      done();
    });

    it('should throw an error if type has not been registered', function(done) {
      expect(function() {
        const Serializer = new HALSerializer();
        Serializer.deserialize('authors', {});
      }).to.throw(Error, 'No type registered for authors');
      done();
    });

    it('should throw an error if custom schema has not been registered', function(done) {
      expect(function() {
        const Serializer = new HALSerializer();
        Serializer.register('articles', {});
        Serializer.deserialize('articles', {}, 'custom');
      }).to.throw(Error, 'No schema custom registered for articles');
      done();
    });
  });
});
