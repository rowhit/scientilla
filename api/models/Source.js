/**
 * Source.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/documentation/concepts/models-and-orm/models
 */

module.exports = {

    attributes: {
        title: 'string',
        issn: 'string',
        eissn: 'string',
        acronym: 'string',
        location: 'string',
        year: 'int',
        publisher: 'string',
        isbn: 'string',
        type: 'string',
        documents: {
            collection: 'reference',
            via: 'source'
        }
    }
};

