"use strict";
const assert = require('better-assert');
const validator = require('validator');
const Thing = require('../index.js');
const database = require('../database');


module.exports = (thing, transaction) => {
    assert( thing.id && validator.isUUID(thing.id) );
    assert( thing.author && validator.isUUID(thing.author) );

    let views = [thing.id, thing.author];

    return Promise.all([
        add_props(),
        add_referred(),
    ])
    .then(_ => {
        thing.views = views;
    })

    function add_props() {
        for(let prop in thing.schema) {
            let prop_spec = thing.schema[prop];
            if( prop_spec.add_to_view ) {
                assert( prop_spec.required );
                let prop_value = thing[prop];
                assert( prop_value );
                assert( validator.isUUID(prop_value) );
                views.push(prop_value);
            }
        }
        return Promise.resolve();
    }

    function add_referred() {
        return Promise.all(
            ((thing.schema._options||{}).additional_views||[])
            .map(fct => fct(thing, transaction))
        )
        .then(views_addendums => {
            views = views.concat(
                views_addendums
                .reduce((prev, curr) => prev.concat(curr), [])
                .filter(view_addendum => {
                    // the plan is to have assert not throw in production
                    assert(!!view_addendum);
                    return !!view_addendum;
                })
            );
        });
    }
};
