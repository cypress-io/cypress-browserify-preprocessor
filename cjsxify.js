// wrapper for cjsxify to prevent coffee script from rewriting Error.prepareStackTrace

// hold onto the original
const prepareStackTrace = Error.prepareStackTrace

const cjsxify = require('cjsxify')

// restore
Error.prepareStackTrace = prepareStackTrace

module.exports = cjsxify
