
var noteManager = function (options) {
    this.parameters = options;
    this.defaults = {
        option: 'value'
    };
};
 
noteManager.prototype = {
    
    init: function () {
      // merge defaults options and user's ones
      this.options = $.extend({}, this.defaults, this.parameters);
      this.plugEvents();
    },
 
    plugEvents: function () {

        this.displayNotes();
       
        $('button[type="submit"]').on('click', $.proxy(function(e){
          e.preventDefault();

          var note = this.getNote();
          this.saveNote(note);
          this.clearForm();
          this.displaySingleNote(note);
          
        }, this));


        $('#dropbox').on('click',  $.proxy(function(e){

          var id = this.createJSONfile($.parseJSON(localStorage.getItem("WebNotes")));
          // FIXME permission denied on univ server
          Dropbox.save("https://etudiant.univ-mlv.fr/~odaire/WebNotes/temp/WebNotes-"+id+".json", "WebNotes");
          
        }, this));

        $('#delete').on('click', $.proxy(function(){
          this.deleteNotes();
        }, this));


        var that = this;
        $(document).on('click', '.note button.delete', function(){
          var id = $(this).parent().attr('id');
          id = id.substr(5, id.length);
          that.deleteSingleNote(id);
        });
    },

    /**
     * Get form data and return it as a JSON object
     * @return {JSON}   Note as JSON object  
     */
    getNote: function () {
      var title = $('form .title').val(),
          content = $('form textarea').val(),
          today = this.formatDate(),
          date = today[0],
          time = today[1],
          tags = this.formatTags($('form .tags').val());

      var note = this.formatNote(title, content, date, time, tags);
      return note;
    },

    /**
     * Format note to JSON with form data
     * @param  {string} title     Note title
     * @param  {string} content   Note text content
     * @param  {string} date      Note date 
     * @param  {string} time      Note hour
     * @param  {string} tags      Note tags
     * @return {JSON}             Note as JSON object
     */
    formatNote: function (title, content, date, time, tags) {
      var note = {
            "title": title,
            "content": content,
            "date": date,
            "time": time,
            "tags": tags,
          };

      return note;
    },

    /**
     * If notes already exist in local storage, add the new one and save
     * else create the object and save it in local storage.
     * @param  {JSON}
     */
    saveNote: function (note) {
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
    displayNotes: function () {
      if (localStorage.getItem("WebNotes") !== null) {

        var notes = $.parseJSON(localStorage.getItem("WebNotes"));
        var tags;

        for (var i = notes.length-1 ; i >= 0; i--) {
          for (var j = 0; j < notes[i].tags.length; j++) {
            if (j === 0 ) {
              tags = '<span id="tag-'+j+'">' + notes[i].tags[j] + '</span>';
            }else{
              tags = tags + ' <span id="tag-'+j+'">' + notes[i].tags[j] + '</span>';
            }
          }

          $('#main').append(
            '<div id="note-'+i+'" class="note">'+
              '<h2>'+notes[i].title+'</h2>'+
              '<p>'+notes[i].content+'</p>'+
              '<div>'+ tags +'</div>'+
              '<i>'+notes[i].date+' - '+notes[i].time+'</i>'+
              '<button class="delete">Delete</button>'+
            '</div>'
          );
        }

      }
    },

    /**
     * Display a single note
     * @param {JSON} note
     */
    displaySingleNote: function (note) {
      var tags;
      var notesLength = $.parseJSON(localStorage.getItem("WebNotes")).length;
      notesLength = notesLength-1; // Number of next note

      for (var j = 0; j < note.tags.length; j++) {
          if (j === 0 ) {
            tags = '<span id="tag-'+j+'">' + note.tags[j] + '</span>';
          }else{
            tags = tags + ' <span id="tag-'+j+'">' + note.tags[j] + '</span>';
          }
      }

       $('#main').prepend(
            '<div id="note-'+notesLength+'" class="note">'+
              '<h2>'+note.title+'</h2>'+
              '<p>'+note.content+'</p>'+
              '<div>'+ tags +'</div>'+
              '<i>'+note.date+' - '+note.time+'</i>'+
              '<button class="delete">Delete</button>'+
            '</div>'
        );
    },

    /**
     * Delete all notes
     */
    deleteNotes: function () {
      localStorage.removeItem("WebNotes");
    },

    /**
     * Delete a single note
     * @param  {int} id  ID of the note to be deleted
     */
    deleteSingleNote: function (id) {
      var notes = $.parseJSON(localStorage.getItem("WebNotes"));
      if (id != -1) {
        notes.splice(id, 1);
        notes = JSON.stringify(notes);
        localStorage.setItem("WebNotes", notes);
        $('#note-'+id+'').remove();
      }
    },

    clearForm: function () {
      $('form input.title, form textarea').val('');
      $('div.tagsinput span').remove();
    },

    /**
     * Get current date and time and format it
     * @return {array}    containing current date and hour
     */
    formatDate: function () {
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
    formatTags: function (tags) {
      var tagsArray = tags.split(',');

      return tagsArray;
    },

    /**
     * Ajax request to generate a JSON file through a PHP script
     * @param  {JSON} notes    object containing all notes
     */
    createJSONfile: function (notes) {
      // TODO GET unique ID from php and return it
      $.ajax({
        type : "POST",
        url : "json.php",
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
};
