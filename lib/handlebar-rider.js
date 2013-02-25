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
  ;

(function(){

  //options and helper functions scoped globally in simple namespaced object
  var rider = {
  
    in: './app/handlebars/', 
    out: './public/javascript/templates.js',
    templates: [],
    ext : ["hb","hbs","handlebars","template","templates","tpl","item","part","prt","pt"],
    minify: true
    
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
        scli.log("Watcher detected change: created");
        fileHasChanged();
      });
      monitor.on("changed", function (f, curr, prev) {
        // Handle new files
        scli.log("Watcher detected change: changed");
        fileHasChanged();
      });
      monitor.on("removed", function (f, stat) {
        // Handle removed files
        scli.log("Watcher detected change: removed");
        fileHasChanged();
      });
    });
  };
    
  
  //watches a file for changes
  var fileHasChanged = function(event, filename){
      
      scli.log("Change detected to file '" + filename + "'");
      compileTemplates();
  
  };
  
  
  // watches a directory for changes  
  var directoryHasChanged = function(event, filename){
     
      scli.log('New or removed file "' + filename + '" detected, recompiling');
      readAndCompile(rider.in, rider.watch);
        
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
        
        output = ['(function() {'];
        output.push('\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};\n');
        
        // todo - figure out cleaner way to register partials as actual partials
        output.push('\n  Handlebars.partials = Handlebars.templates;\n');
        for(var t = 0; t < rider.templates.length; t++){
            processedFiles.push(rider.templates[t].namespace);
            data = fs.readFileSync(rider.templates[t].file, 'utf8');
            
            // clean the data a bit
            data = data.replace(/<!--(.*?)-->/gm, "")
                       .replace(/(\r\n|\n|\r)/gm,"");
            
            // check for partial conventions
            if (rider.templates[t].namespace.indexOf('/_') > 0){
            
              compiled = 'templates[\'' + rider.templates[t].namespace.replace(/\/_/,'_') + '\'] = template(' + precompile(data) + ');\n'

            } else if( rider.templates[t].namespace.indexOf('partial') != 0 ) {
              
              compiled = 'templates[\'' + rider.templates[t].namespace + '\'] = template(' + precompile(data) + ');\n'
              
            } else {
              
              compiled = 'templates[\'' + rider.templates[t].namespace.replace(/partials\//,'') + '\'] = template(' + precompile(data) + ');\n'
              
            }
            output.push(compiled);
        
        }
    
      } catch(e) {
        var filename = processedFiles.pop();
        errors = true;
        scli.error('Compile Failure while processing "' + filename + '". Exiting without writing to output file.');
      }

      if(errors) {
        return false;
      }
  
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
      try {
        
        fs.writeFileSync(rider.out, output, 'utf8');
        scli.ok('Compiled ' + processedFiles.length + ' templates in "' + rider.in + '" to "' + rider.out + '"');
        
      } catch(e){
          scli.error('ERROR! destination file or directory does not exist.', e);
      }

 };

  
 var readAndCompile = function(dir, watch){
   
    rider.templates = []
    
    // unwatch all the files
    unwatchAll();
    
    //read files in the directory
    readTemplatesDirectory(dir, function(err, files) {
      // sort filenames to preserve ordering in generated files (so that re-running the script does not produce different md5 sigature)
      files = files || "";
      if(__.size(files) <= 0 ) {
        scli.error('There are no files for Handlebar-Rider to compile. Did you run the command correctly?');
        return false;
      }

      files.sort();
    
     try {
       
       if(err)
         throw new Error('directory does not exist: ' + dir)
      
       for(var f = 0; f < files.length; f++){
          
          // determine whether or not it's a file or directory. 
          info = files[f].split(':')
          
          if( info[0] == 'file' && (info[1].indexOf('.hb') > 0 || info[1].indexOf('.handlebars') > 0) ){
            
            // get the template namespace by using the extra directory
            template_dir = rider.in.toString();
            file_and_dir = info[1].substr( (info[1].indexOf(template_dir) + template_dir.length) + 1, info[1].length);
            namespaced = file_and_dir.replace(/\.hb/,'');
            
            // push object for the compiler to work with
            rider.templates.push({
              namespace: namespaced,
              file: info[1]
            })
            
            
          }
        
        }
        
        compileTemplates();
        
      } catch (e){
        
        scli.error('ERROR! check to be sure your directories exist. ', e );
        scli.log('input directory: ' + dir);
        scli.log('destination file: ' + rider.out);
        if(rider.help)
          scli.log(rider.help)
        
      }
        
    });
   
  }  

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
    .default('e','["hb","hbs","handlebars","template","templates","tpl","item","part","prt","pt"]')
    .alias('f','force')
    .describe('f','Forces all files found in the input directory to be compiled. Performance gains are not unheard of here.')
    .default('f', false)
  .argv
  
  dir = argv.in;
  rider.in = dir;
  rider.minify = !argv.readable;
  rider.out = argv.out;
  rider.watch = argv.watch;
  rider.help = optimist.help()
  
  if(rider.watch) {
    scli.warn('Watching template directory "' + dir + '"');
    setupWatchMonitor(dir);
  }
  readAndCompile(dir, rider.watch);
  
}

// export functions for module use
exports.configure = function(config){ __.extend(rider,config) }
exports.watch = function(){
  
  scli.warn('Watching template directory "' + rider.in + '"');
  rider.watch = true;
  readAndCompile(rider.in, true);
  
}

exports.compile = function(){
  rider.watch = false;
  readAndCompile(rider.in, false);
  
}

 
})()