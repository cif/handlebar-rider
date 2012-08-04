
// handlebar rider

handlebars = require('handlebars');
uglify = require('uglify-js');
fs = require('fs');


(function(){
  
  //colored output
  var color = {
    red : '\u001b[31m',
    blue: '\u001b[34m',
    green: '\u001b[32m',
    yellow: '\u001b[33m',
    reset: '\u001b[0m'
  }

  //options and helper functions scoped globally in simple namespaced object
  var rider = {
  
    templates_dir: 'app/handlebars/', 
    outfile: 'public/javascript/templates.js', 
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
        
      console.log(color.green + '[handlebar-rider] Change detected to file, recompiling' + color.reset);
      compileTemplates();
  
  };
  
  
  // watches a directory for changes  
  var directoryHasChanged = function(event, filename){
      
      console.log(color.blue + '[handlebar-rider] New or removed file detected, recompiling' + color.reset);
      readAndCompile();
        
  };
    
  //compiles to output destination
  var compileTemplates = function(){
    
    try {  
        
        output = ['(function() {'];
        output.push('\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};\n');
        output.push('\n  Handlebars.partials = Handlebars.templates;\n')
        for(var t = 0; t < rider.templates.length; t++){
            
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
    
        console.log(color.red + '[handlebar-rider] ERROR! ' + color.reset + '\n' + e);
  
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
        
        fs.writeFileSync(rider.outfile, output, 'utf8');
      
      } catch(e){
      
          console.log(color.red + '[handlebar-rider] ERROR! Destination file or directory does not exist.' + color.reset + '\n:' + e);
      
      }

 };

  
 var readAndCompile = function(files){
   
   try{
    
    //read files in the directory
    readTemplatesDirectory(dir, function(err, files) {
    
      if (err) throw err;
      
      rider.templates = []
      for(var f = 0; f < files.length; f++){
          
          // determine whether or not it's a file or directory. 
          info = files[f].split(':')
          
          if( info[0] == 'file' && (info[1].indexOf('.hb') > 0 || info[1].indexOf('.handlebars') > 0) ){
            
            // watch the file
            fs.watch(info[1], fileHasChanged)
            
            // get the template namespace by using the extra directory
            template_dir = rider.templates_dir.toString();
            file_and_dir = info[1].substr( (info[1].indexOf(template_dir) + template_dir.length) + 1, info[1].length);
            namespaced = file_and_dir.replace(/\.hb/,'');
            
            // push object for the compiler to work with
            rider.templates.push({
              namespace: namespaced,
              file: info[1]
            })
            
            
          } else if ( info[0] == 'directory') {
            
            // watch the directory for new / removed files
            fs.watch(info[1], directoryHasChanged)
            
          }
        
        }
        
        compileTemplates();
        
      });
      
    } catch(e){
   
      console.log(color.red + '[handlebar-rider] ERROR! Check to be sure your directories exist. ' + color.reset  + e);
     
    }

  }  
 
  //get options specified on command line
  var opts = process.argv.splice(2);
  var dir = opts[0] ? opts[0] : rider.templates_dir;
  rider.templates_dir = dir;

  //scan through remaning arguments and set appropriate variables
  for(var o = 1; o < opts.length; o++){
    if(opts[o] == '--out' && typeof opts[o+1] != undefined){
      rider.outfile = opts[o+1];
    }
    if(opts[o] == '--readable'){
      rider.minify = false;
    }
  }

  //compile on startup
  console.log(color.green + '[handlebar-rider] Compiling template directory ' + dir + ' to ' + rider.outfile + color.reset);
  console.log(color.yellow + '[handlebar-rider] Watching template directory ' + dir  + color.reset);

  readAndCompile();
  

})()