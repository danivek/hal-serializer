# hal-serializer
[![Build Status](https://travis-ci.org/danivek/hal-serializer.svg?branch=master)](https://travis-ci.org/danivek/hal-serializer)
[![Coverage Status](https://coveralls.io/repos/github/danivek/hal-serializer/badge.svg?branch=master)](https://coveralls.io/github/danivek/hal-serializer?branch=master)


A Node.js framework agnostic library for serializing your data to [HAL](http://stateless.co/hal_specification.html) compliant responses (a specification for building APIs in JSON).

## Installation
```bash
npm install --save hal-serializer
```

## Documentation

#### Register

```javascript
var HALSerializer = require('hal-serializer');
var Serializer = new HALSerializer();
Serializer.register(type, options);
```
**Available options :**

- **blacklist** (optional): An array of blacklisted attributes. Default = [].
- **whitelist** (optional): An array of whitelisted attributes. Default = [].
- **links** (optional): An *object* or a *function* that describes the links inside data. (If it is an object values can be string or function).
- **topLevelMeta** (optional): An *object* or a *function* that describes the links inside data. (If it is an object values can be string or function).
- **topLevelLinks** (optional): An *object* or a *function* that describes the links inside data. (If it is an object values can be string or function).
- **embedded** (optional): An object defining some embedded resources
    - *embedded*: The property in data to use as an embedded resource
        - **type**: The type to use for serializing the embedded resource (type need to be register)
        - **schema** (optional): A custom schema for serializing the embedded resource. If no schema define, it use the default one.
        - **links** (optional): An *object* or a *function* that describes the links for the relationship. (If it is an object values can be string or function).

## Usage

input data (can be a simple object or an array of objects)
```javascript
// Data
var data = {
  id: "1",
  title: "HAL Hypertext Application Language",
  body: "The shortest article. Ever.",
  created: "2015-05-22T14:56:29.000Z",
  updated: "2015-05-22T14:56:28.000Z",
  author: {
    id: "1",
    firstName: "Kaley",
    lastName: "Maggio",
    email: "Kaley-Maggio@example.com",
    age: "80",
    gender: "male"
  },
  tags: ["1", "2"],
  photos: ["ed70cf44-9a34-4878-84e6-0c0e4a450cfe", "24ba3666-a593-498c-9f5d-55a4ee08c72e", "f386492d-df61-4573-b4e3-54f6f5d08acf"],
  comments: [{
    _id: "1",
    body: "First !",
    created: "2015-08-14T18:42:16.475Z"
  }, {
    _id: "2",
    body: "I Like !",
    created: "2015-09-14T18:42:12.475Z"
  }, {
    _id: "3",
    body: "Awesome",
    created: "2015-09-15T18:42:12.475Z"
  }]
}
```

Register your resources types :
```javascript
var HALSerializer = require('hal-serializer');
var Serializer = new HALSerializer();

// Register 'article' type
Serializer.register('article', {
  blacklist: ['updated'], // An array of blacklisted attributes. Default = []
  links: function(data) { // An object or a function that describes links.
    return {
      self: {
        href: '/articles/' + data.id
      }
    }
  },
  embedded: { // An object defining some embedded resources.
    author: {
      type: 'people', // The type of the embedded resource
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
      schema: 'only-body' // A custom schema
    }
  },
  topLevelMeta: function(extraOptions) { // An object or a function that describes top level meta.
    return {
      count: extraOptions.count
    }
  },
  topLevelLinks: { // An object or a function that describes top level links.
    self: {
      href: '/articles'
    }
  }
});

// Register 'people' type
Serializer.register('people', {
  links: {
    self: function(data) {
      return {
        href: '/peoples/' + data.id
      };
    }
  }
});

// Register 'tag' type
Serializer.register('tag', {});

// Register 'photo' type
Serializer.register('photo', {});

// Register 'comment' type with a custom schema
Serializer.register('comment', 'only-body', {
  whitelist: ['body'],
});
```

Serialize it with the corresponding resource type, data and optional extra options :

```javascript
Serializer.serialize('article', data, {count: 2});
```

The output data will be :
```JSON
{
  "_links": {
    "self": {
      "href": "/articles/1"
    },
    "author": {
      "href": "/peoples/1"
    }
  },
  "count": 2,
  "id": "1",
  "title": "HAL Hypertext Application Language",
  "body": "The shortest article. Ever.",
  "created": "2015-05-22T14:56:29.000Z",
  "_embedded": {
    "author": {
      "_links": {
        "self": {
          "href": "/peoples/1"
        }
      },
      "id": "1",
      "firstName": "Kaley",
      "lastName": "Maggio",
      "email": "Kaley-Maggio@example.com",
      "age": "80",
      "gender": "male"
    },
    "comments": [
      {
        "body": "First !"
      },
      {
        "body": "I Like !"
      },
      {
        "body": "Awesome"
      }
    ]
  }
}
```

## Custom schemas

It is possible to define multiple custom schemas for a resource type :

```javascript
Serializer.register(type, 'customSchema', options);
```

If you want to apply this schema on the primary data :

```javascript
Serializer.serialize('article', data, 'customSchema', {count: 2});
```

Or if you want to apply this schema on a embedded resource, define this schema on embedded resource options with the key `schema` :

Example :
```javascript
embedded: {
  comments: {
  type: 'comment'
  schema: 'customSchema'
  }
}
```

## Requirements

hal-serializer use ECMAScript 2015 (ES6) features supported natively by Node.js 4 and above ([ECMAScript 2015 (ES6) | Node.js](https://nodejs.org/en/docs/es6/)). Make sure that you have Node.js 4+ or above.

## License

[MIT](https://github.com/danivek/hal-serializer/blob/master/LICENSE)
