# Cypress Browserify Preprocessor

Cypress preprocessor for bundling JavaScript via browserify

## Installation

Requires [Node](https://nodejs.org/en/) version 6.5.0 or above.

```sh
npm install --save-dev @cypress/browserify-preprocessor
```

## Usage

In your project's [plugins file](https://on.cypress.io/guides/plugins):

```javascript
const browserify = require('@cypress/browserify-preprocessor')

module.exports = (on) => {
  on('file:preprocessor', browserify())
}
```

## Options

Pass in options as the second argument to `browserify`:

```javascript
module.exports = (on) => {
  const options = {
    // options here
  }

  on('file:preprocessor', browserify(options))
}
```

### browserifyOptions

Object of options passed to [browserify](https://github.com/browserify/browserify#browserifyfiles--opts). 

If you pass one of these top-level options in, it will override the default. So if pass `extensions: ['.cljs']`, the default extensions (`js, jsx, coffee, cjsx`) will no longer be supported. If you wish to add to the supported extensions, read up on [modifying the default options](#modifying-default-options).

As long as the config passed from Cypress indicates that the plugin should watch files, [watchify](https://github.com/browserify/watchify) is automatically configured as a plugin, so there's no need to manually specify it.

**Default**:

```javascript
{
  extensions: ['.js', '.jsx', '.coffee', '.cjsx'],
  transform: [
    [
      'cjsxify',
      {},
    ],
    [
      'babelify',
      {
        ast: false,
        babelrc: false,
        plugins: ['babel-plugin-add-module-exports'],
        presets: ['babel-preset-env', 'babel-preset-react'],
      },
    ],
  ],
  plugin: [],
  cache: {},
  packageCache: {},
}
```

### watchifyOptions

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

If, for example, you want to update the options for the `babelify` transform to turn on `babelrc` loading, you could do the following:

```javascript
const browserify = require('@cypress/browserify-preprocessor')

module.exports = (on) => {
  const options = browserify.defaultOptions
  options.transforms[1].options.babelrc = true

  on('file:preprocessor', browserify(options))
}
```

## Contributing

Run all tests once:

```shell
npm test
```

Run tests in watch mode:

```shell
npm run test-watch
```

## License

This project is licensed under the terms of the [MIT license](/LICENSE.md).
