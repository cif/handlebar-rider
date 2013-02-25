// handlebar rider
var optimist = require('optimist')
  , handlebars = require('handlebars')
  , uglify = require('uglify-js')
  , fs = require('fs')
  , scli = require('supercli')
  , __ = require('underscore')
  , watch = require('watch')
  , async = require('async')
  , path = require('path')
  , awesome = require('events').EventEmitter
  ;

(function(){

  //options and helper functions scoped globally in simple namespaced object
  var rider = {
  
    in : './app/handlebars/', 
    out : './public/javascript/templates.js',
    templates: [],
    ext : ['.hb','.hbs','.handlebars'],
    minify : true,
    force : false,
    strip : false
  };

  scli.config.appName("Handlebar-Rider");
  
  // recursively reads in directory and namespaces template and partial objects  
  var readTemplatesDirectory = function(dir, done) {
    
    // stores results    
    var results = []
    
    try {
      // read the directory    
      fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var pending = list.length;
        if (!pending) return done(null, results);
        // walk it
        list.forEach( function(file) {
          file = dir + '/' + file;
          // determine if file or directory
          fs.stat(file, function(err, stat) {
            if (stat && stat.isDirectory()) {
                // push as directory
                results.push('directory:' + file);          
                readTemplatesDirectory(file, function(err, res) {
                results = results.concat(res);
                if (!--pending) done(null, results);
              });
            } else {
              // push as file
              results.push('file:' + file);    
              if (!--pending) done(null, results);
            }
          });
        });
      });
    } catch(err) {
      scli.error(err);
    } 
  };

  var setupWatchMonitor = function(dir) {
    watch.createMonitor(dir, function (monitor) {
      monitor.on("created", function (f, stat) {
        // Handle file changes
        scli.log("New file detected: '" + f + "'");
        rider.templates = [];
        readAndCompile();
      });
      monitor.on("changed", function (f, curr, prev) {
        // Handle new files
        scli.log("File change detected: '" + f + "'");
        rider.templates = [];
        readAndCompile();
      });
      monitor.on("removed", function (f, stat) {
        // Handle removed files
        scli.log("File removed: '" + f + "'");
        rider.templates = [];
        readAndCompile();
      });
    });
  };

  var precompile = function(data) {
    data = data || "";
    if(data == "")
      return "";
    else
      return handlebars.precompile( data, {});
  };
      
  //compiles to output destination
  var compileTemplates = function(){
    var processedFiles = [];
    var errors = false;
    try {  
      output = ["(function() {"];
      output.push("\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};\n");
      
      // todo - figure out cleaner way to register partials as actual partials
      output.push('\n  Handlebars.partials = Handlebars.templates;\n');
      async.each(rider.templates, function(template, nextTemplate) {
        fs.readFile(template.file, 'utf8', function(err, data) {
          var compiled;
          processedFiles.push(template.namespace);
          // We only run the painfully long regex if the user REALLY wants us to AND it's not being minified. Minifying strips this for us :)
          if(rider.strip && !rider.minify)
            data = data.replace(/<!--(.*?)-->/gm, "").replace(/(\r\n|\n|\r)/gm,"");
          
          // check for partial conventions
          if (template.namespace.indexOf('/_') > 0){
            compiled = 'templates[\'' + template.namespace.replace(/\/_/,'_') + '\'] = template(' + precompile(data) + ');\n';
          } else if( template.namespace.indexOf('partial') != 0 ) {
            compiled = 'templates[\'' + template.namespace + '\'] = template(' + precompile(data) + ');\n';
          } else {
            compiled = 'templates[\'' + template.namespace.replace(/partials\//,'') + '\'] = template(' + precompile(data) + ');\n';
          }
          output.push(compiled);
          nextTemplate();
        });
      }, function(err) {
        if(err)
          throw error(err);

        //complete output array to single string
        output.push('})();');
        output = output.join('');

        if(rider.minify){
          var ast = uglify.parser.parse(output);
          ast = uglify.uglify.ast_mangle(ast);
          ast = uglify.uglify.ast_squeeze(ast);
          output = uglify.uglify.gen_code(ast);    
        }

        //write the output file
        fs.exists(rider.out, function(exists) {
          if(exists) {
            fs.writeFileSync(rider.out, output, 'utf8');
            scli.ok('Compiled ' + processedFiles.length + ' templates in "' + rider.in + '" to "' + rider.out + '".');
          } else {
            scli.error('The output file "' + rider.out + '" does not exist. Double check it!');
          }
        });
      });

    } catch(e) {
      var filename = processedFiles.pop();
      scli.error('Compile Failure while processing "' + filename + '". Exiting without writing to output file.');
      return false;
    }
  };

    
  var readAndCompile = function(dir){
    dir = dir || rider.in;
    scli.log("Compiling all templates in directory tree '" + rider.in + "' into '" + rider.out + "'");
    fs.exists(dir, function(exists) {
      try {
        if(!exists) {
          throw error("The input directory '" + dir + "' does not exist! Maybe give that a second look.");
        }
        readTemplatesDirectory(dir, function(err, files) {
          // sort filenames to preserve ordering in generated files (so that re-running the script does not produce different md5 sigature)
          if(__.size(files) <= 0 ) {
            throw error('There are no files for Handlebar-Rider to compile. Did you run the command correctly?');
          } else {
            async.each(files.sort(), function(file, nextFile) {
              var parts = file.split(':');
              var type = parts[0];
              var filepath = parts[1];

              if(type == 'file') {
                var ext = path.extname(filepath);
                if(needsCompile(ext)) {
                  var relpath = path.relative(rider.in, filepath);
                  var newTemplate = {
                    namespace : relpath.replace(ext,''),
                    file : filepath,
                  };
                  rider.templates.push(newTemplate); 
                }
              }
              nextFile();
            }, function(err) {
              if(err)
                throw error(err);
              else
                compileTemplates();
            });
          }
        });
      } catch(err) {
        scli.error(err);
        if(rider.help)
          scli.log(rider.help)
      };
    });
  }; 

  var needsCompile = function(ext) {
    if( rider.force || __.contains(rider.ext, ext))
      return true;
    else
      return false;
  };

// runs the command line   
exports.run = function(){ 
  //get options specified on command line
  argv = optimist
    .usage('Compile a directory of handlebars templates into a single javascript file.\nCommand Line Usage: ')
    
    .alias('i','in')
    .describe('i','Specify an input templates directory')
    .default('i', rider.in)
    .alias('o','out')
    .describe('o','Specify an output file into which templates are compiled')
    .default('o', rider.out)
    .alias('w','watch')
    .describe('w','Watch your handlebars files and compile when changes occur')
    .default('w', false)
    .alias('r','readable')
    .describe('r','Make the output more readable by avoiding default minification')
    .default('r', false)
    .alias('e','extensions')
    .describe('e','Add more extensions to the defaults for templates that Handlebar-Rider will compile')
    .default('e',".hb, .hbs, .handlebars")
    .alias('f','force')
    .describe('f','Forces all files found in the input directory to be compiled. Performance gains are not unheard of here.')
    .default('f', false)
    .alias('s','strip')
    .describe('s','Strip all comments from templates to clean up un-minified output')
    .default('s', false)
  .argv
  
  dir = argv.in;
  rider.in = dir;
  rider.minify = !argv.readable;
  rider.out = argv.out;
  rider.watch = argv.watch;
  rider.force = argv.force;
  rider.strip = argv.strip;
  rider.help = optimist.help();
  //rider.ext = [];
  
  if(rider.watch) {
    scli.warn('Watching template directory "' + dir + '"');
    setupWatchMonitor(dir);
  }

  if(rider.force)
    scli.warn("ALL files under the input folder, '" + rider.in + "', will be compiled, regardless of extension!");

  if( argv.extensions ) {
    __.each(argv.extensions, function(ext) {
      rider.ext.push("." + ext);
    });
    scli.warn("All files of the following types will be compiled: " + rider.ext.join(", "));
  }

  readAndCompile(dir);
  
}

// export functions for module use
exports.configure = function(config){ __.extend(rider,config) }
exports.watch = function(){
  
  scli.warn('Watching template directory "' + rider.in + '"');
  rider.watch = true;
  setupWatchMonitor(rider.in);
  readAndCompile(rider.in, true);
}

exports.compile = function(){
  rider.watch = false;
  readAndCompile(rider.in, false);
}
})()