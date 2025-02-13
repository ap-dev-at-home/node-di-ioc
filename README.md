# node-di-ioc

A draft on how to implement asp.net core like dependency injection and inversion of control in node.js

```javascript
// setup.js
const { di } = require('./lib/di-ioc/di-ioc');

const IOC_NAMESPACE_PROD = 'PROD';
const IOC_NAMESPACE_TEST = 'TEST';

module.exports.IOC_NAMESPACE_PROD = IOC_NAMESPACE_PROD;
module.exports.IOC_NAMESPACE_TEST = IOC_NAMESPACE_TEST;

// Register dependencies
// every call to di with different namespaces can setup dependencies for different environments/modules
di(IOC_NAMESPACE_PROD,
    {
        name: '_configService',
        func: () => { 
            return { 
                user: 'User', 
                pw: 'secretpassword' 
            } 
        },
        singleton: true // instance will be created once
    },
    {
        name: '_dateTimeService',
        func: () => { 
            return { 
                now: () => new Date() 
            } 
        }
    },
    {
        name: '_dbService',
        func: (_configService) => { 
            return { 
                user: _configService.user, 
                pw: _configService.pw, 
                connect: () => true 
            } 
        }
    }
);
```

```javascript 
// app.js
const express = require('express');
const console = require('console');
const { ioc } = require('./lib/di-ioc/di-ioc');
const { IOC_NAMESPACE_PROD, IOC_NAMESPACE_TEST } = require('./setup')

// node.js/expressjs test application
const app = express();
const port = 3000;

// Inversion of Control
// handover control to the node-di-ioc library
// by intercepting get calls to express.js
ioc(IOC_NAMESPACE_PROD, app, 'get'); // alter namespace to provide different dependencies

// request handlers will receive the dependencies as parameters
app.get('/time', (req, res, _dateTimeService) => {
    res.send(`Hello World! It is ${_dateTimeService.now()}`);
});

app.get('/weather', (req, res, _dbService) => {
    if (_dbService.connect() == true) {
        // do something, get weather...
        res.send('Weather is sunny');
    }
    else {
        res.send('Weather is unknown');
    }
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
```

### API Calls (most relevant)

| Call    | Description |
| ------- | --------    |
| di(namespace, ...dependencies) | `namespace` - the namespace to add dependencies into <br><br> `dependencies` - depedency descriptors <br><br> `{dependency}` - object <br> - name: 'identifier' <br> - func: (...) => ... ` return instance, func can pass already setup depedencies`  <br> - singleton: true/false |
|ioc(namespace, obj, funcName)| `namespace` - the namespace to pull the dependencies from <br><br> `obj` - an object owning the function to take control over <br><br> `funcName` - the name of the function to take control over |
