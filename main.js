
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
          this.displayNotes();
          
        }, this));

    },

    /**
     * Get form data
     * @return {JSON}
     */
    getNote: function () {
      var title = $('form .title').val();
      var content = $('form textarea').val();
      var today = this.formatDate();
      var date = today[0];
      var time = today[1];

      var note = this.formatNote(title, content, date, time);
      return note;
    },

    /**
     * Format note to JSON with form data
     * @param  {string}
     * @param  {string}
     * @param  {string}
     * @param  {string}
     * @return {JSON}
     */
    formatNote: function (title, content, date, time) {
      var note = {
            "title": title,
            "content": content,
            "date": date,
            "time": time,
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

    displayNotes: function () {
      if (localStorage.getItem("WebNotes") !== null) {
        var notes = $.parseJSON(localStorage.getItem("WebNotes"));
        console.log(notes[0]);
        for (var i = 0; i < notes.length; i++) {
          $('body').append(
            '<div id="'+i+'"><h2>'+notes[i].title+'</h2><p>'+notes[i].content+'</p><i>'+notes[i].date+' - '+notes[i].time+'</i></div>'
          );
        }
      }


    },

    /**
     * Get current date and time and format it
     * @return {array}
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
    
};
 

 
