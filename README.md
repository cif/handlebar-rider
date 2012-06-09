handlbar-rider
================

Command line tool that will watch a handlebars template directory and recompile them to a single file in build/public. 
The templates will be available in Handlebars.templates.filename (without the extension). See [Handlebars Precompiler](http://handlebarsjs.com/precompilation.html) documentation for more info.

Usage:

    handlebar-rider path/to/your/handlebars/dir/

    options:
			
			--out				The destination file to compile your templates to.  Default is public/javascript/templates.js
			
			--readable  This will avoid uglifying your output javascript.   