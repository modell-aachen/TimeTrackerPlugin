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
var $controlls = $('<table class="TimeTrackerControlls" rules="all">    <tbody>        <tr><td colspan="4"><div class="TimeTrackerNewActivity TimeTrackerButton" style="float:left;">New Activity:</div>&nbsp;<input type="text" class="activityName" /></td></tr>        <tr><td colspan="4"><div class="TimeTrackerStop TimeTrackerButton">Stop acitivies</div></td></tr>        <tr><td colspan="4"><div class="TimeTrackerSend TimeTrackerButton">Send to wiki</div></td></tr>    </tbody></table>');
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
