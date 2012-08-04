# handlebar-rider
================

Command line tool that will watch a handlebars template directory pre-compile containing handlebars template files and concatenate them 
into a single javascript file in build/public.  

The directory structure you use will namespace the templates with ['directory/template'] as with JST et all


## Install:

		npm install -g handlebar-rider

## Usage:

    handlebar-rider path/to/your/handlebars/dir/

    options:
			
			--out	The destination file to compile your templates to.  Default is public/javascript/templates.js
			
			--readable  This will avoid uglifying your output javascript.   
			
					
## Run-time usage example: 

    html_output = Handlebars.templates['users/view'](data)

 
## Partial Support/Conventions:

There are two methods for using partials within your templates:
 
1. Global partials 

If you create a partials in a directory, aptly called "partials" which lives within your handlebars templates directory, the
handlebars files will be pre compile and available in your templates 

2. Scoped partials

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
 

