handlebar-rider
================

Command line tool that will watch a handlebars template directory pre-compile containing handlebars template files and concatenate them 
into a single javascript file in build/public.  The directory structure you use will namespace the templates as expected with JST et all

Run-time usage example: 

    html_output = Handlebars.templates['users/view'](data)
 

Install:

		npm install -g handlebar-rider

Usage:

    handlebar-rider path/to/your/handlebars/dir/

    options:
			
			--out	The destination file to compile your templates to.  Default is public/javascript/templates.js
			
			--readable  This will avoid uglifying your output javascript.   
			
