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

    var formater = function (object) {

        if ($.isEmptyObject(object)) {
            return
        } 

        if (object.loading) {
            return object.text
        }

        if ('subject' in object) {
            var string = object.subject;
            var length = 60;
            var trimmedString = string.length > length ? string.substring(0, length - 3) + "..." : string.substring(0, length);
            return object.tracker+" #"+object.id+": "+trimmedString
        } else {
            return "@"+object.name;
        }
    }

    var fillActivitySelect = function(element, entries, selection) {
        element.empty()
        $.each(entries,function(i,o){
            element.append($('<option>', {
                value: o.id,
                text: o.name
            }));
        });

        if (selection) {
            element.val(selection);
        }
    }

    var updateActivitySelect = function(e, selectElement) {

        selectElement.empty();

        if (!$(e.target).val()) {
            return;
        }

        var select = $(e.target).select2('data')[0];
        var $project_id;

        var select = $(e.target).select2('data')[0];
        var $project_id;

        if ('subject' in select) {
            $project_id = select.project_id;
        } else {
            $project_id = select.id;
        }

        $.ajax({
            type: 'GET',
            url: (foswiki.preferences.SCRIPTURL+"/rest/RedmineIntegrationPlugin/search_redmine"),
            data: { q: $project_id, type: "activity" },
            success: function(result){
                fillActivitySelect(selectElement, result, null)
            }
        });

    }

    var select2AjaxRequest = {
        url: (foswiki.preferences.SCRIPTURL+"/rest/RedmineIntegrationPlugin/search_redmine"),
        dataType: 'json',
        delay: 250,
        data: function (term) {
            term = term.term
            if (term.match("@")) {
                return {q: term.substring(1), type: "project"};
            } else {
                return {q: term, type: "issue"};
            }
        },
        processResults: function (data) {return { results: data }}
    }

    var splitActivityHandler = function(ev) {
        var $this = $(this);
        var $parentTr = getTrFor($this);
        var project = $parentTr.find('.TimeTrackerProjectNr > div.TimeTrackerValue').text();
        var ticket = $parentTr.find('.TimeTrackerTicketNr > div.TimeTrackerValue').text();
        var activity = $parentTr.find('.TimeTrackerActivityNr > div.TimeTrackerValue').text();
        var comment = $parentTr.find('.TimeTrackerComment > div.TimeTrackerValue').text();

        var $dialog = $('<div><input type="text" name="time" /><select name="unit"><option selected="selected">m</option><option>h</option></select></div>');
        $dialog.dialog({
            title: 'How much time would you like to split?',
            buttons: [
                {
                    text: "Split it!",
                    icons: { primary: "ui-icon-circle-check" },
                    click: function() {
                        var $newTr = addActivity(undefined, project, ticket, activity, comment, '');
                        $parentTr.after($newTr);

                        var val = $dialog.find('input[name="time"]').val();
                        if(val !== '' && isNaN(val)) {
                            alert('Please check your input');
                            return false;
                        }
                        if(val !== '' && !isNaN(val)) {
                            var correction = val;
                            if($dialog.find('[name=unit]').val() === 'm') {
                                correction /= 60;
                            }

                            addTime($parentTr, -correction);
                            $parentTr.find('.TimeTrackerTime').append('split: ' + (-correction) + '<br />');

                            addTime($newTr, correction);
                            $newTr.find('.TimeTrackerTime').append('split: ' + correction + '<br />');
                        }
                        $dialog.dialog('close');
                    }
                },
                {
                    text: "Cancel",
                    icons: { primary: "ui-icon-cancel" },
                    click: function() { $dialog.dialog('close'); }
                }
            ]
        });

        return false;
    }

    var renameActivityHandler = function(ev){
        var $this = $(this);
        var $parentTr = getTrFor($this);
        var $project = $parentTr.find('.TimeTrackerProjectNr > div.TimeTrackerValue');
        var $ticket = $parentTr.find('.TimeTrackerTicketNr > div.TimeTrackerValue');
        var $activity = $parentTr.find('.TimeTrackerActivityNr > div.TimeTrackerValue');
        var $comment = $parentTr.find('.TimeTrackerComment > div.TimeTrackerValue');
        var $notes = $parentTr.find('.TimeTrackerNotes > div.TimeTrackerValue');
        var $tools = $parentTr.find('.TimeTrackerTools');
        $tools.hide();

        var oldProject = $project.html();
        var oldTicket = $ticket.html();
        var oldActivity = $activity.html();

        var submitHandler = function(ev) {
            var $this = $(this);

            var $ticketInput = $ticket.siblings('select');
            var inputData = $ticketInput.select2('data')[0];

            var ticket = oldTicket;
            var project = oldProject;

            if (inputData != null) {
                if ('subject' in inputData) {
                    var ticket = inputData.id;
                    var project = inputData.project_id;
                } else {
                    var project = inputData.id;
                }
            }

            var $activityInput = $activity.siblings('select');
            var activity = $activityInput.val();
            if(activity === undefined) activity = '';

            var $commentInput = $comment.siblings('input');
            var name = $commentInput.val();
            if(name === undefined) name = '';

            var $notesInput = $notes.siblings('input');
            var notes = $notesInput.val();
            if(notes === undefined) notes = '';

            $ticketInput.select2('destroy');
            $ticketInput.remove();
            $activityInput.remove();
            $commentInput.remove();
            $notesInput.remove();
            $renameUI.remove();

            $project.html(project);
            $ticket.html(ticket);
            $activity.html(activity);
            $comment.html(name);
            $notes.html(notes);

            $parentTr.find('.TimeTrackerTools').show();
            $ticket.removeClass('TimeTrackerInRevision');
            $activity.removeClass('TimeTrackerInRevision');
            $comment.removeClass('TimeTrackerInRevision');
            $notes.removeClass('TimeTrackerInRevision');
        };

        var type;
        var q;
        var empty = false; 
        var select2_data;


        if (oldTicket == '' && oldProject == '') {
            console.info("Select2: initSelection: No Project and Issue")
            empty = true; 
        }

        if (oldTicket == '' && oldProject != '') {
            console.info("Select2: initSelection: Select Project")
            type = 'project';
            q = oldProject;
        }

        if (oldTicket != '' && oldProject != '') {
            console.info("Select2: initSelection: Select Issue")
            type = 'issue'
            q = oldTicket
        }

       var issueProjectRest = function() {
            if (!empty) {
                return $.ajax({
                    type: 'GET',
                    url: (foswiki.preferences.SCRIPTURL+"/rest/RedmineIntegrationPlugin/search_redmine"),
                    data: { q: q, type: type },
                });
            } else { return null; }
        }

        var activityRest = function() {
            if (!empty) {
                return $.ajax({
                    type: 'GET',
                    url: (foswiki.preferences.SCRIPTURL+"/rest/RedmineIntegrationPlugin/search_redmine"),
                    data: { q: oldProject, type: "activity" },
                });
            } else { return null; }
        }

        $.when(issueProjectRest(), activityRest()).done(function(a1, a2){

            $activity.parent().append($('<select class="TimeTrackerWidget" />').val(oldActivity));
            $activity.addClass('TimeTrackerInRevision');
            var $activitySelect = $activity.parent().find('select');

            if (!empty) {
                fillActivitySelect($activitySelect, a2[0], oldActivity);
            }

            var $input_ticket = $('<select class="TimeTrackerWidget" />');
            $ticket.addClass('TimeTrackerInRevision');
            $ticket.parent().append($input_ticket);
            $input_ticket.select2({
                width: "150px",
                minimumInputLength: 3,
                ajax: select2AjaxRequest,
                
                initSelection: function(element, callback) {
                    if (a1) {
                        console.log(a1[0][0])
                        callback(a1[0][0]);
                    } else {
                        callback({});
                    }
                },
                templateResult: formater,
                templateSelection: formater,
            }).on("change", function(e){updateActivitySelect(e, $activitySelect)});
        });


        var oldName = $comment.html();
        $comment.parent().append($('<input class="TimeTrackerWidget" type="text" />').val(oldName));
        $comment.addClass('TimeTrackerInRevision');

        var oldNotes = $notes.html();
        $notes.parent().append($('<input class="TimeTrackerWidget" type="text" />').val(oldNotes));
        $notes.addClass('TimeTrackerInRevision');

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

    var $dialog = $('<div id="redmine-dialog" title="Redmine Information"><p></p></div>');


    var sendToRedmine = function (ev) {

        var $this = $(this);
        var $parentTr = getTrFor($this);

        data_obj = {
            project_id: $parentTr.find("td.TimeTrackerProjectNr div").text(),
            issue_id: $parentTr.find("td.TimeTrackerTicketNr div").text(),
            activity_id: $parentTr.find("td.TimeTrackerActivityNr div").text(),
            hours: $parentTr.find("td.TimeTrackerSpend").text(),
            comment: $parentTr.find("td.TimeTrackerComment div").text()
        };
        var $field = $parentTr.closest('.TimeTrackerField');
        if($field.find('.TimeTrackerDate').text() !== getDate()) {
            data_obj.date = $field.find('.TimeTrackerDate').text();
        }

        $.ajax({
            type: 'POST',
            url: (foswiki.preferences.SCRIPTURL+"/rest/RedmineIntegrationPlugin/add_time_entry"),
            data: JSON.stringify(data_obj),
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            tr: $parentTr,
            success: function(result){
                    $dialog.html("<p>Time Entry was added successfully, please visit the following link and update the activity type.</p><a href='https://projects.modell-aachen.de/time_entries/"+result.id+"/edit' target='_blank'>https://projects.modell-aachen.de/time_entries/"+result.id+"/edit</a></p>")
                    $dialog.dialog( "open" );
                    this.tr.addClass('TimeTrackerBooked');
                },
            error: function(jqXHR, textStatus, errorThrown ){
                    $dialog.html("<p>The was a problem sending the time tracker. Following message was provided: "+JSON.parse(jqXHR.responseText).msg+"</p> ")
                    $dialog.dialog( "open" );
                },
        });

    }

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
        $tr.find('.TimeTrackerResume').click(resumeActivity);
        $tr.find('.TimeTrackerSend2R').click(sendToRedmine);
        $tr.find('.TimeTrackerSplit').click(splitActivityHandler);
    };

    var sendToServer = function(ev) {
        var $this = $(this);
        var $message = $('<div class="TimeTrackerMessage">...sending</div>');

        $this.append($message);
        $this.find('.TimeTrackerError').remove();

        var sum = 0;
        $('.TimeTrackerSpend').each(function() { sum += new Number($(this).text()); });
        var $sum = $('.TimeTrackerSum');
        if(!$sum.length) {
            $('.TimeTrackerTable').after('<span>Total time spent:<span>&nbsp;<span class="TimeTrackerSum"></span>');
            $sum = $('.TimeTrackerSum');
        }
        $sum.text(sum);

        var $field = $this.closest('.TimeTrackerField');
        var date = $field.find('.TimeTrackerDate').text();
        var $form = $('<form><input type="hidden" name="data" value="" /><input type="hidden" name="web" value="'+foswiki.getPreference('WEB')+'" /><input type="hidden" name="id" value="'+$field.attr('id')+'" /><input type="hidden" name="date" value="'+date+'" /></form>');
        var $clone = $field.clone();
        $clone.find('.TimeTrackerError').remove();
        $clone.find('.TimeTrackerWidget').remove();
        $clone.find('.TimeTrackerInRevision').removeClass('TimeTrackerInRevision');
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
        // convert legacy stuff
        $('td > div.TimeTrackerComment').removeClass('TimeTrackerComment').addClass('TimeTrackerResume TimeTrackerValue').parent().addClass('TimeTrackerComment');
        $('.TimeTrackerBordered').removeClass('TimeTrackerBordered').addClass('TimeTrackerResume');

        $.each($('.TimeTrackerField'), function(idx, el) {
                setupField(el);
         });
    }

    var addActivity = function($table, project, ticket, activity, comment, notes) {
        if(!ticket) ticket = '';
        if(!comment) comment = '';
        if(!notes) notes = '';
        if(!project) project = '';
        if(!activity) activity = '';

        var $newTr = $('<!--\n--><tr>' +
            '<td><div class="TimeTrackerTools"></td>' +
            '<td class="TimeTrackerProjectNr"><div class="TimeTrackerValue TimeTrackerResume">'+project+'</div></td>' +
            '<td class="TimeTrackerTicketNr"><div class="TimeTrackerValue TimeTrackerResume">'+ticket+'</div></td>' +
            '<td class="TimeTrackerActivityNr"><div class="TimeTrackerValue TimeTrackerResume">'+activity+'</div></td>' +
            '<td class="TimeTrackerComment"><div class="TimeTrackerValue TimeTrackerResume">'+comment+'</div></td>' +
            '<td class="TimeTrackerNotes"><div class="TimeTrackerValue TimeTrackerResume">'+notes+'</div></td>' +
            '<td class="TimeTrackerTime"></td>' +
            '<td class="TimeTrackerSpend"></td>' +
        '</tr><!--\n-->'); // the \n is for rcs
        toolsify($newTr);
        if($table) {
            $table.append($newTr);
            changeActivity($newTr);
            $table.closest('.TimeTrackerField').find('div.TimeTrackerSend').click(); // save
        }
        return $newTr;
    }

    var resumeQuickAction = function(ev) {
        var $this = $(this);
        var $table = $this.closest('.TimeTrackerField').find('.TimeTrackerTable tbody');

        var ticket = $this.attr('ticket');
        var comment = $this.attr('comment');
        var notes = $this.attr('notes');
        var project = $this.attr('project');
        var activity = $this.attr('activity');

        var $tr;
        $table.find('tr').each(function() {
            var $this = $(this);
            if(ticket && $this.find('.TimeTrackerTicketNr .TimeTrackerValue').text() !== ticket) return;
            if(comment && $this.find('.TimeTrackerComment .TimeTrackerValue').text() !== comment) return;
            if($this.hasClass('TimeTrackerBooked')) return;

            $tr = $this;
        });

        if($tr) {
            changeActivity($tr);
            $this.closest('.TimeTrackerField').find('div.TimeTrackerSend').click(); // save
        } else {
            addActivity($table, project, ticket, activity, comment, notes);
        }
    };

    var addTemplate = function(ev) {
        var $this = $(this);
        var $table = $this.closest('.TimeTrackerField').find('.TimeTrackerTable tbody');

        var ticket = $this.attr('ticket');
        var comment = $this.attr('comment');
        var notes = $this.attr('notes');
        var project = $this.attr('project');
        var activity = $this.attr('activity');

        addActivity($table, project, ticket, activity, comment, notes);
    };

    var setupField = function(field) {
        var $field = $(field);
        var id = $field.attr('id');

        var options;
        if(id) {
            var optionsJSON = jQuery('script.TimeTrackerOptions[for="'+id+'"]').html();
            if(optionsJSON && optionsJSON.length) {
                options = window.JSON.parse(optionsJSON);
            } else {
                options = {};
            }
        } else {
            options = {};
        }

        var $controlls = $('<div class="TimeTrackerControlls TimeTrackerWidget"></div>');

        var $utilities = $('<div class="TimeTrackerGeneralUtilities"></div>').append('<table>' +
            '<tbody>' +
                '<tr>' +
                    '<td colspan="4">' +
                        '<div class="TimeTrackerNewActivity TimeTrackerButton">New Activity:</div>' +
                        '<div style="whitespace: no-break;" class="TimeTrackerInstantEnterDeluxe">' +
                            '<table>' +
                                '<tr>'+
                                '<td><label for="ticketNr">Ticket (or Project):</label></td><td><select name="ticketNr" class="ticketNr" /></td></tr><tr>'+
                                '<td><label for="activityNr">Activity:</label></td><td><select name="activityNr" class="activityNr" /></td></tr><tr>'+
                                '<td><label for="activityComment">Comment:</label></td><td><input type="text" name="activityComment" class="activityComment" /></td></tr>'+
                                '<td><label for="activityNotes">Notes:</label></td><td><input type="text" name="activityNotes" class="activityNotes" /></td>'+
                                '</tr>' +
                            '</table>' +
                        '</div>' +
                    '</td>' +
                '</tr>' +
                '<tr>' +
                    '<td colspan="4"><div class="TimeTrackerStop TimeTrackerButton">Stop acitivies</div></td>' +
                '</tr>' +
                '<tr>' +
                    '<td colspan="4"><div class="TimeTrackerSend TimeTrackerButton">Send to wiki</div></td>' +
                '</tr>' +
            '</tbody>' +
        '</table>');
        $controlls.append($utilities);

        $controlls.append($dialog);
        $dialog.dialog({
                autoOpen: false,
                width: 550,
                modal: true,
                close: function() {
                    
                }
            });


        var createAction = function(item) {
            var $action = $('<div class="TimeTrackerButton"></div>');

            var project = item.project;

            var ticket = item.ticket;
            if(!ticket || !ticket.length) ticket = '';

            var activity = item.activity;

            var comment = item.comment;
            if(!comment || !comment.length) comment = '';

            var notes = item.notes;
            if(!notes || !notes.length) notes = '';

            var label = item.label;
            if(!label || !label.length) label = ticket;
            if(!label || !label.length) label = comment;
            if(!label.length) label = '(unknown)';

            var title = '';
            if(project) title += (title ? ' ' : '') + 'Project: ' + project;
            if(ticket) title += (title ? ' ' : '') + 'Ticket: ' + ticket;
            if(activity) title += (title ? ' ' : '') + 'Activity: ' + activity;
            if(comment) title += (title ? ' ' : '') + 'Comment: ' + comment;
            if(notes) title += (title ? ' ' : '') + 'Notes: ' + notes;

            $action.text(label);
            $action.attr('title', title);
            $action.attr('ticket', ticket);
            $action.attr('comment', comment);
            $action.attr('notes', notes);
            if(activity) $action.attr('activity', activity);
            if(project) $action.attr('project', project);

            return $action;
        };

        var $quickies = $('<div class="TimeTrackerQuickActions"></div>'); // Not to be confused with Q.wikies
        if(options.quickactions) $.each(options.quickactions, function(idx, item) {
            var $action = createAction(item);

            $action.click(resumeQuickAction);

            $quickies.append($action);
        });
        if($quickies.children().length) {
            $quickies.prepend('<div class="TimeTrackerHeader">Quicklinks</div>');
            $controlls.append($quickies);
        }

        var $templates = $('<div class="TimeTrackerTemplates"></div>');
        if(options.templates) $.each(options.templates, function(idx, item) {
            var $action = createAction(item);

            $action.click(addTemplate);

            $templates.append($action);
        });
        if($templates.children().length) {
            $templates.prepend('<div class="TimeTrackerHeader">Templates</div>');
            $controlls.append($templates);
        }

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

            var $project_id = "";
            var $issue_id = "";
            var $inputTicket = $tr.find('select.ticketNr');
            var $ticket_data = $inputTicket.select2('data')[0];

            if ($ticket_data != null) {
                if ('subject' in $ticket_data) {
                    $project_id = $ticket_data.project_id;
                    $issue_id = $ticket_data.id;
                } else {
                    $project_id = $ticket_data.id;
                }
            }

            var $selectActivity = $tr.find('select.activityNr');
            var $activity = $selectActivity.val();
            $selectActivity.val('');
            $selectActivity.empty();

            $inputTicket.select2('val', null);
            $inputTicket.select2('data', {});

            var $inputComment = $tr.find('input.activityComment');
            var name = $inputComment.val();
            $inputComment.val('');

            var $inputNotes = $tr.find('input.activityNotes');
            var notes = $inputNotes.val();
            $inputNotes.val('');

            addActivity($table, $project_id, $issue_id, $activity, name, notes);
        });


        $controlls.find("select.ticketNr").select2({
            width: "300px",
            minimumInputLength: 3,
            ajax: select2AjaxRequest,
            templateSelection: formater,
            templateResult: formater
        }).on("change", function(e) {
            updateActivitySelect(e, $controlls.find("select.activityNr"))
        });


        if($field.find('.TimeTrackerDate').text() !== getDate()) {
            $field.find('.TimeTrackerDate').after('<span class="TimeTrackerError">&nbsp;&larr;&nbsp;Today is '+getDate()+'!</span>');
        }
        $controlls.find('.TimeTrackerInstantEnterDeluxe input').keypress(function(ev) {
            if(ev.which === 13) {
                $controlls.find('.TimeTrackerNewActivity').click();
                return false;
            }
            return true;
        });
    }

    var toolsify = function($tr) {
        var $tools = $tr.find('.TimeTrackerTools');
        var $widget = $('<div class="TimeTrackerWidget"></div>');
        $widget.append('<div class="TimeTrackerButton TimeTrackerRename">Rename</div><div class="TimeTrackerButton TimeTrackerCorrection">Correction</div>');
        $widget.append('<div class="TimeTrackerButton TimeTrackerSend2R">Send to Redmine</div>');
        $widget.append('<div class="TimeTrackerButton TimeTrackerBook">Book</div>');
        $widget.append('<div class="TimeTrackerButton TimeTrackerUnBook">Unbook</div>');
        $widget.append('<div class="TimeTrackerButton TimeTrackerSplit">Split</div>');
        $widget.appendTo($tools);
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
