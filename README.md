handlbar-rider
================

Command line tool that will watch a handlebars template directory pre-compile containing handlebars template files and concatenate them 
into a single javascript file in build/public. 

Templates will be available in Handlebars.templates.filename (without the extension). See [Handlebars Precompiler](http://handlebarsjs.com/precompilation.html) documentation for more info.

Install:
    
    git clone https://github.com/cif/handlebar-rider.git
npm install -g handlebar-rider

Usage:

    handlebar-rider path/to/your/handlebars/dir/

    options:
			
			--out	The destination file to compile your templates to.  Default is public/javascript/templates.js
			
			--readable  This will avoid uglifying your output javascript.   