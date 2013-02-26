// handlebar rider
var optimist = require('optimist')
  , handlebars = require('handlebars')
  , uglify = require('uglify-js')
  , fs = require('fs')
  , scli = require('supercli')
  , __ = require('underscore')
  , watch = require('watch')
  , async = require('async')
  ;

// Not sure exactly what we're going to test for, but we're going to dammit.