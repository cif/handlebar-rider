handlebars = require('handlebars');
uglify = require('uglify-js');
fs = require('fs');

//colored output
var hbcolor = {
  red : '\u001b[31m',
  blue: '\u001b[34m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  reset: '\u001b[0m'
}

//options and helper functions scoped globally in simple namespaced object
var hbrider = {
  
  templates_dir: 'app/handlebars/', 
  outfile: 'public/javascript/templates.js', 
  files: null,
  minify: true,
  //watches each file for changes
  watchIndividualFileHandler: function(event, filename){
        console.log(hbcolor.green + '[handlebar-rider] Change detected to file, recompiling' + hbcolor.reset);
        hbrider.compileTemplates();
  },
  //compiles to output destination
  compileTemplates:function(){
    
    try {  
      var output = ['(function() {\n  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {}; \n'];
      var templates = hbrider.files;
      for(var t = 0; t < templates.length; t++){
          var data = fs.readFileSync(hbrider.templates_dir + templates[t], 'utf8');
          var tmpl_name = templates[t].substring(0, templates[t].indexOf('.'));
          var compiled = 'templates[\'' + tmpl_name + '\'] = template(' + handlebars.precompile(data, {}) + ');\n'
          output.push(compiled);
      }
      
    } catch(e) {
      
      console.log(hbcolor.red + '[handlebar-rider] ERROR! ' + hbcolor.reset + '\n' + e);
    
    }
    
    //complete output array to single string
    output.push('})();');
    output = output.join('');
    
    if(hbrider.minify){
      var ast = uglify.parser.parse(output);
      ast = uglify.uglify.ast_mangle(ast);
      ast = uglify.uglify.ast_squeeze(ast);
      output = uglify.uglify.gen_code(ast);
    }
    
    //write the output file
    try {
      fs.writeFileSync(hbrider.outfile, output, 'utf8');
    } catch(e){
        console.log(hbcolor.red + '[handlebar-rider] ERROR! Destination file or directory does not exist.' + hbcolor.reset + '\n:' + e);
    }
    
  }
};

(function(){
  
  //get options specified on command line
  var opts = process.argv.splice(2);
  var dir = opts[0] ? opts[0] : hbrider.templates_dir;
  hbrider.templates_dir = dir;
  
  //scan through remaning arguments and set appropriate variables
  for(var o = 1; o < opts.length; o++){
    if(opts[o] == '--out' && typeof opts[o+1] != undefined){
      hbrider.outfile = opts[o+1];
    }
    if(opts[o] == '--readable'){
      hbrider.minify = false;
    }
  }
  
  try{
    
    //read files in the directory
    hbrider.files = fs.readdirSync(dir);
  
    //compile on startup
    console.log(hbcolor.green + '[handlebar-rider] Compiling template directory ' + dir + ' to ' + hbrider.outfile + hbcolor.reset);
    hbrider.compileTemplates();
    
    console.log(hbcolor.yellow + '[handlebar-rider] Watching template directory ' + dir  + hbcolor.reset);
    for(var f = 0; f < hbrider.files.length; f++){
        fs.watch(dir + hbrider.files[f], hbrider.watchIndividualFileHandler);
    }
  
    //handles changes to the directory
    var directoryWatcher = fs.watch(dir, function (event, filename) {
      console.log(hbcolor.blue + '[handlebar-rider] New or removed file detected, recompiling' + hbcolor.reset);
      hbrider.files = fs.readdirSync(dir);
      hbrider.compileTemplates();
    });
    
    
  } catch(e){
   
    console.log(hbcolor.red + '[handlebar-rider] ERROR! Check to be sure your directories exist. ' + hbcolor.reset  + e);
     
  }
  

})()