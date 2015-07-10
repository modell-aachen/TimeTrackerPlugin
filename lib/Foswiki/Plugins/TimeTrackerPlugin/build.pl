#!/usr/bin/perl -w
use strict;

BEGIN {
    unshift @INC, split( /:/, $ENV{FOSWIKI_LIBS} );
}

use Foswiki::Contrib::Build;

package TimeTrackerPluginBuild;
use Foswiki::Contrib::Build;
our @ISA = qw( Foswiki::Contrib::Build );

sub new {
    my $class = shift;
    return bless( $class->SUPER::new("TimeTrackerPlugin"), $class );
}

sub target_build {
    my $this = shift;

    $this->SUPER::target_build();
}

package main;
my $build = new TimeTrackerPluginBuild();
$build->build( $build->{target} );

