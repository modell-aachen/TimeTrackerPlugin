# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details, published at
# http://www.gnu.org/copyleft/gpl.html

=pod

---+ package Foswiki::Plugins::TimeTrackerPlugin


=cut


package Foswiki::Plugins::TimeTrackerPlugin;

# Always use strict to enforce variable scoping
use strict;
use warnings;

use Foswiki::Func    ();    # The plugins API
use Foswiki::Plugins ();    # For the API version
use JSON;
use Switch;

use Error qw( :try );

our $VERSION = '1.0';

our $RELEASE = '1.0';

# Short description of this plugin
our $SHORTDESCRIPTION = 'A little time tracker';

our $NO_PREFS_IN_TOPIC = 1;

sub initPlugin {
    my ( $topic, $web, $user, $installWeb ) = @_;

    # check for Plugins.pm versions
    if ( $Foswiki::Plugins::VERSION < 2.0 ) {
        Foswiki::Func::writeWarning( 'Version mismatch between ',
            __PACKAGE__, ' and Plugins.pm' );
        return 0;
    }

    my $script = <<SCRIPT;
    <script type="text/javascript" src="%PUBURL%/System/TimeTrackerPlugin/timetracker.js"></script>
SCRIPT

    my $style = <<STYLE;
<link rel="stylesheet" href="%PUBURL%/System/TimeTrackerPlugin/timetracker.css" />
STYLE

    Foswiki::Func::addToZone('head', 'TIMETRACKER::CSS', $style);
    Foswiki::Func::addToZone('script', 'TIMETRACKER::JS', $script, 'JQUERYPLUGIN::FOSWIKI::PREFERENCES,VUEJSPLUGIN');


    my %opts = (authenticate => 1, validate => 0, http_allow => "POST");
    Foswiki::Func::registerRESTHandler('save', \&restSave, %opts);
    Foswiki::Meta::registerMETA('TIME', many => 1, require => ['activity']);

    return 1;
}

sub restSave {
    # Input
    my ( $session, $subject, $verb, $response ) = @_;
    my $query = $session->{request};
    my $payload = $query->param('data');
    my $data = from_json($payload);

    # Store variables
    my $action = $data->{action};
    my $value = $data->{value};
    my $web = $data->{web};
    my $user = $data->{user};
    my $date = $data->{date};
    my $time = $data->{time};
    # TODO check if date and time is correct
    my $answer = {
        'action' => $action
    };

    # Foswiki::Meta::registerMETA('TIME', many => 1, require => ['activity']);
    # Foswiki::Meta::put('TIME', {activity => "asdf"});
    # $data->{value}{id}
    # $data->{value}{comment}{sendToRedmine}
    # Foswiki::Func::writeWarning($data->{action});


    # Create todays topic if not already existing
    my $todaystopic = "$user"."_"."$date";
    Foswiki::Func::saveTopic($web, $todaystopic, undef, '', {dontlog => 1}) unless Foswiki::Func::topicExists($web, $todaystopic);
    # Get meta and content of storing topic
    my ($meta, $content) = Foswiki::Func::readTopic($web, $todaystopic);


    # Perform action
    switch($action) {
        case "getActivities" {
            # Send all stored activities back (in json: array of activity objects)
            my @activities = ();
            my @data = $meta->find('TIME');
            foreach my $act (@data) {
                push(@activities, from_json(Foswiki::urlDecode($act->{activity})));
            }
            $answer->{activities} = \@activities;
        }
        case "addActivity" {
            # Add the given activity to the meta dataset
            $meta->putKeyed('TIME', {name => $value->{id}, activity => Foswiki::urlEncode(to_json($value))});
            $answer->{activityId} = $value->{id};
        }
    }





    # Save and send answer to client
    $meta->save();
    $meta->finish();
    $response->status(200);
    return to_json($answer);
}

1;

__END__
Foswiki - The Free and Open Source Wiki, http://foswiki.org/

Author: %$AUTHOR%

Copyright (C) 2008-2012 Foswiki Contributors. Foswiki Contributors
are listed in the AUTHORS file in the root of this distribution.
NOTE: Please extend that file, not this notice.

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License
as published by the Free Software Foundation; either version 2
of the License, or (at your option) any later version. For
more details read LICENSE in the root of this distribution.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

As per the GPL, removal of this notice is prohibited.
