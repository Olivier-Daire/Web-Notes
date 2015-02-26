
var noteManager = function (options) {
    this.parameters = options;
    this.defaults = {
        defaultSort: 'newer'
    };
};
 
noteManager.prototype = {
    
    init: function() {
      // merge defaults options and user's ones
      this.options = $.extend({}, this.defaults, this.parameters);
      this.plugEvents();
    },
 
    plugEvents: function() {

      this.displayNotes();
      if (this.options.defaultSort === "older") {
        this.reverseOrder();
      }

      var that = this;

      // Save note and display it 
      $(document).on('click', '#new-note-form button[type="submit"]', function(e){
        e.preventDefault();
        var form = $(this).closest('form');
        var note = that.getNote(form);
        if (note.content !== '' || note.title !== '') {
          that.saveNote(note);
          //that.clearForm();
          // TODO : animate opacity
          form.remove();
          that.displaySingleNote(note);
        }else{
          alert("You can't submit an empty note !");
        }

      });

      $('#new-note').on('click', function(){
        if (!$('#new-note-form').length) {
          that.newForm();
          $("html, body").animate({
            scrollTop: 0
          }, 600);
          $('.card .mdi-navigation-close').on('click', function(){
            // TODO : Animate opacity
            $(this).closest('form').remove();
          });
        }
      });

      // Delete all notes
      $('#delete').on('click', $.proxy(function(){
        if (confirm("All notes will be deleted, are you sure ?")) {
          this.deleteNotes();
        }
      }, this));

      // Delete a note
      $(document).on('click', 'div[id^="note-"] button.delete', function(){
        if (confirm("This note will be deleted, are you sure ?")) {
          var id = $(this).parents('div[id^="note-"]').attr('id');
          id = id.substr(5, id.length);
          that.deleteSingleNote(id);
          // Force update of all notes ids
          // TODO : find a cleaner way to do this 
          $('div[id^="note-"]').remove();
          that.displayNotes();
        }
      });

      // Edit a note
      $(document).on('click', 'div[id^="note-"] button.edit', function(){
        var id = $(this).parents('div[id^="note-"]').attr('id');
        id = id.substr(5, id.length);
        that.editNote(id);
      });

      // Only when editing a note
      $(document).on('click', '#edit-note-form button[type="submit"]', function(e){
        e.preventDefault();
        var form = $(this).closest('form');
        var note = that.getNote(form);
        that.saveNote(note);

        var id = $(form).data("note-id");
        that.deleteSingleNote(id);
        that.displaySingleNote(note);
      });

      // Sort by time
      $('#sort').on('click', $.proxy(function(e){
        e.preventDefault();
        this.reverseOrder();
      }, this));

      // Sort by tag 
      $(document).on('click', '.note span[id^="tag-"], #tagsButton span', function(){
        var tag = $(this).text();
        that.searchByTag(tag);
      });

      // Tag search
      $('#search-by-tag').on('mouseenter', $.proxy(function(){
        var tags = this.getAllTags();

        if (tags) {
          var html = this.displayAllTags(tags);  

          if (html !== '') {
            $('#tagsButton').html(html);
          }
        }
        
      }, this));

      // Text search
      $('#search-input').on('keyup', function(){
        var value = $(this).val();
        $('div[id^="note-"]').hide();
        $('div[id^="note-"]:contains("'+value+'")').show();
      });


       /* Export to Dropbox
       * /!\  Can't save a file from localhost (Dropbox need access to the server)
       */
      $('#dropbox-export').on('click', $.proxy(function(){
        if (Dropbox.isBrowserSupported()) {

          var id = this.createJSONfile(localStorage.getItem("WebNotes"));
          
          id.success(function(id){
            var dropboxOptions = {
              files: [
                  {'url': document.URL+'/temp/WebNotes-'+id+'.json', 'filename': 'WebNotes.json'},
              ],
              error: function (errorMessage) {
                alert('An error occured, try again later.\nSorry for the inconvenience.');
                console.log('Error when saving to Dropbox: '+errorMessage);
              }
            };

            Dropbox.save(dropboxOptions);
          });

          id.error(function(){
            alert('An error occured, try again later.\nSorry for the inconvenience.');
            console.log('Error generating JSON');
          });
        }else{
          alert("Your browser is not supported by the Dropbox API, it's probably time to update your browser, check : \n\noutdatedbrowser.com");
        }

      }, this));

      // Import from Dropbox  
      $('#dropbox-import').on('click', $.proxy(function(){

        if (Dropbox.isBrowserSupported()) {

          var that = this;
          var options = {
            // Required. Called when a user selects an item in the Chooser.
            success: function(files) {
                $.get( files[0].link, function( data ) {
                  localStorage.setItem("WebNotes", data);
                  $('div[id^="note-"]').remove();
                  that.displayNotes();
                });
            },
            // Direct link to the content of the file
            linkType: "direct",
            multiselect: false,
            // User will be able to select only json files
            extensions: ['.json'],
          };

          if (confirm("This will erase all your current notes and replace them by the ones you choose to import, are you sure ?")) {
            Dropbox.choose(options);
          }
        }else{
          alert("Your browser is not supported by the Dropbox API, it's probably time to update your browser, check : \n\noutdatedbrowser.com");
        }

      }, this));


    }, // End plugEvents


    /******************
      CORE FUNCTIONS
    ******************/
    // TODO : Add tags field
    newForm: function(){
      var formHTML = 
      '<form class="col s12 m3" id="new-note-form">'+
        '<div class="card">'+
          '<div class="card-content">'+
              '<span class="card-title grey-text text-darken-4">Add a new note<i class="mdi-navigation-close right"></i></span>'+
              '<div class="input-field col s12">'+
                '<input type="text" id="title" autofocus>'+
                '<label for="title">Title</label>'+
              '</div>'+
              '<div class="input-field col s12">'+
                '<textarea class="materialize-textarea"></textarea>'+
                '<label>Content of your note</label>'+
              '</div>'+
              '<div class="clear"></div>'+
          '</div>'+
          '<div class="card-action center-align">'+
            '<button class="btn waves-effect waves-light" type="submit" name="action">Submit<i class="mdi-content-send right"></i></button>'+
          '</div>'+
        '</div>'+
      '</form>';

      $('main .container .row').prepend(formHTML);
    },


    /**
     * Get form data and return it as a JSON object
     * @param {HTML Object} form   The form generating this note
     * @return {JSON}   Note as JSON object  
     */
    getNote: function(form) {
      var title = form.find('#title').val();
      var content = form.find('textarea').val();
      var url = this.containsURL(content);
      var today = this.formatDate();
      var date = today[0];
      var time = today[1];
          // FIXME
          //tags = this.formatTags(form.find('.tags').val());
      var tags = '';

      var note = this.formatNote(title, content, date, time, tags, url);
      return note;
    },

    /**
     * Format note to JSON with form data
     * @param  {string} title     Note title
     * @param  {string} content   Note text content
     * @param  {string} date      Note date 
     * @param  {string} time      Note hour
     * @param  {string} tags      Note tags
     * @param  {string} url       URL contained in note
     * @return {JSON}             Note as JSON object
     */
    formatNote: function(title, content, date, time, tags, url) {
      var note = {
            "title": title,
            "content": content,
            "date": date,
            "time": time,
            "tags": tags,
            "url": url,
          };

      return note;
    },

    /**
     * If notes already exist in local storage, add the new one and save
     * else create the object and save it in local storage.
     * @param  {JSON}
     */
    saveNote: function(note) {
      var notes;
      if (localStorage.getItem("WebNotes") === null) {
        notes = [ note ];
        notes = JSON.stringify(notes);
        localStorage.setItem("WebNotes", notes);
      }else{
        notes = $.parseJSON(localStorage.getItem("WebNotes"));
        notes.push(note);
        notes = JSON.stringify(notes);
        localStorage.setItem("WebNotes", notes);
      }
    },

    /**
     * Display all notes
     */
    displayNotes: function() {
      if (localStorage.getItem("WebNotes") !== null) {

        var notes = $.parseJSON(localStorage.getItem("WebNotes"));
        var tags;

        for (var i = notes.length-1 ; i >= 0; i--) {
          tags = '';
          for (var j = 0; j < notes[i].tags.length; j++) {
            if (notes[i].tags[j]) {
              if (j === 0 ) {
                tags = '<span id="tag-'+j+'">#' + notes[i].tags[j] + '</span>';  
              }else{
                tags = tags + ' <span id="tag-'+j+'">#' + notes[i].tags[j] + '</span>';
              }
            }   
          }

          // Replace url in text by a link
          var url = this.containsURL(notes[i].content);
          if (typeof url !== undefined) {
            var regexp = /^(www)/;
            if (regexp.exec(url)) {
              if (notes[i].type === "video" || notes[i].type === "sound"){
                notes[i].content = notes[i].content.replace(url, '');  
              }else{
                var urlWithoutProtocol = url;
                url = 'http://'+url;
                notes[i].content = notes[i].content.replace(urlWithoutProtocol, '<a href="'+ url +'">'+urlWithoutProtocol+'</a>');
              }
            }else{
              if (notes[i].type == "video" || notes[i].type == "sound") {
                notes[i].content = notes[i].content.replace(url, '');  
              }else{
                notes[i].content = notes[i].content.replace(url, '<a href="'+ url +'">'+url+'</a>');  
              }
            }
          }

          // Keep line breaks 
          notes[i].content = this.nl2br(notes[i].content);

          $('main .container .row').append(
            '<div class="col s12 m3" id="note-'+i+'"><div class="card">'+
              '<div class="card-content">'+
                '<span class="card-title grey-text text-darken-4">'+notes[i].title+'</span>'+
                '<p>'+notes[i].content+'</p>'+
              '</div>'+
              '<div class="card-action">'+
                '<div class="tools">'+ tags +'</div>'+
                '<i class="date">'+notes[i].date+' - '+notes[i].time+'</i>'+
                '<span class="right grey-text text-darken-1"><button class="edit"><i class="small mdi-editor-mode-edit"></i></button>'+
                '<button class="delete"><i class="small mdi-action-delete"></i></button></span>'+
              '</div>'+
            '</div></div>'
          );

          if (notes[i].url) {
            this.generateWidget(i, notes[i].url);
          }
        }

      }
    },

    /**
     * Display a single note
     * @param {JSON} note
     */
    displaySingleNote: function(note) {
      var tags = '';
      var notesLength = $.parseJSON(localStorage.getItem("WebNotes")).length;
      notesLength = notesLength-1; // Number of next note

      for (var j = 0; j < note.tags.length; j++) {
         if (note.tags[j]) {
          if (j === 0 ) {
            tags = '<span id="tag-'+j+'">#' + note.tags[j] + '</span>';
          }else{
            tags = tags + ' <span id="tag-'+j+'">#' + note.tags[j] + '</span>';
          }
        }
      }

      // Replace url in text by a link
      var url = this.containsURL(note.content);
      if (typeof url !== undefined) {
        var regexp = /^(www)/;
        if (regexp.exec(url)) {
          var urlWithoutProtocol = url;
          url = 'http://'+url;
          note.content = note.content.replace(urlWithoutProtocol, '<a href="'+ url +'">'+urlWithoutProtocol+'</a>');
        }else{
          note.content = note.content.replace(url, '<a href="'+ url +'">'+url+'</a>');  
        }
      }

      // Keep line breaks 
      note.content = this.nl2br(note.content);
      var noteHTML = '<div class="col s12 m3"  id="note-'+notesLength+'"><div class="card">'+
                        '<div class="card-content">'+
                          '<span class="card-title grey-text text-darken-4">'+note.title+'</span>'+
                          '<p>'+note.content+'</p>'+
                        '</div>'+
                        '<div class="card-action">'+
                          '<div class="tools">'+ tags +'</div>'+
                          '<i class="date">'+note.date+' - '+note.time+'</i>'+
                          '<span class="right grey-text text-darken-1"><button class="edit"><i class="small mdi-editor-mode-edit"></i></button>'+
                          '<button class="delete"><i class="small mdi-action-delete"></i></button></span>'+
                        '</div>'+
                      '</div></div>';

      if (this.options.defaultSort === "older") {
        $('main .container .row').append(noteHTML);  
      }else{
        $('main .container .row').prepend(noteHTML);
      }
      
      if (note.url) {
        this.generateWidget(notesLength, note.url);
      }

      // TODO Find a cleaner way to do this
      if ($('#note-'+notesLength).hasClass('video') || $('#note-'+notesLength).hasClass('sound')){
        var content = $('#note-'+notesLength+' p').text();
        content = content.replace(url, '');
        $('#note-'+notesLength+' p').text(content);
      }
    },

    /**
     * Delete all notes
     */
    deleteNotes: function() {
      localStorage.removeItem("WebNotes");
      $('div[id^="note-"]').remove();
      $('#dropdown1').html('You have currently no notes with a tag, add tags to your notes !');
    },

    /**
     * Delete a single note
     * @param  {int} id  ID of the note to be deleted
     */
    deleteSingleNote: function(id) {
      var notes = $.parseJSON(localStorage.getItem("WebNotes"));
      if (id != -1) {
        notes.splice(id, 1);
        notes = JSON.stringify(notes);
        localStorage.setItem("WebNotes", notes);
        $('#note-'+id+'').remove();
      }
    },

    /**
     * Edit a note 
     * @param  {int} id  ID of the note to be edited
     */
    editNote: function(id) {
      var notes = $.parseJSON(localStorage.getItem("WebNotes"));
      var note = notes[id];

      var editForm = 
        '<form class="col s12" id="edit-note-form" data-note-id="'+id+'">'+
          '<div class="card">'+
            '<div class="card-content">'+
                '<span class="card-title grey-text text-darken-4">Edit a note</span>'+
                '<div class="input-field col s12">'+
                  '<input type="text" id="title" value="'+note.title+'">'+
                  '<label for="title">Title</label>'+
                '</div>'+
                '<div class="input-field col s12">'+
                  '<textarea class="materialize-textarea">'+note.content+'</textarea>'+
                  '<label>Content of your note</label>'+
                '</div>'+
                '<div class="clear"></div>'+
            '</div>'+
            '<div class="card-action center-align">'+
              '<button class="btn waves-effect waves-light" type="submit" name="action">Submit<i class="mdi-content-send right"></i></button>'+
            '</div>'+
          '</div>'+
        '</form>';

     $('#note-'+id).html(editForm);

     // FIXME : bug in materialize framework with autofill
     $('#note-'+id+' label').addClass('active');

     // TODO : tag input
    /* $('#note-'+id+' .tags').tagsInput({
       'height': 'auto',
       'width' : 'auto',
      });*/
    },

    /**
     * Fetch all tags from each note
     * @return {array} Array of all tags
     */
    getAllTags: function(){
      var notes = $.parseJSON(localStorage.getItem("WebNotes"));
      var tags = [];

      if (notes !== null) {
        for (var i = notes.length-1 ; i >= 0; i--) {
          for (var j = 0; j < notes[i].tags.length; j++) {
            if (notes[i].tags[j] && $.inArray(notes[i].tags[j], tags) === -1) {
               tags.push(notes[i].tags[j]);
            }
          }   
        }
        return tags;
      }

    },

    /**
     * Get all notes tags and return HTML code with a list of all the tags
     * @param  {array} tags  Array of all tags
     * @return {string}      HTML code 
     */
    displayAllTags: function(tags){
      var html = '';
      for (var i = 0; i < tags.length; i++) {
        html = html + '<span>'+tags[i]+'</span>';
      }
      return html;
    },

    /**
     * Show the notes containing the selected tag
     * @param  {string} tag 
     */
    searchByTag: function(tag){
      // Hide all notes and then show only the ones with the selected tag
      $('div.note').hide();
      $('div.note .tools span:contains("'+tag+'")').parent().parent().show();
    },

    /******************
     TOOLKIT FUNCTIONS
    ******************/
    // Useless ?
    /*clearForm: function() {
      $('form input.title, form textarea').val('');
      $('div.tagsinput span').remove();
      $('.tagsInput input').val('');
      $('input.tags').val('');
    },*/

    /**
     * Get current date and time and format it
     * @return {array}    containing current date and hour
     */
    formatDate: function() {
      var today = new Date();
      var dd = today.getDate();
      var mm = today.getMonth()+1; //January is 0!
      var yyyy = today.getFullYear();

      if(dd<10){
          dd='0'+dd;
      } 
      if(mm<10){
          mm='0'+mm;
      } 

      var h = today.getHours();
      var m = today.getMinutes();
      //var s = today.getSeconds();

      today = dd+'/'+mm+'/'+yyyy;

      var time = h + 'h' + m + 'min';

      return [today, time];
    },
    
    /**
     * Convert a list of tags into an array
     * @param  {string} tags    list of tags
     * @return {array}          array of tags
     */
    formatTags: function(tags) {
      var tagsArray = tags.split(',');

      return tagsArray;
    },

    /**
     * Convert line breaks to <br>
     * http://phpjs.org/functions/nl2br/
     * @param  {string}  str      String to be formated 
     * @param  {Boolean} is_xhtml XHTML compatibility
     * @return {string}           String formated with <br> tags
     */
    nl2br : function(str, is_xhtml){
      var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br />' : '<br>';    
      return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1'+ breakTag +'$2');
    },

    /**
     * Ajax request to generate a JSON file through a PHP script
     * @param  {JSON} notes    object containing all notes
     */
    createJSONfile: function(notes) {
      return $.ajax({
        type : "POST",
        url : "php-tools/json.php",
        data : {
            json : notes
        }
      });
    },

    /**
     * Display all notes in reverse order : old ones first
     */
    reverseOrder: function() {
      $('main .container .row > div:not(#new-note-form)').each(function() {
        $(this).prependTo(this.parentNode);
      });
      $('main .container .row').prepend($('#new-note-form'));
    },


    /**
     * Check for an URL inside a string
     * @param  {string} s 
     * @return {string}   Matched URL
     */
    containsURL: function(s) {
      var regexp = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;
      if (regexp.exec(s)) {
        return regexp.exec(s)[0];
      }
    },

    /**
     * Test for compatible websites and return a widget or a picture
     * @param  {int}    id  ID of the note containing the url
     * @param  {string} s   URL to be tested
     */
    generateWidget: function(id, s) {
      var regexp = /(youtube\.com|youtu\.be|soundcloud\.com|imdb\.com|allocine\.fr|jpe?g|gif|png)/;
      var that = this;
      var movieTitle;

      if (regexp.exec(s)) {
        switch (regexp.exec(s)[0]) {
          case 'youtube.com':
          case 'youtu.be':
            s = this.getYoutubeId(s);
            // Only if correct youtube URL
            if (s !== -1) {
              var iframe = '<iframe id="" type="text/html" src="http://www.youtube.com/embed/'+s+'" frameborder="0"/>';
               $('#note-'+id+' .card').prepend(iframe);
              
              // Add type to note
              var notes = $.parseJSON(localStorage.getItem("WebNotes"));
              notes[id].type = "video";
              notes = JSON.stringify(notes);
              localStorage.setItem("WebNotes", notes);

              $('#note-'+id).attr('class',"col s12 m4 video");
              $('#note-'+id+' .card').addClass('red darken-2');
            }
          break;

          case 'soundcloud.com':
            SC.initialize({
              client_id: config.SoundCloud_client_id
            });

            var track_url = s;
            SC.oEmbed(track_url, { auto_play: false, show_comments: false, maxheight: 150 }, function(oEmbed) {
              $('#note-'+id+' .card').prepend(oEmbed.html);
            });

            // Add type to note
            notes = $.parseJSON(localStorage.getItem("WebNotes"));
            notes[id].type = "sound";
            notes = JSON.stringify(notes);
            localStorage.setItem("WebNotes", notes);

            $('#note-'+id).attr('class',"col s12 m5 sound");
            $('#note-'+id+' .card').addClass('orange lighten-1');
          break;

          case 'imdb.com':
            movieTitle = this.getTitleFromUrl(s);

            movieTitle.success(function(movieTitle){
              // Remove year from title 
              var regex = /(\(.*\))/;
              movieTitle = movieTitle.replace(regex.exec(movieTitle)[0], '');

              var movie = that.getMovie(movieTitle);
              movie.success(function(movie){
                var url = 'http://image.tmdb.org/t/p/w342'+movie.results[0].poster_path;

                // Append the image
                var img = '<div class="card-image">'+
                            '<img src="'+url+'" alt="">'+
                          '</div>';
                
                $('#note-'+id+' .card').prepend(img);
                $('#note-'+id).attr('class', 'col s12 m4');
                $('#note-'+id+' .card').addClass('amber lighten-1');

                // Change note url to image URL instead of IMDB's one
                // so that there is juste one API call (first time the note is saved)
                notes = $.parseJSON(localStorage.getItem("WebNotes"));
                notes[id].url = url;
                notes[id].type = "movie";
                notes = JSON.stringify(notes);
                localStorage.setItem("WebNotes", notes);
              });
            });
          break;

          case 'allocine.fr':
            movieTitle = this.getTitleFromUrl(s);

            movieTitle.success(function(movieTitle){
              var movie = that.getMovie(movieTitle);

              movie.success(function(movie){
                var url = 'http://image.tmdb.org/t/p/w342'+movie.results[0].poster_path;
                
                // Append the image
                var img = '<div class="card-image">'+
                            '<img src="'+url+'" alt="">'+
                          '</div>';
                
                $('#note-'+id+' .card').prepend(img);
                $('#note-'+id).attr('class', 'col s12 m4');
                $('#note-'+id+' .card').addClass('amber lighten-1');

                // Change note url to image URL instead of Allocine's one
                // so that there is juste one API call (first time the note is saved)
                notes = $.parseJSON(localStorage.getItem("WebNotes"));
                notes[id].url = url;
                notes[id].type = "movie";
                notes = JSON.stringify(notes);
                localStorage.setItem("WebNotes", notes);
              });
            });
          break;

          case 'jpeg':
          case 'jpg':
          case 'png':
          case 'gif':
            var img = '<div class="card-image">'+
                        '<img src="'+s+'" alt="">'+
                      '</div>';
                
            $('#note-'+id+' .card').prepend(img);
            $('#note-'+id).attr('class', 'col s12 m4');

            //  Add type to note (on 2nd call, movies are handled like images
            //  so we need to test if the type is not already defined 
            //  in this case only it's really an image and not a poster)
            notes = $.parseJSON(localStorage.getItem("WebNotes"));
            if (notes[id].type !== 'movie') {
              if (notes[id].type === undefined) {
                notes[id].type = "image";
                notes = JSON.stringify(notes);
                localStorage.setItem("WebNotes", notes);
              }
            }else{
              $('#note-'+id+' .card').addClass('amber lighten-1');
            }
            
          break;
        }
      }

    },

    /**
     * Get the ID from a Youtube video
     * @param  {string} url  URL of the video
     * @return {string}      ID of the video
     */
    getYoutubeId: function(url){
      var ID = '';
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/;
      var match = url.match(regExp);
      if (match && match[7].length == 11){
        var ID = match[7];
      }else{
        ID = -1;
      }
      return ID;
    },

    /**
     * Get the movie title from an IMDB/Allocine URL
     * @param  {strin} url  Webpage url
     */
    getTitleFromUrl: function(url) {
      // If link starts with www add protocol (http) to it
      var regexp = /^(www)/;
      if (regexp.exec(url)) {
        url = 'http://'+url;
      }
      return $.ajax({
        type : "POST",
        url : "php-tools/getTitle.php",
        data : {
            'url' : url
        }
      });
    },

    /**
     * Call to The Movie Database API in order to get infos about a movie
     * @param  {string} movie  Name of the movie
     */
    getMovie: function(movieTitle) {
      movieTitle = encodeURI(movieTitle);
      var url = 'http://api.themoviedb.org/3/search/movie?query='+movieTitle+'&api_key='+config.TMDB_api_key;

      return $.ajax({
        type : "GET",
        url : url,
        dataType: "jsonp",       
      });

    },


};
 
