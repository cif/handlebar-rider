
// handlebar rider
optimist = require('optimist')
handlebars = require('handlebars');
uglify = require('uglify-js');
fs = require('fs');


(function(){
  
  //colored output
  var color = {
    red : '\u001b[31m',
    blue: '\u001b[36m',
    green: '\u001b[32m',
    yellow: '\u001b[33m',
    reset: '\u001b[0m'
  }

  //options and helper functions scoped globally in simple namespaced object
  var rider = {
  
    in: './app/handlebars/', 
    out: './public/javascript/templates.js', 
    templates: [],
    minify: true
    
  }
  
  // recursively reads in directory and namespaces template and partial objects  
  var readTemplatesDirectory = function(dir, done) {
    
    // stores results    
    var results = []
    
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
      
  };
    
  
  //watches a file for changes
  var fileHasChanged = function(event, filename){
      
      console.log(color.blue + '[handlebar-rider] change detected to file "' + filename + '"' + color.reset);
      compileTemplates();
  
  };
  
  
  // watches a directory for changes  
  var directoryHasChanged = function(event, filename){
     
      console.log(color.blue + '[handlebar-rider] new or removed file "' + filename + '" detected, recompiling' + color.reset);
      readAndCompile(rider.in, rider.watch);
        
  };
  
  var watchers = []
  var unwatchAll = function(){
    
    for(var w = 0; w < watchers.length; w++){
      watchers[w].close();
    }
    
  }
    
  //compiles to output destination
  var compileTemplates = function(){
    var processedFiles = [];
    try {  
        
        output = ['(function() {'];
        output.push('\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};\n');
        
        // todo - figure out cleaner way to register partials as actual partials
        output.push('\n  Handlebars.partials = Handlebars.templates;\n')
        for(var t = 0; t < rider.templates.length; t++){
            processedFiles.push(rider.templates[t].namespace);
            data = fs.readFileSync(rider.templates[t].file, 'utf8');
            
            // clean the data a bit
            data = data.replace(/<!--(.*?)-->/gm, "")
                       .replace(/(\r\n|\n|\r)/gm,"");
            
            // check for partial conventions
            if (rider.templates[t].namespace.indexOf('/_') > 0){
            
              compiled = 'templates[\'' + rider.templates[t].namespace.replace(/\/_/,'_') + '\'] = template(' + handlebars.precompile(data, {}) + ');\n'

            } else if( rider.templates[t].namespace.indexOf('partial') != 0 ) {
              
              compiled = 'templates[\'' + rider.templates[t].namespace + '\'] = template(' + handlebars.precompile(data, {}) + ');\n'
              
            } else {
              
              compiled = 'templates[\'' + rider.templates[t].namespace.replace(/partials\//,'') + '\'] = template(' + handlebars.precompile(data, {}) + ');\n'
              
            }
            output.push(compiled);
        
        }
    
      } catch(e) {
        var filename = processedFiles.pop();
        console.log(color.red + '[handlebar-rider] Compile Failure while processing "' + filename + '"' + color.reset);
  
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
        console.log(color.green + '[handlebar-rider] compiled ' + processedFiles.length + ' templates in "' + rider.in + '" to "' + rider.out + '"' + color.reset);
        
      } catch(e){
      
          console.log(color.red + '[handlebar-rider] ERROR! destination file or directory does not exist.' + color.reset + '\n:' + e);
      
      }

 };

  
 var readAndCompile = function(dir, watch){
   
    rider.templates = []
    
    // unwatch all the files
    unwatchAll();
    
    //read files in the directory
    readTemplatesDirectory(dir, function(err, files) {
      // sort filenames to preserve ordering in generated files (so that re-running the script does not produce different md5 sigature)
      files.sort();
    
     try {
       
       if(err)
         throw new Error('directory does not exists: ' + dir)
      
       for(var f = 0; f < files.length; f++){
          
          // determine whether or not it's a file or directory. 
          info = files[f].split(':')
          
          if( info[0] == 'file' && (info[1].indexOf('.hb') > 0 || info[1].indexOf('.handlebars') > 0) ){
            
            // watch the file
            if(watch) {
              //fs.unwatchFile(info[1], null)
              watchers.push(fs.watch(info[1], fileHasChanged))
            }
            
            // get the template namespace by using the extra directory
            template_dir = rider.in.toString();
            file_and_dir = info[1].substr( (info[1].indexOf(template_dir) + template_dir.length) + 1, info[1].length);
            namespaced = file_and_dir.replace(/\.hb/,'');
            
            // push object for the compiler to work with
            rider.templates.push({
              namespace: namespaced,
              file: info[1]
            })
            
            
          } else if ( info[0] == 'directory') {
            
            // watch the directory for new / removed files
            if(watch){ 
              //fs.unwatchFile(info[1], null)
              watchers.push(fs.watch(info[1], directoryHasChanged))
            
            }
            
          }
        
        }
        
        compileTemplates();
        
      } catch (e){
        
        console.log(color.red + '[handlebar-rider] ERROR! check to be sure your directories exist. ' + color.reset  + "\n" + e + "\n");
        console.log('[handlebar-rider] input directory: ' + dir);
        console.log('[handlebar-rider] destination file: ' + rider.out + "\n");
        if(rider.help)
          console.log(rider.help)
        
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
  .argv
  
  dir = argv.in;
  rider.in = dir;
  rider.minify = !argv.readable;
  rider.out = argv.out;
  rider.watch = argv.watch;
  rider.help = optimist.help()
  
  if(rider.watch) 
    console.log(color.yellow + '[handlebar-rider] watching template directory ' + dir  + color.reset);

  readAndCompile(dir, rider.watch);
  
}

// export functions for module use
exports.configure = function(config){ rider = config; }
exports.watch = function(){
  
  console.log(color.yellow + '[handlebar-rider] watching template directory ' + rider.in  + color.reset);
  rider.watch = true;
  readAndCompile(rider.in, true);
  
}

exports.compile = function(){
  rider.watch = false;
  readAndCompile(rider.in, false);
  
}

 
})()



