/* global Document, sails, User, ObjectComparer, Authorship, Affiliation, DocumentKinds, ExternalImporter, DocumentOrigins, Synchronizer */
'use strict';

/**
 * Document.js
 *
 * @description :: TODO: You might write a short summary of how this model works and what it represents here.
 * @docs        :: http://sailsjs.org/#!documentation/models
 */

const _ = require('lodash');
const BaseModel = require("../lib/BaseModel.js");
const actionUtil = require('sails/lib/hooks/blueprints/actionUtil');

const fields = [
    {name: 'authorsStr'},
    {name: 'authorKeywords'},
    {name: 'title'},
    {name: 'year'},
    {name: 'source'},
    {name: 'itSource'},
    {name: 'issue'},
    {name: 'volume'},
    {name: 'pages'},
    {name: 'articleNumber'},
    {name: 'doi'},
    {name: 'abstract'},
    {name: 'type'},
    {name: 'sourceType'},
    {name: 'scopusId'},
    {name: 'wosId'},
    {name: 'iitPublicationsId'},
    {name: 'origin'},
    {name: 'kind'},
    {name: 'synchronized'}
];

module.exports = _.merge({}, BaseModel, {
    /* CONSTANTS */
    DEFAULT_SORTING: {
        year: 'desc',
        title: 'asc',
        id: 'desc'
    },
    /* ATTRIBUTES */
    attributes: {
        title: 'STRING',
        authorsStr: 'STRING',
        authorKeywords: 'STRING',
        year: 'STRING',
        issue: 'STRING',
        volume: 'STRING',
        pages: 'STRING',
        articleNumber: 'STRING',
        doi: 'STRING',
        type: 'STRING',
        sourceType: 'STRING',
        itSource: 'STRING',
        scopusId: 'STRING',
        wosId: 'STRING',
        iitPublicationsId: 'STRING',
        abstract: 'TEXT',
        kind: 'STRING',
        origin: 'STRING',
        synchronized: "BOOLEAN",
        source: {
            model: 'source'
        },
        authors: {
            collection: 'user',
            via: 'documents',
            through: 'authorship'
        },
        suggestions: {
            collection: 'user',
            via: 'documents',
            through: 'documentsuggestion'
        },
        externalUsers: {
            collection: 'user',
            via: 'document',
            through: 'externaldocument'
        },
        externalGroups: {
            collection: 'group',
            via: 'document',
            through: 'externaldocumentgroup'
        },
        groupSuggestions: {
            collection: 'group',
            via: 'documents',
            through: 'documentsuggestiongroup'
        },
        groups: {
            collection: 'group',
            via: 'documents',
            through: 'authorshipgroup'
        },
        authorships: {
            collection: 'authorship',
            via: 'document'
        },
        groupAuthorships: {
            collection: 'authorshipgroup',
            via: 'document'
        },
        affiliations: {
            collection: 'affiliation',
            via: 'document',
        },
        institutes: {
            collection: 'institute',
            via: 'document',
            through: 'affiliation'
        },
        duplicates: {
            collection: 'documentduplicate',
            via: 'document',
            getCriteria: async function (req) {
                const researchEntityId = req.param('parentid');
                const researchEntityType = req.path.includes('user') ? 'user' : 'group';
                return {
                    'researchEntity': researchEntityId,
                    'researchEntityType': researchEntityType
                };
            }
        },
        userTags: {
            collection: 'tag',
            via: 'document'
        },
        tagLabels: {
            collection: 'tagLabel',
            via: 'documents',
            through: 'tag'
        },
        groupTags: {
            collection: 'taggroup',
            via: 'document'
        },
        groupTagLabels: {
            collection: 'tagLabel',
            via: 'documents',
            through: 'taggroup'
        },
        discardedCoauthors: {
            collection: 'User',
            via: 'discardedDocuments',
            through: 'discarded'
        },
        discardedGroups: {
            collection: 'Group',
            via: 'discardedDocuments',
            through: 'discardedgroup'
        },
        discarded: {
            collection: 'discarded',
            via: 'document'
        },
        discardedG: {
            collection: 'discardedgroup',
            via: 'document'
        },
        draftCreator: {
            model: 'User'
        },
        draftGroupCreator: {
            model: 'Group'
        },
        isValid: function () {
            const authorsStrRegex = /^((\w|-|')+(\s(\w|-|')+)*((\s|-)?\w\.)+)(,\s(\w|-|')+(\s(\w|-|')+)*((\s|-)?\w\.)+)*$/;
            const self = this;
            const requiredFields = [
                'authorsStr',
                'title',
                'year',
                'type',
                'sourceType'
            ];
            if (this.type === DocumentTypes.INVITED_TALK)
                requiredFields.push('itSource');
            else
                requiredFields.push('source');

            return _.every(requiredFields, function (v) {
                return self[v];
            }) && authorsStrRegex.test(self.authorsStr);
        },
        draftToDocument: function () {
            this.kind = DocumentKinds.VERIFIED;
            this.draftCreator = null;
            this.draftGroupCreator = null;
            return this.savePromise();
        },
        getAuthors: function () {
            if (!this.authorsStr)
                return [];
            var authors = this.authorsStr.replace(/\s+et all\s*/i, '').split(',').map(_.trim);
            return authors;
        },
        getUcAuthors: function () {
            var authors = this.getAuthors();
            var ucAuthors = _.map(authors, function (a) {
                return a.toUpperCase();
            });
            return ucAuthors;
        },
        getAuthorIndex: function (author) {
            return _.findIndex(this.getAuthors(), a => _.includes(author.getAliases(), a));
        },
        isPositionVerified: function (position) {
            if (!this.authorships)
                return false;

            const authorship = this.getAuthorshipByPosition(position);

            return !!authorship && !_.isNil(authorship.researchEntity);
        },
        getAuthorshipByPosition: function (position) {
            if (_.isNil(this.authorships))
                throw 'getAuthorshipByPosition: authorships missing';

            return this.authorships.find(a => a.position === position);
        },
        getFullAuthorships: function () {
            if (_.isEmpty(this.affiliations) || _.isEmpty(this.authorships))
                return [];

            return this.authorships.map(authorship => {
                const auth = _.clone(authorship);
                auth.affiliations = this.affiliations.filter(affiliation => authorship.id === affiliation.authorship);
                return auth;
            });
        },
        scopusSynchronize: async function (synchronized) {
            if (!synchronized) {
                this.synchronized = false;
                return this.savePromise();
            }

            if (!this.scopusId)
                throw 'Empty scopusId';

            const res = await Synchronizer.documentSynchronizeScopus(this.id);
            return res.docData;
        },
        clone: async function (newDocPartialData = {}) {
            const docData = Document.selectData(this);
            const newDocData = Object.assign({}, docData, newDocPartialData);
            return await Document.create(newDocData);
        }
    },
    getFields: function () {
        return fields.map(f => f.name);
    },
    selectData: function (draftData) {
        const documentFields = Document.getFields();
        return _.pick(draftData, documentFields);
    },
    getNumberOfConnections: function (document) {
        return document.authors.length +
            document.groups.length +
            document.discardedCoauthors.length +
            document.discardedGroups.length;
    },
    deleteIfNotVerified: async function (documentId) {
        const document = await Document.findOneById(documentId)
            .populate('authors')
            .populate('groups')
            .populate('authorships')
            .populate('affiliations')
            .populate('discardedCoauthors')
            .populate('discardedGroups');
        if (!document)
            return {
                error: 'Document ' + documentId + ' does not exist',
                item: documentId
            };
        if (Document.getNumberOfConnections(document) == 0) {
            sails.log.debug('Document ' + documentId + ' will be deleted');
            let deletedDocument = await Document.destroy({id: documentId});
            deletedDocument = deletedDocument[0];
            return deletedDocument;
        }
        return document;
    },
    filterSuggested: function (maybeSuggestedDocuments, toBeDiscardedDocuments, similarityThreshold) {
        var suggestedDocuments = [];
        _.forEach(maybeSuggestedDocuments, function (r1) {
            var checkAgainst = _.union(toBeDiscardedDocuments, suggestedDocuments);
            var discard = _.some(checkAgainst, function (r2) {
                return r1.getSimilarity(r2) > similarityThreshold;
            });
            if (discard)
                return;
            suggestedDocuments.push(r1);
        });
        return suggestedDocuments;
    },
    findCopies: async function (document, AuthorshipPositionNotToCheck = null) {
        function areAuthorshipsEqual(as1, as2) {
            return as1.every(a1 => {
                const a2 = as2.find(a2 => a1.position === a2.position);
                return (
                    !a2 ||
                    a1.position === AuthorshipPositionNotToCheck ||
                    !_.isNil(a1.researchEntity) ||
                    _.isEmpty(_.xor(_.map(a1.affiliations, 'institute'), _.map(a2.affiliations, 'institute')))
                );
            });
        }

        const query = _.pick(document, Document.getFields());
        query.id = {'!': document.id};
        query.kind = DocumentKinds.VERIFIED;
        const similarDocuments = await Document.find(query)
            .populate('authorships')
            .populate('affiliations');
        const draftFullAuthorships = document.getFullAuthorships();
        const copies = similarDocuments.filter(d => {
            const copyFullAuthorships = d.getFullAuthorships();
            return areAuthorshipsEqual(draftFullAuthorships, copyFullAuthorships) &&
                areAuthorshipsEqual(copyFullAuthorships, draftFullAuthorships);
        });

        return copies;
    },
    createOrUpdate: async function (criteria, documentData) {
        const selectedData = Document.selectData(documentData);

        let doc = await Document.findOne(criteria);
        if (doc)
            doc = await Document.update(criteria, selectedData);
        else
            doc = await Document.create(selectedData);

        if (documentData.authorships) {
            doc = await Document.findOne(criteria);
            await Authorship.destroy({document: doc.id});
            await Authorship.createEmptyAuthorships(doc.id, documentData);
        }
        return doc;
    },
    desynchronizeAll: async function (drafts) {
        const desynchronizedDrafts = [];
        for (let d of drafts) {
            const draft = await Document.findOneById(d);
            if (!draft)
                continue;

            draft.synchronized = false;
            await draft.savePromise();
            desynchronizedDrafts.push(draft);
        }
        return desynchronizedDrafts;
    },
    setAuthorships: async function (docId, authorshipsData) {
        const authData = _.cloneDeep(authorshipsData);
        authData.forEach(a => {
            delete a.id;
            delete a.createdAt;
            delete a.updatedAt;
            a.document = docId;
            a.affiliations = a.affiliations.map(aff => {
                if (aff.institute)
                    return aff.institute;

                aff.document = docId;
                delete aff.authorship;

                return aff;
            });
        });
        const deleteAuthorships = await Authorship.destroy({document: docId});
        await Affiliation.destroy({authorship: deleteAuthorships.map(a => a.id)});
        await Authorship.create(authData);

        return await Document.findOneById(docId)
            .populate(['authorships', 'groupAuthorships', 'affiliations']);
    },
});
