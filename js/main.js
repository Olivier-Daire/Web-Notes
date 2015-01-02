
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

      $('button[type="submit"]').on('click', function(e){
        e.preventDefault();

        var note = that.getNote($(this).closest('form'));
        that.saveNote(note);
        that.clearForm();
        that.displaySingleNote(note);
      });


      $('#dropbox').on('click', $.proxy(function(){

        var id = this.createJSONfile($.parseJSON(localStorage.getItem("WebNotes")));
        // FIXME permission denied on univ server
        Dropbox.save("https://etudiant.univ-mlv.fr/~odaire/WebNotes/temp/WebNotes-"+id+".json", "WebNotes");
          
      }, this));

      $('#delete').on('click', $.proxy(function(){
        if (confirm("All notes will be deleted, are you sure ?")) {
          this.deleteNotes();
        }
      }, this));

      $(document).on('click', '.note button.delete', function(){
        var id = $(this).parent().attr('id');
        id = id.substr(5, id.length);
        that.deleteSingleNote(id);
      });

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

      $('#order').on('click', $.proxy(function(e){
        e.preventDefault();
        this.reverseOrder();
      }, this));
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

          $('#main').append(
            '<div id="note-'+i+'" class="note">'+
              '<h2>'+notes[i].title+'</h2>'+
              '<p>'+notes[i].content+'</p>'+
              '<div>'+ tags +'</div>'+
              '<i>'+notes[i].date+' - '+notes[i].time+'</i>'+
              '<button class="edit">Edit</button>'+
              '<button class="delete">Delete</button>'+
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

      if (this.options.defaultSort === "older") {
        $('#main').append(
          '<div id="note-'+notesLength+'" class="note">'+
            '<h2>'+note.title+'</h2>'+
            '<p>'+note.content+'</p>'+
            '<div>'+ tags +'</div>'+
            '<i>'+note.date+' - '+note.time+'</i>'+
            '<button class="edit">Edit</button>'+
            '<button class="delete">Delete</button>'+
          '</div>'
        );  
      }else{
        $('#main').prepend(
          '<div id="note-'+notesLength+'" class="note">'+
            '<h2>'+note.title+'</h2>'+
            '<p>'+note.content+'</p>'+
            '<div>'+ tags +'</div>'+
            '<i>'+note.date+' - '+note.time+'</i>'+
            '<button class="edit">Edit</button>'+
            '<button class="delete">Delete</button>'+
          '</div>'
        );
      }
      
      if (note.url) {
        this.generateWidget(notesLength, note.url);
      }
    },

    /**
     * Delete all notes
     */
    deleteNotes: function() {
      localStorage.removeItem("WebNotes");
      $('div[id^="note-"]').remove();
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
      var s = today.getSeconds();

      today = dd+'/'+mm+'/'+yyyy;

      var time = h + 'h' + m + 'min' + s + 's';

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
     * Ajax request to generate a JSON file through a PHP script
     * @param  {JSON} notes    object containing all notes
     */
    createJSONfile: function(notes) {
      // TODO GET unique ID from php and return it
      $.ajax({
        type : "POST",
        url : "php-tools/json.php",
        dataType : 'json', 
        data : {
            json : JSON.stringify(notes)
        },
        error: function(data){
          console.log('Error generating JSON');
          console.log(data);
        },
        success: function(data){
          return data;
        }
      });
    },

    /**
     * Display all notes in reverse order : old ones first
     */
    reverseOrder: function() {
      $('#main > div').each(function() {
        $(this).prependTo(this.parentNode);
      });
    },


    /**
     * Check for an URL inside a string
     * @param  {string} s 
     * @return {string}   Matched URL
     */
    containsURL: function(s) {
      var regexp = /(http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
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

      switch (regexp.exec(s)[0]) {
        case 'youtube.com':
        case 'youtu.be':
          s = this.getYoutubeId(s);
          var iframe = '<iframe id="" type="text/html" width="640" height="390" src="http://www.youtube.com/embed/'+s+'" frameborder="0"/>';
          $('#note-'+id).prepend(iframe);
        break;

        case 'soundcloud.com':
          SC.initialize({
            client_id: config.SoundCloud_client_id
          });

          var track_url = s;
          SC.oEmbed(track_url, { auto_play: false, show_comments: false }, function(oEmbed) {
            $('#note-'+id).prepend(oEmbed.html);
          });
        break;

        case 'imdb.com':
          var movieTitle = this.getTitleFromUrl(s);
          var that = this;

          movieTitle.success(function(movieTitle){
            // Remove year from title 
            var regex = /(\(.*\))/;
            movieTitle = movieTitle.replace(regex.exec(movieTitle)[0], '');

            var movie = that.getMovie(movieTitle);
            movie.success(function(movie){
              var url = 'http://image.tmdb.org/t/p/w342'+movie.results[0].poster_path;

              // Append the image
              var img = '<img src="'+url+'" alt="">';
              $('#note-'+id).prepend(img);

              // Change note url to image URL instead of IMDB's one
              // so that there is juste one API call (first time the note is saved)
              notes = $.parseJSON(localStorage.getItem("WebNotes"));
              notes[id].url = url;
              notes = JSON.stringify(notes);
              localStorage.setItem("WebNotes", notes);
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
              $('#note-'+id).prepend(img);

              // Change note url to image URL instead of Allocine's one
              // so that there is juste one API call (first time the note is saved)
              notes = $.parseJSON(localStorage.getItem("WebNotes"));
              notes[id].url = url;
              notes = JSON.stringify(notes);
              localStorage.setItem("WebNotes", notes);
            });
          });
        break;

        case 'jpeg':
        case 'jpg':
        case 'png':
        case 'gif':
          var img = '<img src="'+s+'" alt="">';
          $('#note-'+id).prepend(img);
        break;
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
      var path;

     return $.ajax({
        type : "GET",
        url : url,
        dataType: "jsonp",       
      });

    },


};
 
