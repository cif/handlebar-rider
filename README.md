# handlebar-rider
================

Command line tool that will watch a handlebars template directory pre-compile containing handlebars template files and concatenate them 
into a single javascript file in build/public.  

The directory structure you use will namespace the templates with ['directory/template'] as with JST et all


## Install:

		npm install -g handlebar-rider

## Command line usage:

    Command Line Usage: 

    Options:
      -i, --in        Specify an input templates directory                            [default: "./app/handlebars/"]
      -o, --out       Specify an output file into which templates are compiled        [default: "./public/javascript/templates.js"]
      -w, --watch     Watch your handlebars files and compile when changes occur      [default: false]
      -r, --readable  Make the output more readable by avoiding default minification  [default: false]
      
    

## npm module usage			

		hbr = require('handlebar-rider')
		hrb.configure({
		  in: '/path/to/your/templates/'
		  out: '/path/to/output.js',
		  minify: false
		})
		hbr.compile()
		hbr.watch()
				
## Run-time usage example: 

    html_output = Handlebars.templates['users/view'](data)

 
## Partial Support/Conventions:

There are two methods for using partials within your templates:
 
#### 1. Global partials 

If you a directory within your templates directory, aptly called "partials", the
handlebars files will be pre compile and become available in your templates as partial_name

#### 2. Scoped partials

If you prefix your template file name with an underscore, you can can access it as directory_partial 

### Example directory structure:

    templates 
      -- users
          - _list.hb
          - _form.hb
          - edit.hb
          - view.hb
      
      -- partials
          - photo_uploader.hb


### And usage: 

    <h1>Edit User</h1>
    {{> users_list}}
    {{> users_form}}
    {{> photo_uploader}}
 

