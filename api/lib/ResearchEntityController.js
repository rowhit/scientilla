/* global Connector, sails */

/**
 * ResearchEntityController
 *
 * @description :: Server-side logic for managing Researchentities
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */


var actionUtil = require('sails/lib/hooks/blueprints/actionUtil');

module.exports = {
    createDraft: function (req, res) {
        var researchEntityId = req.params.researchEntityId;
        var draftData = req.body;
        var Model = getModel(req);
        return res.halt(Model.createDraft(Model, researchEntityId, draftData));
    },
    unverifyDocument: function (req, res) {
        var researcEntityId = req.params.researchEntityId;
        var documentId = req.params.documentId;
        var Model = getModel(req);
        res.halt(Model.unverifyDocument(Model, researcEntityId, documentId));
    },
    verifyDraft: function (req, res) {
        const researchEntityId = req.params.researchEntityId;
        const draftId = req.params.draftId;
        const verificationData = {
            position: req.body.position,
            corresponding: req.body.corresponding,
            affiliationInstituteIds: req.body.affiliations,
            synchronize: req.body.synchronize
        };
        const Model = getModel(req);
        res.halt(Model.verifyDraft(Model, researchEntityId, draftId, verificationData));
    },
    verifyDrafts: function (req, res) {
        var researchEntityId = req.params.researchEntityId;
        var draftIds = req.param('draftIds');
        var Model = getModel(req);
        res.halt(Model.verifyDrafts(Model, researchEntityId, draftIds));
    },
    verifyDocument: function (req, res) {
        const researchEntityId = req.params.researchEntityId;
        const documentId = req.body.id;
        const verificationData = {
            position: req.body.position,
            corresponding: req.body.corresponding,
            affiliationInstituteIds: req.body.affiliations,
            synchronize: req.body.synchronize
        };
        const Model = getModel(req);
        // TODO in case of failed verify give response with details instead of 400
        res.halt(Model.verifyDocument(Model, researchEntityId, documentId, verificationData));
    },
    verifyDocuments: function (req, res) {
        var researchEntityId = req.params.researchEntityId;
        var documentIds = req.param('documentIds');
        var Model = getModel(req);
        res.halt(Model.verifyDocuments(Model, researchEntityId, documentIds));
    },
    discardDocument: function (req, res) {
        var researchEntityId = req.params.researchEntityId;
        var documentId = req.param('documentId');
        var Model = getModel(req);
        res.halt(Model.discardDocument(Model, researchEntityId, documentId));
    },
    discardDocuments: function (req, res) {
        var researchEntityId = req.params.researchEntityId;
        var documentIds = req.param('documentIds');
        var Model = getModel(req);
        res.halt(Model.discardDocuments(Model, researchEntityId, documentIds));
    },
    createDrafts: function (req, res) {
        var researchEntityId = req.params.researchEntityId;
        var documents = req.param('documents');
        var Model = getModel(req);
        res.halt(Model.createDrafts(Model, researchEntityId, documents));
    },
    updateDraft: function (req, res) {
        var draftId = req.params.id;
        var draftData = req.body;
        var Model = getModel(req);
        res.halt(Model.updateDraft(Model, draftId, draftData));
    },
    getExternalDocuments: function (req, res) {
        var researchEntityId = req.params.researchEntityId;
        var query = getQuery(req);
        var Model = getModel(req);
        res.halt(Connector.getDocuments(Model, researchEntityId, query));
    },
    getChartsData: function (req, res) {
        var modelName = req.options.model || req.options.controller;
        var id = req.params.researchEntityId;
        res.halt(Chart.getChartsData(id, modelName));
    },
    setAuthorhips: function (req, res) {
        const draftId = req.params.documentId;
        const authorshipsData = req.body;
        res.halt(Document.setAuthorships(draftId, authorshipsData));
    },
    updateProfile: function (req, res) {
        const researchEntityId = req.params.researchEntityId;
        const Model = getModel(req);
        const researchEntityData = req.body;
        res.halt(Model.updateProfile(Model, researchEntityId, researchEntityData));
    },
    deleteDrafts: function (req, res) {
        const Model = getModel(req);
        var draftIds = req.param('draftIds');
        res.halt(Model.deleteDrafts(Model, draftIds));
    }
};

function getModel(req) {
    var model_name = req.options.model || req.options.controller;
    var Model = req._sails.models[model_name];
    return Model;
}

function getPopulateFields(req) {
    var populate = req.query.populate;
    if (_.isString(populate))
        populate = [populate];
    return populate;
}

function getQuery(req) {
    var query = {
        limit: actionUtil.parseLimit(req),
        skip: actionUtil.parseSkip(req),
        where: JSON.parse(req.query.where || '{}')
    };
    return query;
}

