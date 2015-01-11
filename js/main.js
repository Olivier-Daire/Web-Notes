
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
      $('button[type="submit"]').on('click', function(e){
        e.preventDefault();

        var note = that.getNote($(this).closest('form'));
        that.saveNote(note);
        that.clearForm();
        that.displaySingleNote(note);
      });

      /* Export to Dropbox
       * /!\ Can't generate a file on univ server
       *     Can't save a file from localhost (Dropbox need access to the server)
       */
      $('#dropbox-export').on('click', $.proxy(function(){

        if (Dropbox.isBrowserSupported()) {

          var id = this.createJSONfile(localStorage.getItem("WebNotes"));
          var that = this;

          id.success(function(id){
            var today = that.formatDate(),
            date = today[0],
            dropboxOptions = {
              files: [
                  {'url': 'http://localhost/Web-Notes/temp/WebNotes-'+id+'.json', 'filename': 'WebNotes_'+date+'.json'},
              ],
              success: function () {
                console.log('success');
              },
              error: function (errorMessage) {
                console.log('Error when saving to Dropbox: '+errorMessage);
              }
            };

            Dropbox.save(dropboxOptions);
            //Dropbox.save("http://localhost/Web-Notes/temp/WebNotes-"+id+".json", "WebNotes");
          });

          id.error(function(){
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

      // Delete all notes
      $('#delete').on('click', $.proxy(function(){
        if (confirm("All notes will be deleted, are you sure ?")) {
          this.deleteNotes();
        }
      }, this));

      // Delete a note
      $(document).on('click', '.note button.delete', function(){
        if (confirm("All notes will be deleted, are you sure ?")) {
          var id = $(this).parent().attr('id');
          id = id.substr(5, id.length);
          that.deleteSingleNote(id); 
        }
      });

      // Edit a note
      $(document).on('click', '.note button.edit', function(){
        var id = $(this).parent().attr('id');
        id = id.substr(5, id.length);
        that.editNote(id);
      });

      // Only when editing a note
      $(document).on('click', '.note button[type="submit"]', function(e){
        e.preventDefault();

        var note = that.getNote($(this).closest('form'));
        that.saveNote(note);

        var id = $(this).closest('form').parent().attr('id');
        id = id.substr(5, id.length);
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
        that.sortByTag(tag);
      });

     

      $('#tagsIcon').on('mouseenter', $.proxy(function(){
        var tags = this.getAllTags();

        if (tags) {
          var html = this.displayAllTags(tags);  

          if (html !== '') {
            $('#tagsButton').html(html);
          }
        }
        
      }, this));

      $('#searchIcon input').on('keyup', function(){
        var value = $(this).val();
        $('div.note').hide();
        $('div.note:contains("'+value+'")').show();
      });
    },


    /******************
      CORE FUNCTIONS
    ******************/

    /**
     * Get form data and return it as a JSON object
     * @param {HTML Object} form   The form generating this note
     * @return {JSON}   Note as JSON object  
     */
    getNote: function(form) {
      var title = form.find('.title').val(),
          content = form.find('textarea').val(),
          url = this.containsURL(content);
          today = this.formatDate(),
          date = today[0],
          time = today[1],
          tags = this.formatTags(form.find('.tags').val());

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
            regexp = /^(www)/;
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

          $('#main').append(
            '<div id="note-'+i+'" class="note '+notes[i].type+'">'+
              '<h2>'+notes[i].title+'</h2>'+
              '<p>'+notes[i].content+'</p>'+
              '<div class="tools">'+ tags +'</div>'+
              '<i>'+notes[i].date+' - '+notes[i].time+'</i>'+
              '<button class="toolsButton edit"></button>'+
              '<button class="toolsButton delete"></button>'+
            '</div>'
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
        regexp = /^(www)/;
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

      var noteHTML =  '<div id="note-'+notesLength+'" class="note">'+
                        '<h2>'+note.title+'</h2>'+
                        '<p>'+note.content+'</p>'+
                        '<div class="tools">'+ tags +'</div>'+
                        '<i>'+note.date+' - '+note.time+'</i>'+
                        '<button class="toolsButton edit"></button>'+
                        '<button class="toolsButton delete"></button>'+
                      '</div>';

      if (this.options.defaultSort === "older") {
        $('#main').append(noteHTML);  
      }else{
        $('#takeNotes').after(noteHTML);
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
      $('#tagsButton').html('You have currently no notes with a tag, add tags to your notes !');
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

     $('#note-'+id).html(
        '<form>'+
          '<input type="text" class="title" value="'+note.title+'">'+
          '<textarea>'+note.content+'</textarea>'+
          '<input name="tags" class="tags" value="'+note.tags+'" />'+
          '<button type="submit">Save</button>'+
        '</form>'
      );

     $('.tags').tagsInput();
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
     * Show the notes containing the selecetd tag
     * @param  {string} tag 
     */
    sortByTag: function(tag){
      // Hide all notes and then show only the ones with the selected tag
      $('div.note').hide();
      $('div.note .tools span:contains("'+tag+'")').parent().parent().show();
    },

    /******************
     TOOLKIT FUNCTIONS
    ******************/

    clearForm: function() {
      $('form input.title, form textarea').val('');
      $('div.tagsinput span').remove();
    },

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
      // TODO GET unique ID from php and return it
      return $.ajax({
        type : "POST",
        url : "php-tools/json.php",
        data : {
            json : (notes)
        }
      });
    },

    /**
     * Display all notes in reverse order : old ones first
     */
    reverseOrder: function() {
      $('#main > div:not(#takeNotes)').each(function() {
        $(this).prependTo(this.parentNode);
      });
      $('#main').prepend($('#takeNotes'));
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

      if (regexp.exec(s)) {
        switch (regexp.exec(s)[0]) {
          case 'youtube.com':
          case 'youtu.be':
            s = this.getYoutubeId(s);
            var iframe = '<iframe id="" type="text/html" src="http://www.youtube.com/embed/'+s+'" frameborder="0"/>';
            $('#note-'+id+' h2').after(iframe);
            
            // Add type to note
            notes = $.parseJSON(localStorage.getItem("WebNotes"));
            notes[id].type = "video";
            notes = JSON.stringify(notes);
            localStorage.setItem("WebNotes", notes);

            $('#note-'+id).addClass("medium video");
          break;

          case 'soundcloud.com':
            SC.initialize({
              client_id: config.SoundCloud_client_id
            });

            var track_url = s;
            SC.oEmbed(track_url, { auto_play: false, show_comments: false }, function(oEmbed) {
              $('#note-'+id+' h2').after(oEmbed.html);
              $('#note-'+id).addClass("sound");
            });

            // Add type to note
            notes = $.parseJSON(localStorage.getItem("WebNotes"));
            notes[id].type = "sound";
            notes = JSON.stringify(notes);
            localStorage.setItem("WebNotes", notes);

          break;

          case 'imdb.com':
            var movieTitle = this.getTitleFromUrl(s);
            var that = this;

            movieTitle.success(function(movieTitle){
              // Remove year from title 
              var regex = /(\(.*\))/;
              movieTitle = movieTitle.replace(regex.exec(movieTitle)[0], '');

              $('#note-'+id).addClass("note small imdb");

              var movie = that.getMovie(movieTitle);
              movie.success(function(movie){
                var url = 'http://image.tmdb.org/t/p/w342'+movie.results[0].poster_path;

                // Append the image
                var img = '<img src="'+url+'" alt="">';
                $('#note-'+id+' h2').after(img);

                // Change note url to image URL instead of IMDB's one
                // so that there is juste one API call (first time the note is saved)
                notes = $.parseJSON(localStorage.getItem("WebNotes"));
                notes[id].url = url;
                notes[id].type = "movie";
                notes = JSON.stringify(notes);
                localStorage.setItem("WebNotes", notes);

                $('#note-'+id).addClass("movie");
              });
            });
          break;

          case 'allocine.fr':
            var movieTitle = this.getTitleFromUrl(s);
            var that = this;

            movieTitle.success(function(movieTitle){
              var movie = that.getMovie(movieTitle);

              movie.success(function(movie){
                var url = 'http://image.tmdb.org/t/p/w342'+movie.results[0].poster_path;
                
                // Append the image
                var img = '<img src="'+url+'" alt="">';
                $('#note-'+id+' h2').after(img);

                // Change note url to image URL instead of Allocine's one
                // so that there is juste one API call (first time the note is saved)
                notes = $.parseJSON(localStorage.getItem("WebNotes"));
                notes[id].url = url;
                notes[id].type = "movie";
                notes = JSON.stringify(notes);
                localStorage.setItem("WebNotes", notes);

                $('#note-'+id).addClass("small movie");
              });
            });
          break;

          case 'jpeg':
          case 'jpg':
          case 'png':
          case 'gif':
            var img = '<img src="'+s+'" alt="">';
            $('#note-'+id+' h2').after(img);

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

              $('#note-'+id+' img').load(function(){
                var imgWidth = $(this).width();
                if(imgWidth>700){
                  $('#note-'+id).addClass("large image");
                }else if(imgWidth>400){
                  $('#note-'+id).addClass("medium image");
                }else if(imgWidth>256){
                  $('#note-'+id).addClass("small image");
                }else{
                  $('#note-'+id).addClass("small image noresize");
                }
              });
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
      url = url.replace(/(>|<)/gi,'').split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
      if(url[2] !== undefined) {
        ID = url[2].split(/[^0-9a-z_]/i);
        ID = ID[0];
      }else{
        ID = url;
      }
        return ID;
    },

    /**
     * Get the movie title from an IMDB/Allocine URL
     * @param  {strin} url  Webpage url
     */
    getTitleFromUrl: function(url) {
      // If link starts with www add protocol (http) to it
      regexp = /^(www)/;
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
 
