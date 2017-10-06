'use strict';
/* eslint-disable */

const expect = require('chai').expect;
const _ = require('lodash');
const HALSerializer = require('../../');
const articlesData = require('../fixture/articles.data');

describe('Examples', function() {
  var Serializer = new HALSerializer();
  Serializer.register('article', {
    blacklist: ['updated'],
    links: function(data) {
      return {
        self: {
          href: '/articles/' + data.id
        }
      }
    },
    embedded: {
      author: {
        type: 'people',
        links: function(data) {
          return {
            href: '/peoples/' + data.id
          }
        }
      },
      tags: {
        type: 'tag'
      },
      photos: {
        type: 'photo'
      },
      comments: {
        type: 'comment',
        schema: 'only-body'
      }
    },
    topLevelMeta: function(extraOptions) {
      return {
        count: extraOptions.count
      }
    },
    topLevelLinks: {
      self: {
        href: '/articles'
      }
    }
  });
  Serializer.register('people', {
    links: function(data) {
      return {
        self: {
          href: '/peoples/' + data.id
        }
      }
    }
  });
  Serializer.register('tag', {});
  Serializer.register('photo', {});
  Serializer.register('comment', 'only-body', {
    whitelist: ['body'],
  });

  it('should serialize articles data', function(done) {
    Serializer
      .serializeAsync('article', articlesData, {
      count: 2
      })
      .then((serializedData) => {
      expect(serializedData).to.have.property('count').to.eql(2);
      expect(serializedData).to.have.property('_links').to.have.property('self').to.have.property('href').to.eql('/articles');
      expect(serializedData).to.have.property('_embedded');
      expect(serializedData._embedded).to.have.property('article');
      expect(serializedData._embedded.article).to.be.instanceof(Array).to.have.lengthOf(2);
      expect(serializedData._embedded.article[0]).to.have.property('_links');
      expect(serializedData._embedded.article[0]._links).to.have.property('self').to.have.property('href').to.eql('/articles/1');
      expect(serializedData._embedded.article[0]._links).to.have.property('author').to.have.property('href').to.eql('/peoples/1');
      expect(serializedData._embedded.article[0]).to.have.property('id');
      expect(serializedData._embedded.article[0]).to.have.property('title');
      expect(serializedData._embedded.article[0]).to.have.property('body');
      expect(serializedData._embedded.article[0]).to.have.property('created');
      expect(serializedData._embedded.article[0]).to.not.have.property('updated');
      expect(serializedData._embedded.article[0]).to.have.property('_embedded');
      expect(serializedData._embedded.article[0]._embedded).to.have.property('author');
      expect(serializedData._embedded.article[0]._embedded.author).to.have.property('_links').to.have.property('self').to.have.property('href').to.eql('/peoples/1');
      expect(serializedData._embedded.article[0]._embedded.author).to.have.property('id');
      expect(serializedData._embedded.article[0]._embedded.author).to.have.property('firstName');
      expect(serializedData._embedded.article[0]._embedded.author).to.have.property('lastName');
      expect(serializedData._embedded.article[0]._embedded.author).to.have.property('email');
      expect(serializedData._embedded.article[0]._embedded.author).to.have.property('age');
      expect(serializedData._embedded.article[0]._embedded.author).to.have.property('gender');
      expect(serializedData._embedded.article[0]._embedded).to.have.property('comments');
      expect(serializedData._embedded.article[0]._embedded.comments).to.be.instanceof(Array).to.have.lengthOf(3);
      expect(serializedData._embedded.article[0]._embedded.comments[0]).to.have.property('body');
      expect(serializedData._embedded.article[0]._embedded.comments[0]).to.not.have.property('created');
      done();
    });
  });

  it('should serialize articles data (async)', () => {
    var expected = Serializer.serialize('article', articlesData, {
      count: 2
    });
    return Serializer.serializeAsync('article', articlesData, { count: 2 })
      .then((actual) => {
        expect(actual).to.deep.equal(expected);
      })
  });
});
