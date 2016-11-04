/* CODE BEGIN */

// Initialize Vue when the document is ready to be manipulated
jQuery(document).ready(function($) {
    // Shorthand for localization
    function loc(text) {
        return foswiki.jsi18n.get('timetracker', text);
    }

    // Template for one activity
    var ActivityComponent = Vue.extend({
        props: ['activity', 'index', 'totaltime', 'currentms', 'settings'],
        data: function () {
            var dur = moment.duration(this.activity.correction);
            return {
                "edit": {
                    "ticket": this.activity.ticket.subject,
                    "type": this.activity.type.name,
                    "comment": this.activity.comment.text,
                    "sendComment": this.activity.comment.sendToRedmine,
                    "correction": {
                        "hours": Math.floor(dur.asHours()),
                        "minutes": dur.minutes(),
                        "seconds": dur.seconds()
                    }
                },
                "editingTimeSpans": false // Edit mode for time spans
            }
        },
        template:
            '<tr id="activity{{ activity.id }}" @click="toggleDetails()" :class="{\'booked-redmine\': activity.booked.inRedmine, \'booked-manually\': activity.booked.manually, \'running\': totaltime.running}">'+
                '<td>{{ activity.project.name }}</td>'+
                '<td>{{ activity.ticket.subject }}</td>'+
                '<td>{{ activity.type.name }}</td>'+
                '<td>{{ activity.comment.text }}</td>'+
                '<td>'+
                    '<p v-if="activity.booked.inRedmine"><span class="label booked-redmine">'+loc('Booked in Redmine')+'</span></p>'+ // TODO Redmine Integration
                    '<p v-else>'+
                        '<input type="submit" class="foswikiSubmit" @click.stop.prevent="bookInRedmine()" value="'+loc('Book in Redmine')+'">'+
                        '<input v-if="activity.booked.manually" input type="submit" class="foswikiSubmit" @click.stop.prevent="unbook()" value="'+loc('Unbook')+'">'+
                        '<input v-else @click.stop="book()" type="submit" class="foswikiSubmit" value="'+loc('Book')+'">'+
                    '</p>'+
                    '<p><span>'+loc('Including comment')+': </span><input type="checkbox" v-model="activity.comment.sendToRedmine" disabled/></p>'+
                '</td>'+
                '<td>{{ totaltime.hours }}:{{ totaltime.minutes }}:{{ totaltime.seconds }}<br/>{{ totaltime.totalHours }}h</td>'+
                '<td>'+
                    // Depending on whether theres a running timer this button is either a play or a stop button
                    '<button v-if="!activity.booked.inRedmine && !activity.booked.manually" :class="totaltime.running ? \'fa fa-fw fa-lg fa-pause\' : \'fa fa-fw fa-lg fa-play\'" @click.stop="totaltime.running ? stop() : start()"></button>'+
                '</td>'+
            '</tr>'+
            '<tr class="details hidden">'+
                '<td colspan="7">'+
                    '<div v-if="!activity.booked.inRedmine && !activity.booked.manually" class="edit">'+
                        '<form @submit.prevent="saveEdit()">'+
                            '<div class="table">'+
                                '<label class="row"><span class="cell">'+loc('Ticket')+'</span><input type="text" class="cell" id="ticket" v-model="edit.ticket"></label>'+
                                '<label class="row"><span class="cell">'+loc('Type')+'</span><select class="cell" id="type" v-model="edit.type"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></label>'+
                                '<label class="row"><span class="cell">'+loc('Comment')+'</span><input type="text" class="cell" id="comment" v-model="edit.comment"></label>'+
                                '<label class="row"><span class="cell">'+loc('Send comment')+'</span><input type="checkbox" class="cell" id="sendComment" v-model="edit.sendComment"></label>'+
                                '<label class="row"><span class="cell">'+loc('Correction')+'</span><input type="number" class="small" v-model="edit.correction.hours" number>h  :  <input type="number" class="small" v-model="edit.correction.minutes" number>m</label>'+
                                '<div class="row">'+
                                    '<input type="submit" class="foswikiSubmit cell" value="'+loc('Save edit')+'">'+
                                    '<div class="cell">'+
                                        '<input type="submit" class="foswikiButton" @click.stop.prevent="cancelEdit()" value="'+loc('Cancel edit')+'">'+
                                        '<input type="submit" class="foswikiButtonCancel" @click.stop.prevent="delete()" value="'+loc('Delete activity')+'">'+
                                    '</div>'+
                                '</div>'+
                            '</div>'+
                        '</form>'+
                    '</div>'+
                    '<div v-else class="edit"></div>'+
                    '<div>'+
                        '<table>'+
                            '<thead>'+
                                '<tr><th>'+loc('From')+'</th><th></th><th>'+loc('To')+'</th><th>'+loc('Duration')+'</th></tr>'+
                            '</thead>'+
                            '<tbody>'+
                                '<tr v-show="editingTimeSpans" v-for="timeSpan in activity.timeSpans">'+
                                    '<td><input type="number" v-model="timeSpan.startTime" step="60000" number></td>'+
                                    '<td>-</td>'+
                                    '<td>'+
                                        '<input v-if="timeSpan.endTime > 0" type="number" v-model="timeSpan.endTime" step="60000" number>'+
                                        '<input v-else value="running" disabled>'+
                                    '</td>'+
                                    '<td>{{ showDuration(timeSpan.endTime > 0 ? (timeSpan.endTime - timeSpan.startTime) : (currentms - timeSpan.startTime))}}</td>'+
                                '</tr>'+
                                '<tr v-show="!editingTimeSpans" v-for="timeSpan in activity.timeSpans">'+
                                    '<td>{{ showTime(timeSpan.startTime) }}</td>'+
                                    '<td>-</td>'+
                                    '<td>{{ timeSpan.endTime > 0 ? showTime(timeSpan.endTime) : "running" }}</td>'+
                                    '<td>{{ showDuration(timeSpan.endTime > 0 ? (timeSpan.endTime - timeSpan.startTime) : (currentms - timeSpan.startTime))}}</td>'+
                                '</tr>'+
                            '</tbody>'+
                        '</table>'+
                        '<input v-show="!editingTimeSpans && !activity.booked.inRedmine && !activity.booked.manually" type="submit" class="foswikiButton" @click.stop.prevent="editTimeSpans()" value="'+loc('Edit timespans')+'">'+
                        '<input v-show="editingTimeSpans" type="submit" class="foswikiSubmit" @click.stop.prevent="saveTimeSpans()" value="'+loc('Save edit')+'">'+
                        '<input v-show="editingTimeSpans" type="submit" class="foswikiButtonCancel" @click.stop.prevent="cancelTimeSpans()" value="'+loc('Cancel edit')+'">'+
                    '</div>'+
                '</td>'+
            '</tr>',
        methods: {
            // This starts a new timeSpan for the corresponding activity
            start: function () {
                // Stop every running timer if this setting is activated
                var updated = [];
                if(this.settings.onlyOneRunning) {
                    updated = this.$root.stopAll();
                }
                updated.push(this.activity);
                // Start a new Timer for this activity
                this.activity.timeSpans.push({
                    "startTime": moment().valueOf(), // Current time as start
                    "endTime": 0 // Running timer, so no end
                });
                this.$root.update();
                this.$root.sendToRest("set", {activities: updated, settings: []});
            },
            // This stops every running timeSpan for the corresponding activity
            stop: function () {
                for(var i=0; i < this.activity.timeSpans.length; i++) {
                    if(this.activity.timeSpans[i].endTime === 0) { // This timeSpan is running
                        this.activity.timeSpans[i].endTime = moment().valueOf(); // Stop the timeSpan by settings its endTime
                    }
                }
                this.$root.sendToRest("set", {activities: [this.activity], settings: []});
            },
            // Save the edited data to the activity
            saveEdit: function () {
                if(this.edit.ticket !== "" || this.edit.type !== "" || this.edit.comment !== "" || this.settings.allowEmptyActivity) { // Prevent empty activity unless setted otherwise
                    // Setting this.activity to a new object does not work
                    this.activity.ticket.subject = this.edit.ticket;
                    this.activity.type.name = this.edit.type;
                    this.activity.comment.sendToRedmine = this.edit.sendComment;
                    this.activity.comment.text = this.edit.comment;
                    this.activity.correction = ((((this.edit.correction.hours * 60) + this.edit.correction.minutes) * 60) + this.edit.correction.seconds) * 1000;
                    this.$root.sendToRest("set", {activities: [this.activity], settings: []});
                    this.toggleDetails();
                }
            },
            // Cancel the edit and reset the input fields
            cancelEdit: function () {
                var dur = moment.duration(this.activity.correction);
                this.edit.ticket = this.activity.ticket.subject,
                this.edit.type = this.activity.type.name,
                this.edit.comment = this.activity.comment.text,
                this.edit.sendComment = this.activity.comment.sendToRedmine,
                this.edit.correction.hours = Math.floor(dur.asHours());
                this.edit.correction.minutes = dur.minutes();
                this.edit.correction.seconds = dur.seconds();
            },
            // Delete this Activity
            delete: function () {
                this.$root.sendToRest("deleteActivities", {activities: [this.activity]});
            },
            // Book in Redmine
            bookInRedmine: function () {
                this.activity.booked.inRedmine = true; // TODO Send to Redmine and update status upon response
                this.stop();
                // sendToRest is done in stop()
            },
            // Mark as booked manually
            book: function () {
                this.activity.booked.manually = true;
                this.stop();
                // sendToRest is done in stop()
            },
            unbook: function () {
                this.activity.booked.manually = false;
                this.$root.sendToRest("set", {activities: [this.activity], settings: []});
            },
            // This toggles the display of the detailed view of an activity
            toggleDetails: function () {
                this.$el.nextElementSibling.nextElementSibling.classList.toggle("hidden");
            },
            // Editing the timeSpans
            editTimeSpans: function () {
                this.editingTimeSpans = true;
            },
            saveTimeSpans: function () {
                this.$root.sendToRest("set", {activities: [this.activity], settings: []});
                this.editingTimeSpans = false;
            },
            cancelTimeSpans: function () {
                this.$root.sendToRest("getToday", {});
                this.editingTimeSpans = false;
            },
            // Wrapper to access moment() in inline statements
            showTime: function (ms) {
                return moment(ms).format("HH:mm"); // HH is 24, hh is 12 system
            },
            showDuration: function(ms) {
                var dur = moment.duration(ms);
                var hours = dur.asHours() < 10 ? "0"+Math.floor(dur.asHours()) : Math.floor(dur.asHours());
                var minutes = dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes();
                var seconds = dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds();
                return hours+":"+minutes+":"+seconds;
            }
        }
    });

    // Template for the whole table listing the activities
    var ActivityTableComponent = Vue.extend({
        props: ['activities', 'totaltimes', 'saving', 'currentms', 'settings'],
        template:
            '<div id="activities">'+
                '<div v-if="saving.refused" id="refusedMessage">'+loc('The server refused to save the data. '+
                    'Please check if your date and time is correctly set and try again. '+
                    'Red marked activities contain unsaved data.')+
                '</div>'+
                '<div v-if="saving.errored && !saving.refused" id="errorMessage">'+loc('Something went wrong during saving the data in the topics meta data. '+
                    'Please have a look at the red marked activities and redo any edits/deletions. '+
                    'Alternatively you can reload the page to discard every unsaved changes and display the currently saved status.')+
                '</div>'+
                '<table>'+
                    '<thead>'+
                        '<tr><th>'+loc('Project')+'</th><th>'+loc('Ticket')+'</th><th>'+loc('Type')+'</th><th>'+loc('Comment')+'</th><th>'+loc('Status')+'</th><th>'+loc('Total time')+'</th><th>'+loc('Run')+'</th></tr>'+
                    '</thead>'+
                    '<tbody>'+
                        // Add a table row for each activity and apply the vue-activity template defined in ActivityComponent, needed values are passed with :val="val" attribute in parent and props: ['val'] entry in child
                        '<tr is="vue-activity" v-for="activity in activities" :activity="activity" :index="$index" :totaltime="totaltimes[activity.id]" :currentms="currentms" :settings="settings"></tr>'+
                    '</tbody>'+
                '</table>'+
                '<hr></hr>'+
                '<div id="total">'+
                    '<div>{{ totaltimes[0].hours }}:{{ totaltimes[0].minutes }}:{{ totaltimes[0].seconds }}<br/>{{ totaltimes[0].totalHours }}h</div>'+
                    '<div>'+loc('Todays total time')+':</div>'+
                '</div>'+
            '</div>',
        components: {
            'vue-activity': ActivityComponent
        }
    });

    // Template for adding a new activity
    var AddActivityComponent = Vue.extend({
        props: ['activities', 'settings', 'presets'],
        data: function () {
            return {
                "editingPresets": false, // Edit mode for presets
                "form" : { // Storage for the "new activity form" data
                    "project": {
                        "id": "",
                        "name": "",
                        "suggestions": []
                    },
                    "ticket": {
                        "id": "",
                        "subject": "",
                        "suggestions": []
                    },
                    "type": {
                        "id": "",
                        "name": "",
                        "suggestions": []
                    },
                    "comment": {
                        "sendToRedmine": true,
                        "text": ""
                    },
                    "justSet": false
                }
            }
        },
        template:
            '<div id="addActivity">'+
                '<form @submit.prevent="addActivity()">'+
                    '<div class="table">'+
                        '<label :class="{row: true, validated: form.project.id !== \'\'}"><span class="cell">'+loc('Project')+'</span><input type="text" class="cell" v-model="form.project.name" debounce="500" list="projectList" id="project"></label>'+
                        '<datalist id="projectList"><option v-for="suggestion in form.project.suggestions" :value="\'#\'+suggestion.id+\'  \'+suggestion.name"></datalist>'+
                        '<label :class="{row: true, validated: form.ticket.id !== \'\'}"><span class="cell">'+loc('Ticket')+'</span><input type="text" class="cell" v-model="form.ticket.subject" debounce="500" list="ticketList" id="ticket"></label>'+
                        '<datalist id="ticketList"><option v-for="suggestion in form.ticket.suggestions" :value="\'#\'+suggestion.id+\'  \'+suggestion.subject"></datalist>'+
                        '<label :class="{row: true, validated: form.type.id !== \'\'}"><span class="cell">'+loc('Type')+'</span><select class="cell" v-model="form.type.name" id="type"><option v-for="suggestion in form.type.suggestions" :value="suggestion.name">{{ suggestion.name }}</option></select></label>'+
                        '<label class="row"><span class="cell">'+loc('Comment')+'</span><input type="text" class="cell" v-model="form.comment.text" id="comment"></label>'+
                        '<label class="row"><span class="cell">'+loc('Send comment')+'</span><input type="checkbox" class="cell" v-model="form.comment.sendToRedmine"></label>'+
                        '<p class="row"><span class="cell"><input type="submit" class="foswikiSubmit" value="'+loc('Add activity')+'"></span><span class="cell"><input type="submit" class="foswikiButton" @click.stop.prevent="saveAsPreset()" value="'+loc('Save as preset')+'"></span></p>'+
                    '</div>'+
                '</form>'+
                '<form @submit.prevent="">'+
                    '<fieldset>'+
                        '<legend><span>'+loc('Settings')+'</span></legend>'+
                        '<div class="table">'+
                            '<label class="row"><span class="cell">'+loc('Only one running timer')+'</span><input type="checkbox" class="cell" v-model="settings.onlyOneRunning"></label>'+
                            '<label class="row"><span class="cell">'+loc('Allow empty activity')+'</span><input type="checkbox" class="cell" v-model="settings.allowEmptyActivity"></label>'+
                        '</div>'+
                    '</fieldset>'+
                    '<fieldset>'+
                        '<legend><span>'+loc('Presets')+'</span><input type="submit" class="foswikiButton" @click.stop.prevent="toggleEditingPresets()" value="'+loc('Edit')+'"></legend>'+
                        '<ul>'+
                            '<li v-for="preset in presets">'+
                                '<input type="submit" class="foswikiButton" @click.stop.prevent="fromPreset(preset.id)" v-model="preset.presetName">'+
                                '    <input v-show="editingPresets" type="submit" class="foswikiButtonCancel" @click.stop.prevent="deletePreset(preset.id)" value="'+loc('Delete')+'">'+
                            '</li>'+
                        '</ul>'+
                    '</fieldset>'+
                '</form>'+
            '</div>',
        methods: {
            // Adds a new activity. If preset is defined from preset, otherwise from form
            addActivity: function (preset) {
                if(preset || this.form.project.name !== "" || this.form.ticket.subject !== "" || this.form.type.name !== "" || this.form.comment.text !== "" || this.settings.allowEmptyActivity) { // Prevent empty activity unless setted otherwise
                    var updated = [];
                    if(this.settings.onlyOneRunning) {
                        updated = this.$root.stopAll();
                    }
                    if(preset) {
                        // Create a deep copy of the preset to prevent call by reference
                        var newAct = {
                            "id": moment().valueOf(),
                            "project": {
                                "id": preset.project.id,
                                "name": preset.project.name
                            },
                            "ticket": {
                                "id": preset.ticket.id,
                                "subject": preset.ticket.subject
                            },
                            "type": {
                                "id": preset.type.id,
                                "name": preset.type.name
                            },
                            "comment": {
                                "sendToRedmine": preset.comment.sendToRedmine,
                                "text": preset.comment.text
                            },
                            "booked": {
                                "inRedmine": preset.booked.inRedmine,
                                "manually": preset.booked.manually
                            },
                            "correction": preset.correction,
                            "timeSpans": [
                                {
                                    "startTime": moment().valueOf(),
                                    "endTime": 0
                                }
                            ]
                        };
                    } else {
                        var newAct = {
                            "id": moment().valueOf(),
                            "project": { // TODO
                                "id": 125,
                                "name": this.form.project.name
                            },
                            "ticket": { // TODO
                                "id": 125,
                                "subject": this.form.ticket.subject
                            },
                            "type": {
                                "id": 125, // TODO
                                "name": this.form.type.name
                            },
                            "comment": {
                                "sendToRedmine": this.form.comment.sendToRedmine,
                                "text": this.form.comment.text
                            },
                            "booked": {
                                "inRedmine": false,
                                "manually": false
                            },
                            "correction": 0,
                            "timeSpans": [
                                {
                                    "startTime": moment().valueOf(),
                                    "endTime": 0
                                }
                            ]
                        };
                    }
                    this.activities.push(newAct);
                    this.form.project.id = "";
                    this.form.project.name = "";
                    this.form.project.suggestions = [];
                    this.form.ticket.id = "";
                    this.form.ticket.subject = "";
                    this.form.ticket.suggestions = [];
                    this.form.type.id = "";
                    this.form.type.name = "";
                    this.form.type.suggestions = [];
                    this.form.comment.sendToRedmine = true;
                    this.form.comment.text = "";
                    this.form.justSet = false;
                    updated.push(newAct);
                    this.$root.sendToRest("set", {activities: updated, settings: []});
                }
            },
            // Save the form input as preset
            saveAsPreset: function () {
                if(this.form.project.name !== "" || this.form.ticket.subject !== "" || this.form.type.name !== "" || this.form.comment.text !== "" || this.settings.allowEmptyActivity) { // Prevent empty activity unless setted otherwise
                    var presetName = prompt(loc("Please enter a name for this preset:"));
                    var preset = {
                        "id": moment().valueOf(),
                        "project": { // TODO
                            "id": 125,
                            "name": this.form.project.name
                        },
                        "ticket": { // TODO
                            "id": 125,
                            "subject": this.form.ticket.subject
                        },
                        "type": {
                            "id": 125, // TODO
                            "name": this.form.type.name
                        },
                        "comment": {
                            "sendToRedmine": this.form.comment.sendToRedmine,
                            "text": this.form.comment.text
                        },
                        "booked": {
                            "inRedmine": false,
                            "manually": false
                        },
                        "correction": 0,
                        "timeSpans": [],
                        "presetName": presetName
                    };
                    this.$root.sendToRest("set", {activities: [], settings: [{"id": preset.id, "name": preset.presetName, "value": preset}]});
                }
            },
            // Activate the activity matching this preset or add a new activity from this preset
            fromPreset: function (presetId) {
                var preset;
                for(var p in this.presets) {
                    if(this.presets[p].id === presetId) {
                        preset = this.presets[p];
                        break;
                    }
                }
                var matchingActivity = false;
                for(var a in this.activities) {
                    var act = this.activities[a];
                    if(act.ticket.subject === preset.ticket.subject && act.type.name === preset.type.name && act.comment.text === preset.comment.text && !act.booked.inRedmine && !act.booked.manually) {
                        // TODO add project and simplify by matching via ids
                        matchingActivity = act;
                    }
                }
                if(matchingActivity) {
                    $("#activity"+matchingActivity.id+" button").trigger('click');
                } else {
                    this.addActivity(preset);
                }
            },
            // Delete the preset
            deletePreset: function (presetId) {
                var preset;
                for(var p in this.presets) {
                    if(this.presets[p].id === presetId) {
                        preset = this.presets[p];
                        break;
                    }
                }
                this.$root.sendToRest("deleteSettings", {settings: [preset]});
            },
            // Toggle the display of editing options
            toggleEditingPresets: function () {
                this.editingPresets = !this.editingPresets;
            }
        },
        watch: {
            "form.project.name": function(newVal, oldVal) {
                if(this.form.justSet) {
                    // Quick exit if set by ticket
                    this.form.justSet = false;
                    return;
                }
                this.form.ticket.id = "";
                this.form.ticket.suggestions = [];
                this.form.project.id = "";
                this.form.type.id = "";
                this.form.type.suggestions = [];
                var re = /^#([\d]+) .+$/;
                if(newVal.match(re)) {
                    // Selected one of the suggestions, so query for project description
                    var projectId = Number(newVal.replace(re, "$1"));
                    this.form.project.id = projectId;
                    // Retrieve the corresponding activity types
                    $.ajax({
                        url: foswiki.getPreference('SCRIPTURL')+"/rest/RedmineIntegrationPlugin/search_redmine",
                        type: 'GET',
                        dataType: 'json',
                        data: {q: projectId, type: "activity"}
                    })
                    .done(function(result) {
                        this.form.type.suggestions = result;
                        this.form.type.name = this.form.type.suggestions[0].name;
                        this.form.type.id = this.form.type.suggestions[0].id;
                        this.form.justSet = true;
                        this.form.ticket.id = 0;
                        this.form.ticket.subject = loc("Book directly to project");
                    }.bind(this));
                }
                // Search for matching projects
                $.ajax({
                    url: foswiki.getPreference('SCRIPTURL')+"/rest/RedmineIntegrationPlugin/search_redmine",
                    type: 'GET',
                    dataType: 'json',
                    data: {q: newVal, type: "project"}
                })
                .done(function(result) {
                    this.form.project.suggestions = result.slice(0, 25); // Limiting the number of results
                }.bind(this));
            },
            "form.ticket.subject": function(newVal, oldVal) {
                if(this.form.justSet) {
                    // Quick exit if set by project
                    this.form.justSet = false;
                    return;
                }
                this.form.ticket.id = "";
                this.form.project.id = "";
                this.form.project.suggestions = [];
                this.form.type.id = "";
                this.form.type.suggestions = [];
                var re = /^#([\d]+) .+$/;
                if(newVal.match(re)) {
                    // Selected one of the suggestions, so query for project description
                    var ticketId = Number(newVal.replace(re, "$1"));
                    var projectId;
                    for(var i in this.form.ticket.suggestions) {
                        if(this.form.ticket.suggestions[i].id === ticketId) {
                            projectId = this.form.ticket.suggestions[i].project_id;
                        }
                    }
                    if(projectId) {
                        this.form.ticket.id = ticketId;
                        // Retrieve the corresponding project
                        $.ajax({
                            url: foswiki.getPreference('SCRIPTURL')+"/rest/RedmineIntegrationPlugin/search_redmine",
                            type: 'GET',
                            dataType: 'json',
                            data: {q: projectId, type: "project"}
                        })
                        .done(function(result) {
                            if(result.length === 1) {
                                this.form.justSet = true;
                                this.form.project.id = result[0].id;
                                this.form.project.name = result[0].name;
                            }
                        }.bind(this));
                        // Retrieve the corresponding activity types
                        $.ajax({
                            url: foswiki.getPreference('SCRIPTURL')+"/rest/RedmineIntegrationPlugin/search_redmine",
                            type: 'GET',
                            dataType: 'json',
                            data: {q: projectId, type: "activity"}
                        })
                        .done(function(result) {
                            this.form.type.suggestions = result;
                            this.form.type.name = this.form.type.suggestions[0].name;
                            this.form.type.id = this.form.type.suggestions[0].id;
                        }.bind(this));
                    }
                }
                // Search for matching tickets
                $.ajax({
                    url: foswiki.getPreference('SCRIPTURL')+"/rest/RedmineIntegrationPlugin/search_redmine",
                    type: 'GET',
                    dataType: 'json',
                    data: {q: newVal, type: "issue"}
                })
                .done(function(result) {
                    this.form.ticket.suggestions = result.slice(0, 25); // Limiting the number of results
                }.bind(this));
            },
            "form.type.name": function(newVal, oldVal) {
                this.form.type.id = "";
                for(var i in this.form.type.suggestions) {
                    if(this.form.type.suggestions[i].name === newVal) {
                        this.form.type.id = this.form.type.suggestions[i].id;
                    }
                }
            }
        }
    });

    // Template for showing an overview over multiple days
    var OverviewComponent = Vue.extend({
        props: ['currentms', 'days'],
        data: function () {
            return {
                "selection": {
                    "start": {
                        "year": 1970,
                        "month": 01,
                        "day": 01
                    },
                    "end": {
                        "year": moment().year(),
                        "month": (moment().month()+1), // Months start at 0 in moment
                        "day": moment().date()
                    },
                    "onlyRunning": false
                },
                "totalOfPeriod": {
                    "allDays": "",
                    "currentMonth": "",
                    "currentWeek": ""
                }
            }
        },
        computed: {
            totalOfDays: { // Calculates the total time spent per activity
                cache: true,
                get: function () {
                    var res = {};
                    var allTimeTotal = 0;
                    for(var d in this.days) {
                        if(this.days.hasOwnProperty(d)) {
                            var dayTotal = 0;
                            var running = false;
                            for(var a in this.days[d]) {
                                if(this.days[d].hasOwnProperty(a)) {
                                    var activityTotal = this.days[d][a].correction || 0;
                                    // Sum up the ms of each timeSpan
                                    for(var i in this.days[d][a].timeSpans) {
                                        if(this.days[d][a].timeSpans.hasOwnProperty(i)) {
                                            var span = this.days[d][a].timeSpans[i];
                                            if(span.endTime > 0) { // Existing endTime means the timer is not running
                                                activityTotal += (span.endTime - span.startTime); // Add stopped time diff
                                            } else {
                                                activityTotal += (this.currentms - span.startTime); // Add time diff since the startTime
                                                running = true;
                                            }
                                        }
                                    }
                                    dayTotal += activityTotal;
                                }
                            }
                            var dur = moment.duration(dayTotal);
                            res[d] = {
                                running: running,
                                totalms: dayTotal,
                                totalHours: dur.asHours().toFixed(4), // Decimal hours for Redmine
                                // Store each part of hh:mm:ss with a leading 0 if needed
                                hours: dur.asHours() < 10 ? "0"+Math.floor(dur.asHours()) : Math.floor(dur.asHours()),
                                minutes: dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes(),
                                seconds: dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds()
                            };
                            allTimeTotal += dayTotal;
                        }
                    }
                    var dur = moment.duration(allTimeTotal);
                    res[0] = {
                        totalms: allTimeTotal,
                        totalHours: dur.asHours().toFixed(4), // Decimal hours for Redmine
                        // Store each part of hh:mm:ss with a leading 0 if needed
                        hours: dur.asHours() < 10 ? "0"+Math.floor(dur.asHours()) : Math.floor(dur.asHours()),
                        minutes: dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes(),
                        seconds: dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds()
                    };
                    return res;
                }
            }
        },
        template:
            '<div id="daySelection">'+
                '<table>'+
                    '<thead>'+
                        '<tr>'+
                            '<th>'+loc('Time period')+'</th>'+
                            '<th>'+loc('Total time')+'</th>'+
                        '</tr>'+
                    '</thead>'+
                    '<tbody>'+
                        '<tr>'+
                            '<td>'+loc('All days')+'</td>'+
                            '<td>{{ totalOfPeriod["allDays"] }}</td>'+
                        '</tr>'+
                        '<tr>'+
                            '<td>'+loc('Current month')+'</td>'+
                            '<td>{{ totalOfPeriod["currentMonth"] }}</td>'+
                        '</tr>'+
                        '<tr>'+
                            '<td>'+loc('Current week')+'</td>'+
                            '<td>{{ totalOfPeriod["currentWeek"] }}</td>'+
                        '</tr>'+
                    '</tbody>'+
                '</table>'+
                '<form @submit.prevent="">'+
                    '<fieldset>'+
                        '<legend><span>'+loc('Select time period')+'</span></legend>'+
                        '<div class="table">'+
                            '<label class="row">'+
                                '<span class="cell">'+loc('Start date')+'</span>'+
                                '<input type="number" class="small" v-model="selection.start.day" min="1" max="31" number>.  '+
                                '<input type="number" class="small" v-model="selection.start.month" min="1" max="12" number>.  '+
                                '<input type="number" class="small" v-model="selection.start.year" min="1970" number>'+
                            '</label>'+
                            '<label class="row">'+
                                '<span class="cell">'+loc('End date')+'</span>'+
                                '<input type="number" class="small" v-model="selection.end.day" min="1" max="31" number>.  '+
                                '<input type="number" class="small" v-model="selection.end.month" min="1" max="12" number>.  '+
                                '<input type="number" class="small" v-model="selection.end.year" min="1970" number>'+
                            '</label>'+
                            '<label class="row">'+
                                '<span class="cell">'+loc('Only running')+'</span>'+
                                '<input type="checkbox" class="cell" v-model="selection.onlyRunning">'+
                            '</label>'+
                        '</div>'+
                    '</fieldset>'+
                '</form>'+
            '</div>'+
            '<div id="dayList">'+
                '<table>'+
                    '<thead>'+
                        '<tr>'+
                            '<th>'+loc('Date')+'</th>'+
                            '<th>'+loc('Total time')+'</th>'+
                        '</tr>'+
                    '</thead>'+
                    '<tbody>'+
                        '<tr v-for="(day, activities) in days" v-show="isInSelection(day)" :class="{\'running\': totalOfDays[day].running}">'+
                            '<td>{{ showDate(day) }}</th>'+
                            '<td>{{ totalOfDays[day].hours }}:{{ totalOfDays[day].minutes }}:{{ totalOfDays[day].seconds }}</td>'+
                        '</tr>'+
                    '</tbody>'+
                '</table>'+
            '</div>',
        methods: {
            // Sums up the total time from the start to the end date (including)
            // Params are formatted either as YYYYMMDD or as {year: YYYY, month: MM, day: DD}
            getSummedTimes: function (start, end) {
                var duration = 0;
                // Split day-string, if not already formatted
                if(start.year === undefined) {
                    var s = start.toString();
                    start = {
                        year: s[0]+s[1]+s[2]+s[3],
                        month: s[4]+s[5],
                        day: s[6]+s[7]
                    }
                    s = end.toString();
                    end = {
                        year: s[0]+s[1]+s[2]+s[3],
                        month: s[4]+s[5],
                        day: s[6]+s[7]
                    }
                }
                // Sum the total times for each day
                for(var year = start.year; year <= end.year; year++) {
                    var startMonth = year === start.year ? start.month : 1;
                    var endMonth = year === end.year ? end.month : 12;
                    for(var month = startMonth; month <= endMonth; month++) {
                        var startDay = year === start.year && month === start.month ? start.day : 1;
                        var endDay = year === end.year && month === end.month ? end.day : 31;
                        for(var day = startDay; day <= endDay; day++) {
                            if(this.totalOfDays.hasOwnProperty(""+year+month+day)) {
                                duration += this.totalOfDays[""+year+month+day].totalms;
                            }
                        }
                    }
                }
                var dur = moment.duration(duration);
                var hours = dur.asHours() < 10 ? "0"+Math.floor(dur.asHours()) : Math.floor(dur.asHours());
                var minutes = dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes();
                var seconds = dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds();
                return hours+":"+minutes+":"+seconds;
            },
            isInSelection: function (day) {
                if(this.selection.onlyRunning && !this.totalOfDays[day].running) {
                    // Not in selection, because theres no running timer for this day
                    return false;
                }
                var d = moment(day, "YYYYMMDD");
                if(this.selection.start.year > d.year() || (this.selection.start.year === d.year() && this.selection.start.month > (d.month()+1)) || (this.selection.start.year === d.year() && this.selection.start.month === (d.month()+1) && this.selection.start.day > d.date())) {
                    return false;
                }
                if(this.selection.end.year < d.year() || (this.selection.end.year === d.year() && this.selection.end.month < (d.month()+1)) || (this.selection.end.year === d.year() && this.selection.end.month === (d.month()+1) && this.selection.end.day < d.date())) {
                    return false;
                }
                return true;
            },
            showDate: function (s) {
                return s[6]+s[7]+"."+s[4]+s[5]+"."+s[0]+s[1]+s[2]+s[3];
            }
        },
        watch: {
            "totalOfDays": function(newVal, oldVal) {
                this.totalOfPeriod.allDays = this.totalOfDays[0].hours+":"+this.totalOfDays[0].minutes+":"+this.totalOfDays[0].seconds;
                this.totalOfPeriod.currentMonth = this.getSummedTimes(moment().format("YYYYMM")+"01", moment().format("YYYYMM")+"31");
                var weekStartDate = Number(moment().format("YYYYMMDD")) - Number(moment().format("e")); // Substracting the weekday index "e"
                this.totalOfPeriod.currentWeek = this.getSummedTimes(weekStartDate, moment().format("YYYYMMDD"));
            }
        }
    });

    // Template containing everything from TimeTracker
    var TimeTrackerComponent = Vue.extend({
        props: ['activities', 'totaltimes', 'saving', 'currentms', 'settings', 'presets', 'days'],
        data: function () {
            return {
                "activeTab": "today" // Tab selection, possible values are "today" and "overview"
            }
        },
        template:
            '<div class="jqTabPane jqTabPaneSimple jqInitedTabpane jqTabPaneInitialized">'+
                '<ul class="jqTabGroup">'+
                    '<li :class="activeTab === \'today\' ? \'current\' : \'\'">'+
                        '<a @click.stop.prevent="setActiveTab(\'today\')">'+loc('Todays Activities')+'</a>'+
                    '</li>'+
                    '<li :class="activeTab === \'overview\' ? \'current\' : \'\'">'+
                        '<a @click.stop.prevent="setActiveTab(\'overview\')">'+loc('Overview')+'</a>'+
                    '</li>'+
                '</ul>'+
                '<span class="foswikiClear"></span>'+
                '<div v-show="activeTab === \'today\'" class="jqTab current">'+
                    '<vue-activity-table :activities="activities" :totaltimes="totaltimes" :saving="saving" :currentms="currentms" :settings="settings"></vue-activity-table>'+
                    '<vue-add-activity :activities="activities" :settings="settings" :presets="presets"></vue-add-activity>'+
                    '<span class="foswikiClear"></span>'+
                '</div>'+
                '<div v-show="activeTab === \'overview\'" class="jqTab current">'+
                    '<vue-overview :currentms="currentms" :days="days"></vue-overview>'+
                    '<span class="foswikiClear"></span>'+
                '</div>'+
            '</div>',
        components: {
            'vue-activity-table': ActivityTableComponent,
            'vue-add-activity': AddActivityComponent,
            'vue-overview': OverviewComponent
        },
        methods: {
            setActiveTab: function (active) {
                this.activeTab = active;
                if(active === "overview") {
                    this.$root.sendToRest("getAllDays", {});
                }
            }
        }
    });
    Vue.component('vue-time-tracker', TimeTrackerComponent);

    // Set up computed propertys
    var comp = {
        totaltimes: { // Calculates the total time spent per activity
            cache: false,
            get: function () {
                var res = {};
                var todaysTotal = 0;
                for(var a in this.activities) {
                    if(this.activities.hasOwnProperty(a)) {
                        var totalms = this.activities[a].correction || 0;
                        var running = false;
                        // Sum up the ms of each timeSpan
                        for(var i in this.activities[a].timeSpans) {
                            if(this.activities[a].timeSpans.hasOwnProperty(i)) {
                                var span = this.activities[a].timeSpans[i];
                                if(span.endTime > 0) { // Existing endTime means the timer is not running
                                    totalms += (span.endTime - span.startTime); // Add stopped time diff
                                } else {
                                    totalms += (this.currentms - span.startTime); // Add time diff since the startTime
                                    running = true;
                                }
                            }
                        }
                        todaysTotal += totalms;
                        var dur = moment.duration(totalms);
                        res[this.activities[a].id] = {
                            running: running,
                            totalms: totalms,
                            totalHours: dur.asHours().toFixed(4), // Decimal hours for Redmine
                            // Store each part of hh:mm:ss with a leading 0 if needed
                            hours: dur.asHours() < 10 ? "0"+Math.floor(dur.asHours()) : Math.floor(dur.asHours()),
                            minutes: dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes(),
                            seconds: dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds()
                        };
                    }
                }
                var dur = moment.duration(todaysTotal);
                res[0] = {
                    totalms: todaysTotal,
                    totalHours: dur.asHours().toFixed(4), // Decimal hours for Redmine
                    // Store each part of hh:mm:ss with a leading 0 if needed
                    hours: dur.asHours() < 10 ? "0"+Math.floor(dur.asHours()) : Math.floor(dur.asHours()),
                    minutes: dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes(),
                    seconds: dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds()
                };
                return res;
            }
        }
    };
    // Initialize the root Vue instance
    var vm = new Vue({
        el: '#timeTracker', // Dom element, where Vue is applied to
        data: {
            "settings": {
                "onlyOneRunning": true,
                "allowEmptyActivity": false
            },
            "currentms": 0, // = moment().valueOf(), updated every second for Vue calculations
            "saving": {
                "notSaved": [], // Storing ids of every activity that is not exactly like this at the server
                "openSaves": 0, // Number of save operations to be handled from rest
                "errored": false, // Has something went wrong and was not correctly saved
                "refused": false // Was saving refused
            },
            "activities": [], // Activities stored in Meta for today land here
            "presets": [], // Presets stored in Meta of settings land here
            "days": [] // All activities for all days land here
        },
        computed: comp, // Computed propertys from above
        methods: {
            // Update everything time dependant by triggering vue recalculation
            loopupdate : function () {
                this.update();
                setTimeout(this.loopupdate, 1000);
            },
            update: function () {
                this.currentms = moment().valueOf();
            },
            // Stop all running timer, return an array of all actually stopped activities
            stopAll: function () {
                var stopped = [];
                for(var a in this.activities) {
                    if(this.activities.hasOwnProperty(a)) {
                        for(var i in this.activities[a].timeSpans) {
                            if(this.activities[a].timeSpans.hasOwnProperty(i)) {
                                var span = this.activities[a].timeSpans[i];
                                if(span.endTime === 0) { // This timeSpan is running
                                    span.endTime = moment().valueOf(); // Stop the timeSpan by settings its endTime
                                    stopped.push(this.activities[a]);
                                }
                            }
                        }
                    }
                }
                return stopped;
            },
            // Send the JSON data to rest
            sendToRest: function (action, value) {
                if(action === "set" || action === "deleteActivities") {
                    // Store ids of changed activities
                    if(!this.saving.errored) {
                        for(var a in value.activities) {
                            this.saving.notSaved.push(value.activities[a].id);
                        }
                        this.saving.openSaves++;
                    } else {
                        // Make sure every now updated activity occurs only once in the notSaved array
                        for(var a in value.activities) {
                            var index = this.saving.notSaved.indexOf(value.activities[a].id);
                            while(index > -1){
                                this.saving.notSaved.splice(index, 1);
                                index = this.saving.notSaved.indexOf(value.activities[a].id);
                            }
                            this.saving.notSaved.push(value.activities[a].id);
                        }
                        // Reset the openSaves
                        this.saving.openSaves = 1;
                    }
                }

                var payload = {
                    action: action,
                    value: value,
                    web: foswiki.getPreference('WEB'),
                    user: foswiki.getPreference('WIKINAME'),
                    date: moment().format('YYYYMMDD'),
                    time: moment().valueOf()
                };
                $.ajax({
                    url: "/bin/rest/TimeTrackerPlugin/save",
                    method: 'POST',
                    success: this.restResponse,
                    error: this.restError,
                    data: {data: JSON.stringify(payload)}
                });
            },
            // Handle response from rest
            restResponse: function (data) {
                var answer = JSON.parse(data);
                switch(answer.action) {
                    case "getToday":
                        this.activities = answer.activities;
                        this.presets = [];
                        for(var i = 0; i < answer.settings.length; i++) {
                            var set = answer.settings[i];
                            if(set.name === "onlyOneRunning") {
                                this.settings.onlyOneRunning = set.value;
                            } else if(set.name === "allowEmptyActivity") {
                                this.settings.allowEmptyActivity = set.value;
                            } else {
                                this.presets.push(set.value);
                            }
                        }
                    break;
                    case "set":
                        // Remove every saved activity from the notSaved array
                        for(var i in answer.settedActivitiesIds) {
                            var index = this.saving.notSaved.indexOf(answer.settedActivitiesIds[i]);
                            if(index > -1){
                                this.saving.notSaved.splice(index, 1);
                            }
                        }
                        // Add saved presets
                        for(var p in answer.settedSettings) {
                            this.presets.push(answer.settedSettings[p].value);
                        }
                        this.saving.openSaves--;
                        this.checkSaves();
                    break;
                    case "deleteActivities":
                        // Remove every deleted activity from the notSaved array and from the activities array
                        for(var i in answer.deletedIds) {
                            var index1 = this.saving.notSaved.indexOf(answer.deletedIds[i]);
                            if(index1 > -1){
                                this.saving.notSaved.splice(index1, 1);
                            }
                            var index2 = -1;
                            for(var a in this.activities) {
                                if(this.activities[a].id === answer.deletedIds[i]) {
                                    index2 = a;
                                }
                            }
                            if(index2 > -1){
                                this.activities.splice(index2, 1);
                            }
                        }
                        this.saving.openSaves--;
                        this.checkSaves();
                    break;
                    case "deleteSettings":
                        // Remove every deleted preset the presets array
                        for(var i in answer.deletedIds) {
                            var index = -1;
                            for(var p in this.presets) {
                                if(this.presets[p].id === answer.deletedIds[i]) {
                                    index = p;
                                }
                            }
                            if(index > -1){
                                this.presets.splice(index, 1);
                            }
                        }
                    break;
                    case "getAllDays":
                        this.days = answer.days;
                    break;
                    case "refused":
                        if(answer.cause === "timeDiff") {
                            this.saving.refused = true;
                        }
                        this.saving.openSaves--;
                        this.checkSaves();
                    break;
                }
            },
            restError: function (err) {
                console.warn("restError", err);
                this.saving.openSaves--;
                this.checkSaves();
            },
            checkSaves: function () {
                // Wait if there are open saves
                if(this.saving.openSaves <= 0) {
                    if(this.saving.notSaved.length > 0) { // Handle error
                        console.error(this.saving.errored ? "There are still some unsaved activities: " : "Something went wrong during saving these activities: ", this.saving.notSaved);
                        this.saving.errored = true;
                        // Mark exactly the activities listed in the notSaved array
                        jQuery(".errored").removeClass('errored');
                        for(var i in this.saving.notSaved) {
                            jQuery("#activity"+this.saving.notSaved[i]).addClass('errored');
                        }
                    } else if(this.saving.errored) { // There was an error, but now everything seems fine
                        jQuery(".errored").removeClass('errored');
                        this.saving.errored = false;
                        this.saving.refused = false;
                    }
                }
            }
        },
        watch: {
            "settings.onlyOneRunning": function(newVal, oldVal) {
                this.sendToRest("set", {activities: [], settings: [{"id": "onlyOneRunning", "name": "onlyOneRunning", "value": newVal}]});
            },
            "settings.allowEmptyActivity": function(newVal, oldVal) {
                this.sendToRest("set", {activities: [], settings: [{"id": "allowEmptyActivity", "name": "allowEmptyActivity", "value": newVal}]});
            }
        }
    });

    vm.sendToRest("getToday", {});
    // Start the update cycle
    vm.loopupdate();
});
/* CODE END */


/* Data format */
// Additionally "form", "saving" and "currentms" are needed for Vue computations
var dataFormat = {
    "activities": [
        {
            "id": "<timeStamp:int>", // autogenerated, not editable
            "project": { // autogenerated, not editable
                "id": "<redmineProjectID:int>",
                "name": "<redmineProjectName:String>"
            },
            "ticket": {
                "id": "<redmineTicketID:int>",
                "subject": "<redmineTicketSubject:String"
            },
            "type": {
                "id": "<redmineTypeID:int>",
                "name": "<redmineTypeName:String"
            },
            "comment": {
                "sendToRedmine": "<:Boolean>",
                "text": "<:String>"
            },
            "booked": {
                "inRedmine": "<:Boolean>",
                "manually": "<:Boolean>"
            },
            "correction": "<ms:int>",
            "timeSpans": [
                {
                    "startTime": "<timeStampStart:int>",
                    "endTime": "<timeStampEnd:int>" // If endTime is 0, then this timeSpan is currently running
                } //, ... more timeSpan objects
            ]
        } //, ... more activity objects
    ]
};



/*
jQuery(function($){
    var current;
    var currentTime;

    var getTrFor = function($this) {
        return $this.closest('tr');
    };

    var resumeActivity = function(ev) {
        var $this = $(this);
        var $tr = getTrFor($this);
        if(!($tr.hasClass('TimeTrackerBooked'))) {
            changeActivity($tr);
            $this.closest('.TimeTrackerField').find('div.TimeTrackerSend').click(); // save
        }
    };

    var renameActivityHandler = function(ev){
        var $this = $(this);
        var $parentTr = getTrFor($this);
        var $activity = $parentTr.find('.TimeTrackerActivity');
        var $tools = $parentTr.find('.TimeTrackerTools');
        $tools.hide();
        var submitHandler = function(ev) {
            var $this = $(this);
            var $input = $parentTr.find(':input');
            var name = $input[0].value;
            $input.remove();
            $activity.html(name);
            $renameUI.remove();
            $parentTr.find('.TimeTrackerTools').show();
            $activity.show();
        };
        var oldName = $activity.html();
        $activity.parent().append('<input type="text" value="'+oldName+'" />');
        $activity.hide();
        var $renameUI = $('<div class="TimeTrackerRenameUI"><div class="TimeTrackerActualRename TimeTrackerButton">Rename</div></div>');
        $tools.parent().append($renameUI);
        $parentTr.find('.TimeTrackerActualRename').click(submitHandler);
    };

    var markAsBooked = function(ev) {
        var $this = $(this);
        var $tr = getTrFor($this);
        $tr.addClass('TimeTrackerBooked');
    };

    var markAsUnBooked = function(ev) {
        var $this = $(this);
        var $tr = getTrFor($this);
        $tr.removeClass('TimeTrackerBooked');
    };

    var correctActivity = function(ev) {
        var $this = $(this);
        var $parentTr = getTrFor($this);
        var $inputSpend = $('<input type="text" />');
        var $inputUnit = $('<select name="Unit" size="1"><option value="h">h</option><option value="m">min</option></select>');
        var $inputSpendUI = $('<div />');
        $inputSpendUI.append('<br />');
        $inputSpendUI.append($inputSpend);
        $inputSpendUI.append($inputUnit);
        var $inputTime = $('<input type="text" />');
        $parentTr.find('.TimeTrackerTime').append($inputTime);
        $parentTr.find('.TimeTrackerSpend').append($inputSpendUI);
        var $tools = $parentTr.find('.TimeTrackerTools');
        $tools.hide();
        var submitHandler = function(ev) {
            var $this = $(this);
            $correctionUI.remove();
            $inputTime.remove();
            $inputSpendUI.remove();
            var correction = new Number($inputSpend.val().replace(',', '.'));
            if($inputSpend.val() !== '' && !isNaN(correction)) {
                if($inputUnit.val() === 'm') {
                    correction /= 60;
                }
                addTime($parentTr, correction);
                $parentTr.find('.TimeTrackerTime').append($inputTime.val()).append(': '+correction+'<br />');
            }
            $parentTr.find('.TimeTrackerTools').show();
        };
        var $correctionUI = $('<div class="TimeTrackerCorrectionUI"><div class="TimeTrackerActualCorrection TimeTrackerButton">Correct</div></div>');
        $tools.parent().append($correctionUI);
        $parentTr.find('.TimeTrackerActualCorrection').click(submitHandler);
    };

    var addTime = function($tr, correction) {
        var newSpend = new Number($tr.find('.TimeTrackerSpend').text());
        if(isNaN(newSpend)) newSpend = 0;
        if(isNaN(correction)) correction = 0;
        newSpend += correction;
        $tr.find('.TimeTrackerSpend').html(newSpend);
    }

    var changeActivity = function($tr) {
        var $field = $tr.closest('.TimeTrackerField');
        var $old = $field.find('.TimeTrackerActive');
        var now = new Date();
        var time = now.getHours() + ':' + ((now.getMinutes()<10)?'0':'')+now.getMinutes();
        if($old.length) {
            $old.removeClass('TimeTrackerActive');
            var $oldFirst = $old.first(); // make sure to only have one time or things go far into to future
            var $oldTime = $oldFirst.find('span.TimeTrackerStarted');
            $oldTime.remove();
            var oldTime = $oldTime.text();
            $($oldFirst.find('.TimeTrackerTime')).append('Stopped:&nbsp;'+time+'<br />');
            var spend = (now.getTime() - oldTime) / 1000. / 60 / 60;
            addTime($oldFirst, spend);
        }
        if($tr.is('tr')) {
            $tr.find('.TimeTrackerTime').append('Started:&nbsp;' + time + '<br />');
            $tr.find('.TimeTrackerTime').append('<span class=\'TimeTrackerStarted\'>' + now.getTime() + '</span>');
            $tr.addClass('TimeTrackerActive');
        }
    };

    var makeClickable = function($tr) {
        $tr.find('.TimeTrackerRename').click(renameActivityHandler);
        $tr.find('.TimeTrackerBook').click(markAsBooked);
        $tr.find('.TimeTrackerUnBook').click(markAsUnBooked);
        $tr.find('.TimeTrackerCorrection').click(correctActivity);
        $tr.find('.TimeTrackerActivity').click(resumeActivity);
    };

    var sendToServer = function(ev) {
        var $this = $(this);
        var $message = $('<div class="TimeTrackerMessage">...sending</div>');
        $this.append($message);
        $this.find('.TimeTrackerError').remove();
        var $field = $this.closest('.TimeTrackerField');
        var date = $field.find('.TimeTrackerDate').text();
        var $form = $('<form><input type="hidden" name="data" value="" /><input type="hidden" name="web" value="'+foswiki.getPreference('WEB')+'" /><input type="hidden" name="id" value="'+$field.attr('id')+'" /><input type="hidden" name="date" value="'+date+'" /></form>');
        var $clone = $field.clone();
        $clone.find('.TimeTrackerError').remove();
        $clone.find('.TimeTrackerTools').replaceWith('<div class=\'TimeTrackerTools\'></div>');
        $clone.find('.TimeTrackerControlls').remove();
        $form.find('input[name=data]').val($clone.wrap('<div>').parent().html()); // XXX Bah!
        var url = foswiki.getPreference('SCRIPTURL') + '/rest/TimeTrackerPlugin/store';
        $.ajax({
                url: url,
                data: $form.serialize(),
                type: 'POST',
                success: function() {
                    $message.remove();
                },
                error: function(jqXHR, status, error) {

                    $message.html('ERROR: '+error);
                    $message.addClass('TimeTrackerError');
                }
        });
    };

    var stopActivity = function() {
        var $this = $(this);
        changeActivity($this);
        $this.closest('.TimeTrackerField').find('div.TimeTrackerSend').click(); // save
    }

    var setup = function() {
        $.each($('.TimeTrackerField'), function(idx, el) {
                setupField(el);
         });
    }

    var setupField = function(field) {
        var $field = $(field);
var $controlls = $('<table class="TimeTrackerControlls" rules="all">    <tbody>        <tr><td colspan="4"><div class="TimeTrackerNewActivity TimeTrackerButton" style="float:left;">New Activity:</div>&nbsp;<input type="text" class="activityName" /></td></tr>        <tr><td colspan="4"><div class="TimeTrackerStop TimeTrackerButton">Stop activities</div></td></tr>        <tr><td colspan="4"><div class="TimeTrackerSend TimeTrackerButton">Send to wiki</div></td></tr>    </tbody></table>');
        $field.append($controlls);
        $controlls.find('div.TimeTrackerSend').click(sendToServer);
        $controlls.find('div.TimeTrackerStop').click(stopActivity);
        { // Scope
            var tools = $field.find('.TimeTrackerTools');
            for(var i = tools.length-1; i >= 0; i--) {
                var $tr = $(tools[i]).closest('tr');
                toolsify($tr);
            }
        }
        $controlls.find('div.TimeTrackerNewActivity').click(function(ev) {
            var $this = $(this);
            var $table = $this.closest('.TimeTrackerField').find('.TimeTrackerTable tbody');
            var $tr = getTrFor($this);
            var input = $tr.find('.activityName')[0];
            var name = input.value;
            input.value = '';
            var $newTr = $('<!--\n--><tr><td><div class="TimeTrackerTools"></div></td><td><div class="TimeTrackerActivity">'+name+'</div></td><td class="TimeTrackerTime"></td><td class="TimeTrackerSpend"></td></tr><!--\n-->');
            $table.append( $newTr );
            toolsify($newTr);
            changeActivity($newTr);
            $field.find('div.TimeTrackerSend').click(); // save
        });
        if($field.find('.TimeTrackerDate').text() !== getDate()) {
            $field.find('.TimeTrackerDate').after('<span class="TimeTrackerError">&nbsp;&larr;&nbsp;Today is '+getDate()+'!</span>');
        }


    }

    var toolsify = function($tr) {
        var $tools = $tr.find('.TimeTrackerTools');
        $tools.append('<div class="TimeTrackerButton TimeTrackerRename">Rename</div><div class="TimeTrackerButton TimeTrackerCorrection">Correction</div>');
        $tools.append('<div class="TimeTrackerButton TimeTrackerBook">Book</div>');
        $tools.append('<div class="TimeTrackerButton TimeTrackerUnBook">Unbook</div>');
        makeClickable($tr);
    }

    var getDate = function() {
        var date = new Date();
        var month = date.getMonth() + 1;
        if(month < 10) {
            month = '0' + new String(month);
        } else {
            month = new String(month);
        }
        var day = date.getDate();
        if(day < 10) {
            day = '0' + new String(day);
        } else {
            day = new String(day);
        }
        date = new String(date.getFullYear()) + month + day;
        return date;
    }

    setup();
});
*/
