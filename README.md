Interlink
=========

A web-based tool for the manual verification of automatic ontology alignments

Prerequisites
-------------

This tool assumes that an automatic alignment has been created, for example by means of the [Silk Workbench](https://www.assembla.com/spaces/silk/wiki/Silk_Workbench). The pairs of URIs then need to be exported into the SQL database that is part of this prototype. For the user interface a modern browser is needed that understands SVG and respects web standards.

Installation
------------

The tool needs a LAMP stack for the server component of this prototype. A script for setting up the database with necessary table structures is provided for reference in ./server/db.sql. Take care of setting the database user password in ./server/db.sql as well as in ./server/config.ini. The user interface component only depends on static files and does not need server-side processing.

Usage instructions
------------------

From the pool of automatically discovered links, as populated in the database, a single entry is selected upon opening the user interface. Users can browse ancestor and sibling nodes to explore the contextual semantics of the two concepts to make sure the two terms have the same meaning. Otherwise, a different term can be selected if it embodies a better match. Users are requested to select the appropriate semantic link between the two concepts before clicking the green checkbox to persist the link into the server's SQL database. 

Elementary user management is provided and can be accessed by clicking on the user icon in the top-left corner. Note that users can contribute links anonymously. Also note that sessions and IP-addresses are recorded in the database for administrative purposes.

Users can define custom settings by clicking on the settings icon in the top-right corner. This includes settings related to preferred languages, for example to filter the literal values for the rdfs:labels. Furthermore, the the predicates that are explored by the interface to show the semantic context of the two terms can be configured.

When a satisfactory amount of verified links is accumulated an administrative user can export the SQL results to RDF triples in which every unique pair of URIs in the set of result entries is written as a [Vocabulary of Links](http://data.linkededucation.org/vol/) record. Note that potentially several matches are recorded for a single pair of URIs, although this is unlikely as typically the possible matches >> active users.
