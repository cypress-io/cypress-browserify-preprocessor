# Cypress Browserify Preprocessor

Cypress preprocessor for bundling JavaScript via browserify

## Installation

Requires [Node](https://nodejs.org/en/) version 6 or above.

```sh
npm install --save-dev @cypress/browserify-preprocessor
```

## Usage

In your project's [plugins file](https://on.cypress.io/guides/plugins):

```javascript
const browserify = require('@cypress/browserify-preprocessor')

module.exports = (register, config) => {
  register('on:spec:file:preprocessor', browserify(config))
}
```

## Options

Pass in options as the second argument to `browserify`:

```javascript
module.exports = (register, config) => {
  const options = {
    extensions: [],
    watchOptions: {},
    transforms: [],
    onBundle () {},
  }

  register('on:spec:file:preprocessor', browserify(config, options))
}
```

### extensions

Array of file extensions to supported.

**Default**:

```javascript
['.js', '.jsx', '.coffee', '.cjsx']
```

### watchOptions

Object of options passed to [watchify](https://github.com/browserify/watchify#options)

**Default**:

```javascript
{
  ignoreWatch: [
    '**/.git/**',
    '**/.nyc_output/**',
    '**/.sass-cache/**',
    '**/bower_components/**',
    '**/coverage/**',
    '**/node_modules/**',
  ],
}
```

### transforms

Array of transforms. Each item is an object with a `transform` set to the path to a transform package or the required module itself and `options` set to the options for that transform.

**Default**:

```javascript
[
  {
    transform: 'cjsxify',
    options: {},
  },
  {
    transform: 'babelify',
    options: {
      ast: false,
      babelrc: false,
      plugins: ['babel-plugin-add-module-exports'],
      presets: ['babel-preset-env', 'babel-preset-react'],
    },
  },
]
```

### onBundle

A function that is called with the [browserify bundle](https://github.com/browserify/browserify#browserifyfiles--opts). This allows you to specify external files and plugins. See the [browserify docs](https://github.com/browserify/browserify#baddfile-opts) for methods available.

```javascript
browserify({
  onBundle (bundle) {
    bundle.external('react')
    bundle.plugin('some-plugin')
  }
})
```

**Default**: `undefined`

## Modifying default options

The default options are provided as `browserify.defaultOptions` so they can be more easily modified.

If, for example, you want to update the options for the `babelify` transform to turn on `babelrc`, you could do the following:

```javascript
const browserify = require('@cypress/browserify-preprocessor')

module.exports = (register, config) => {
  const options = browserify.defaultOptions
  options.transforms[1].options.babelrc = true

  register('on:spec:file:preprocessor', browserify(config, options))
}
```

## License

This project is licensed under the terms of the [MIT license](/LICENSE.md).
