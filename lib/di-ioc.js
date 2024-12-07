const { extractParameterNames } = require('./tokenizer.js');

const namespaces = {};

/*
* Register dependencies into a namespace
*
* @param {string} namespace - The namespace to register the dependencies into
* @param {array} dependencies - The dependencies to register
* @param {string} dependency.name - The name of the dependency
* @param {function} dependency.func - The function to call to create the dependency
* @param {boolean} dependency.singleton - If the dependency should be a singleton
*/
module.exports.di = function(namespace, ...dependencies) {
    const container = namespaces[namespace] || {};

    dependencies.forEach(dependency => {
        if (container[dependency.name] !== undefined) {
            throw new Error(`Dependency already registered for ${dependency.name}`);
        }

        container[dependency.name] = { 
            func: createDetourFunction(container, dependency.func),
            singleton: dependency.singleton, 
            instance: null 
        };
    });

    namespaces[namespace] = container;
};

/*
* Invert control on a function's dependencies
*
* @param {string} namespace - The namespace to inject dependencies from
* @param {object} obj - The object owning the function to inject the dependencies into
* @param {string} funcName - The name of the function to inject the dependencies into
* @throws {Error} Namespace not found
* @throws {Error} Not a function
*/
module.exports.ioc = function(namespace, obj, funcName) {
    const container = namespaces[namespace];
    if (container === undefined) {
        throw new Error(`Namespace ${namespace} not found`);
    }

    const funcOriginal = obj[funcName];
    if (typeof funcOriginal !== 'function') {
        throw new Error(`${funcName} is not a function`);
    }

    const funcTakover = function () {
        const args = [];
        Array.prototype.forEach.call(arguments, (arg, index) => {
            var isFunction = (typeof arg === 'function');
            args[index] = (isFunction == true) ? createDetourFunction(container, arg) : arg;
        });

        return funcOriginal.call(obj, ...args);
    };

    obj[funcName] = funcTakover;
};

const createDetourFunction = function(container, func) {
    const funcDetails = extractParameterNames(func);
    
    if (funcDetails.result.length === 0) {
        return func;
    }

    const funcDetour = function () {
        const args = [];
        funcDetails.result.forEach((parameterName, index) => {
            args[index] = resolve(container, parameterName) ?? arguments[index];
        });

        return func.call(null, ...args);
    };

    return funcDetour;
};

const resolve = function(container, dependencyName) {
    const dependency = container[dependencyName];
    if (dependency === undefined) {
        return null;
    }

    if (dependency.singleton === true) {
        if (dependency.instance === null) {
            dependency.instance = dependency.func();
        }

        return dependency.instance;
    }

    return dependency.func();
}
