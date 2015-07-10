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

    Foswiki::Func::registerTagHandler( 'TIMETRACKER', \&_timetrackerTAG );
    Foswiki::Func::registerTagHandler( 'TIMETRACKERJS', \&_timetrackerjsTAG );
    Foswiki::Func::registerRESTHandler( 'store', \&restStore );

    # Plugin correctly initialized
    return 1;
}

sub css {
    return <<CSS;
<style media="all" type="text/css" >
    \@import url(%PUBURLPATH%/%SYSTEMWEB%/TimeTrackerPlugin/timetracker.css?r=$RELEASE)
</style>
CSS
}

sub _timetrackerTAG {
    my($session, $params, $topic, $web, $topicObject) = @_;

    my $id = $params->{_DEFAULT};
    return 'Please specify id' unless $id;

    my $date = Foswiki::Func::formatTime(time(), '$year$mo$day');
    my $todaystopic = "${id}_$date";

    my $contents;
    if ( Foswiki::Func::topicExists( $web, $todaystopic ) ){
        my $meta;
        ($meta, $contents) = Foswiki::Func::readTopic( $web, $todaystopic );
    } else {
        $contents = <<TABLE;
<div id="$id" class="TimeTrackerField">
Date: <span class="TimeTrackerDate">$date</span>
<table class="TimeTrackerTable" rules="all">
    <thead>
        <tr><th>Tools</th><th> Activity </th><th>Time log</th><th>Time spent</th></tr>
    </thead><tbody>
    </tbody>
</table>
</div>
%TIMETRACKERJS%
TABLE
    }

    return $contents;
}

sub _timetrackerjsTAG {
    my $css = css();
    my $js = js();

    Foswiki::Func::addToZone("script", "TimeTrackerPlugin", <<SCRIPT, "JQUERYPLUGIN");
$css$js
SCRIPT
    return '';
}

sub js {
    return <<SCRIPT;
<script type='text/javascript' src='%PUBURLPATH%/%SYSTEMWEB%/TimeTrackerPlugin/timetracker.js?r=$RELEASE'></script>
SCRIPT
}

sub restStore {
    my ( $session, $subject, $verb, $response ) = @_;
    my $query = $session->{request};
    my $data = $query->{param}->{data};
    my $id = $query->{param}->{id};
    my $web = $query->{param}->{web};
    my $date = $query->{param}->{date};

    $data = @$data[0] if( $data );
    $web = @$web[0] if( $web );
    $id = @$id[0] if( $id );

    my $error = '';
    $error .= ' Received no data!' unless ( $data );
    $error .= ' Received no id!' unless ( $id );
    $error .= ' Received no web!' unless ( $web );
    if( $error ) {
        $response->status( "400 $error" );
        return "Error: $error";
    }

    $data .= '%TIMETRACKERJS%';

    $date = @$date[0] if $date;
    $date = Foswiki::Func::formatTime(time(), '$year$mo$day') unless $date;
    my $topic = $id.'_'.$date;
    ($web, $topic) = Foswiki::Func::normalizeWebTopicName( $web, $topic );
    try {
        Foswiki::Func::saveTopic( $web, $topic, undef, $data, {forcenewrevision=>1, dontlog=>1} );
    } catch Foswiki::AccessControlException with {
        my $error = "Your may not write to '$web.$topic'!";
        $response->status( "401 $error" );
        Foswiki::Func::writeWarning("$error");
        return $error;
    } catch Error::Simple with {
        my $error = shift;
        $response->status( "500 $error" );
        Foswiki::Func::writeWarning("$error");
        return $error
    };
    return;
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
