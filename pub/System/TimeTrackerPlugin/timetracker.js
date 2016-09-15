/* TEST DATA */
var testData = {
    "form" : { // Storage for the "new activity form" data
        "ticket": "",
        "type": "",
        "comment": "",
        "sendComment": true
    },
    "currentms": 0, // = moment().valueOf(), updated every second for Vue calculations
    "saving": {
        "notSaved": [], // Storing ids of every activity that is not exactly like this at the server
        "openSaves": 0, // Number of save operations to be handled from rest
        "errored": false // Has something went wrong and was not correctly saved
    },
    "activities": []
};
/*
        {
            "id": 1473249095443, // autogenerated, not editable
            "project": { // autogenerated, not editable
                "id": 18,
                "name": "Interne Aufgaben"
            },
            "ticket": {
                "id": 14757,
                "subject": "TimeTrackerPlugin überarbeiten"
            },
            "type": {
                "id": 916,
                "name": "Interne Aufgaben"
            },
            "comment": {
                "sendToRedmine": true,
                "text": "testData.activities[0]"
            },
            "timeSpans": [
                {
                    "startTime": 1473249095443,
                    "endTime": 1473249112013
                } //, ... more timeSpan objects
            ]
        },
        {
            "id": 1473249384647, // autogenerated, not editable
            "project": { // autogenerated, not editable
                "id": 8,
                "name": "Lebenshilfe Vorarlberg - Service"
            },
            "ticket": {
                "id": 125,
                "subject": "Q.Wiki Quickwin Plugins installieren"
            },
            "type": {
                "id": 207,
                "name": "Service"
            },
            "comment": {
                "sendToRedmine": false,
                "text": "testData.activities[1]"
            },
            "timeSpans": [
                {
                    "startTime": 1473249384647,
                    "endTime": 1473249401708
                },
                {
                    "startTime": 1473249433478,
                    "endTime": 1473249755154
                },
                {
                    "startTime": 1473329599744,
                    "endTime": 0
                } //, ... more timeSpan objects
            ]
        } //, ... more activity objects
    ]
};
*/

/* CODE BEGIN */
var stopOtherTimersOnPlay = true;
var allowEmptyActivity = false;
// Template for one activity
var ActivityComponent = Vue.extend({
    props: ['activity', 'index', 'totaltime', 'currentms'],
    data: function () {
        return {
            edit: {
                "ticket": this.activity.ticket.subject,
                "type": this.activity.type.name,
                "comment": this.activity.comment.text,
                "sendComment": this.activity.comment.sendToRedmine
            }
        }
    },
    template:
        '<tr id="activity{{ activity.id }}" @click="toggleDetails()">'+
            '<td>{{ activity.project.name }}</td>'+
            '<td>{{ activity.ticket.subject }}</td>'+
            '<td>{{ activity.type.name }}</td>'+
            '<td>{{ activity.comment.text }}</td>'+
            '<td>'+
                '<p>Redmine: TODO Update</p>'+
                '<p><label for="commentCheckBox{{ activity.id }}">Include comment: </label><input type="checkbox" id="commentCheckBox{{ activity.id }}" v-model="activity.comment.sendToRedmine" disabled/></p>'+
            '</td>'+
            '<td>{{ totaltime.hours }}:{{ totaltime.minutes }}:{{ totaltime.seconds }}<br/>{{ totaltime.totalhours }}h</td>'+
            '<td>'+
                // Depending on wether theres a running timer this button is either a play or a stop button
                '<button :class="totaltime.running ? \'fa fa-fw fa-lg fa-pause\' : \'fa fa-fw fa-lg fa-play\'" @click.stop="totaltime.running ? stop() : start()"></button>'+
            '</td>'+
        '</tr>'+
        '<tr class="timeSpans hidden">'+
            '<td colspan="7">'+
                '<div class="edit">'+
                    '<form @submit.prevent="saveEdit()">'+
                        '<div>'+
                            '<p><label for="ticket">Ticket</label><input type="text" name="ticket" id="ticket" v-model="edit.ticket"><br/></p>'+
                            '<p><label for="type">Type</label><select name="type" id="type" v-model="edit.type"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select><br/></p>'+
                            '<p><label for="comment">Comment</label><input type="text" name="comment" id="comment" v-model="edit.comment"></p>'+
                            '<p><label for="sendComment">Send Comment</label><input type="checkbox" name="sendComment" id="sendComment" v-model="edit.sendComment"></p>'+
                        '</div>'+
                        '<button type="submit">Save Edit</button><button @click.stop.prevent="cancelEdit()">Cancel Edit</button><button @click.stop.prevent="delete()">Delete Activity</button>'+
                    '</form>'+
                '</div>'+
                '<div>'+
                    '<table>'+
                        '<thead>'+
                            '<tr><th>From</th><th></th><th>To</th><th>Duration</th></tr>'+
                        '</thead>'+
                        '<tbody>'+
                            '<tr v-for="timeSpan in activity.timeSpans">'+
                                '<td>{{ showTime(timeSpan.startTime) }}</td>'+
                                '<td>-</td>'+
                                '<td>{{ timeSpan.endTime > 0 ? showTime(timeSpan.endTime) : "running" }}</td>'+
                                '<td>{{ showDuration(timeSpan.endTime > 0 ? (timeSpan.endTime - timeSpan.startTime) : (currentms - timeSpan.startTime))}}</td>'+
                            '</tr>'+
                        '</tbody>'+
                    '</table>'+
                '</div>'+
            '</td>'+
        '</tr>',
    methods: {
        // This starts a new timeSpan for the corresponding activity
        start: function () {
            // Stop every running timer if this setting is activated
            var updated = [];
            if(stopOtherTimersOnPlay) {
                updated = this.$root.stopAll();
            }
            updated.push(this.activity);
            // Start a new Timer for this activity
            this.activity.timeSpans.push({
                "startTime": moment().valueOf(), // Current time as start
                "endTime": 0 // Running timer, so no end
            });
            this.$root.update();
            this.$root.sendToRest("setActivities", {activities: updated});
        },
        // This stops every running timeSpan for the corresponding activity
        stop: function () {
            for(var i=0; i < this.activity.timeSpans.length; i++) {
                if(this.activity.timeSpans[i].endTime === 0) { // This timeSpan is running
                    this.activity.timeSpans[i].endTime = moment().valueOf(); // Stop the timeSpan by settings its endTime
                }
            }
            this.$root.sendToRest("setActivities", {activities: [this.activity]});
        },
        // Save the edited data to the activity
        saveEdit: function () {
            if(this.edit.ticket !== "" || this.edit.type !== "" || this.edit.comment !== "" || allowEmptyActivity) { // Prevent empty activity unless setted otherwise
                this.activity = {
                    "id": this.activity.id,
                    "project": this.activity.project, // TODO
                    "ticket": { // TODO
                        "id": this.activity.ticket.id,
                        "subject": this.edit.ticket
                    },
                    "type": {
                        "id": this.activity.type.id, // TODO
                        "name": this.edit.type
                    },
                    "comment": {
                        "sendToRedmine": this.edit.sendComment,
                        "text": this.edit.comment
                    },
                    "timeSpans": this.activity.timeSpans
                };
                this.$root.sendToRest("setActivities", {activities: [this.activity]});
                this.toggleDetails();
            }
        },
        // Cancel the edit and reset the input fields
        cancelEdit: function () {
            this.edit = {
                "ticket": this.activity.ticket.subject,
                "type": this.activity.type.name,
                "comment": this.activity.comment.text,
                "sendComment": this.activity.comment.sendToRedmine
            };
        },
        // Delete this Activity
        delete: function () {
            this.$root.sendToRest("deleteActivities", {activities: [this.activity]});
        },
        // This toggles the display of the detailed view of an activity
        toggleDetails: function () {
            this.$el.nextElementSibling.nextElementSibling.classList.toggle("hidden");
        },
        // Wrapper to access moment() in inline statements
        showTime: function (ms) {
            return moment(ms).format("HH:MM");
        },
        showDuration: function(ms) {
            var dur = moment.duration(ms);
            var hours = dur.hours() < 10 ? "0"+dur.hours() : dur.hours();
            var minutes = dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes();
            var seconds = dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds();
            return hours+":"+minutes+":"+seconds;
        }
    }
});

// Template for the whole table listing the activities
var ActivityTableComponent = Vue.extend({
    props: ['activities', 'totaltimes', 'saving', 'currentms'],
    template:
        '<div id="activities">'+
            '<div v-if="saving.errored" id="errorMessage">Something went wrong during saving the data in the topics meta data. '+
                'Please have a look at the red marked activities and redo any edits/deletions. '+
                'Alternatively you can reload the page to discard every unsaved changes and display the currently saved status.'+
            '</div>'+
            '<table>'+
                '<thead>'+
                    '<tr><th>Project</th><th>Ticket</th><th>Type</th><th>Comment</th><th>Status</th><th>Total Time</th><th>Run</th></tr>'+
                '</thead>'+
                '<tbody>'+
                    // Add a table row for each activity and apply the vue-activity template defined in ActivityComponent, needed values are passed with :val="val" attribute in parent and props: ['val'] entry in child
                    '<tr is="vue-activity" v-for="activity in activities" :activity="activity" :index="$index" :totaltime="totaltimes[activity.id]" :currentms="currentms"></tr>'+
                '</tbody>'+
            '</table>'+
            '<hr></hr>'+
            '<div id="total">'+
                '<div>{{ totaltimes[0].hours }}:{{ totaltimes[0].minutes }}:{{ totaltimes[0].seconds }}<br/>{{ totaltimes[0].totalhours }}h</div>'+
                '<div>Todays Total Time:</div>'+
            '</div>'+
        '</div>',
    components: {
        'vue-activity': ActivityComponent
    }
});
Vue.component('vue-activity-table', ActivityTableComponent);

// Template for adding a new activity
var AddActivityComponent = Vue.extend({
    props: ['activities', 'form'],
    template:
        '<div id="addActivity">'+
            '<form @submit.prevent="addActivity()">'+
                '<div>'+
                    '<p><label for="ticket">Ticket</label><input type="text" name="ticket" id="ticket" v-model="form.ticket"><br/></p>'+
                    '<p><label for="type">Type</label><select name="type" id="type" v-model="form.type"><option value="A">A</option><option value="B">B</option><option value="C">C</option></select><br/></p>'+
                    '<p><label for="comment">Comment</label><input type="text" name="comment" id="comment" v-model="form.comment"></p>'+
                    '<p><label for="sendComment">Send Comment</label><input type="checkbox" name="sendComment" id="sendComment" v-model="form.sendComment"></p>'+
                    '<p><button type="submit">Add Activity</button></p>'+
                '</div>'+
            '</form>'+
        '</div>',
    methods: {
        addActivity: function () {
            if(this.form.ticket !== "" || this.form.type !== "" || this.form.comment !== "" || allowEmptyActivity) { // Prevent empty activity unless setted otherwise
                var updated = [];
                if(stopOtherTimersOnPlay) {
                    updated = this.$root.stopAll();
                }
                var newAct = {
                    "id": moment().valueOf(),
                    "project": { // TODO
                        "id": 125,
                        "name": "Project Name"
                    },
                    "ticket": { // TODO
                        "id": 125,
                        "subject": this.form.ticket
                    },
                    "type": {
                        "id": 125, // TODO
                        "name": this.form.type
                    },
                    "comment": {
                        "sendToRedmine": this.form.sendComment,
                        "text": this.form.comment
                    },
                    "timeSpans": [
                        {
                            "startTime": moment().valueOf(),
                            "endTime": 0
                        }
                    ]
                };
                this.activities.push(newAct);
                this.form = {
                    "ticket": "",
                    "type": "",
                    "comment": "",
                    "sendComment": true
                };
                updated.push(newAct);
                this.$root.sendToRest("setActivities", {activities: updated});
            }
        }
    }
});
Vue.component('vue-add-activity', AddActivityComponent);

// Initialize Vue when the document is ready to be manipulated
jQuery(document).ready(function($) {
    // Set up computed propertys
    var comp = {
        totaltimes: { // Calculates the total time spent per activity
            cache: false,
            get: function () {
                var res = {};
                var todaysTotal = 0;
                for(var a in this.activities) {
                    if(this.activities.hasOwnProperty(a)) {
                        var totalms = 0;
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
                            totalhours: dur.asHours().toFixed(4), // Decimal hours for Redmine
                            // Store each part of HH:MM:SS with a leading 0 if needed
                            hours: dur.hours() < 10 ? "0"+dur.hours() : dur.hours(),
                            minutes: dur.minutes() < 10 ? "0"+dur.minutes() : dur.minutes(),
                            seconds: dur.seconds() < 10 ? "0"+dur.seconds() : dur.seconds()
                        };
                    }
                }
                var dur = moment.duration(todaysTotal);
                res[0] = {
                    totalms: todaysTotal,
                    totalhours: dur.asHours().toFixed(4), // Decimal hours for Redmine
                    // Store each part of HH:MM:SS with a leading 0 if needed
                    hours: dur.hours() < 10 ? "0"+dur.hours() : dur.hours(),
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
        data: testData, // Data input
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
                if(action === "setActivities" || action === "deleteActivities") {
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
                    case "getActivities":
                        this.activities = answer.activities;
                    break;
                    case "setActivities":
                        // Remove every saved activity from the notSaved array
                        for(var i in answer.settedIds) {
                            var index = this.saving.notSaved.indexOf(answer.settedIds[i]);
                            if(index > -1){
                                this.saving.notSaved.splice(index, 1);
                            }
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
                    }
                }
            }
        }
    });

    vm.sendToRest("getActivities", {});
    // Start the update cycle
    vm.loopupdate();
});
/* CODE END */




















/* Data format */
// Additionally "form" and "currentms" are needed for Vue computations
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
