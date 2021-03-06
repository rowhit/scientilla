// Cleaner.js - in api/services

const _ = require('lodash');

"use strict";

module.exports = {
    cleanDocumentCopies,
    cleanInstituteCopies,
    cleanSourceCopies
};

async function cleanInstituteCopies() {
    function getInstituteCopy(i) {
        return Institute.findOne({id: {'<': i.id}, scopusId: i.scopusId});
    }
    function getInstituteParent(i) {
        return Institute.findOne({id: i.parentId});
    }

    // bad hack: Institute 1 is the main institute
    const mainInstituteId = 1;
    const institutes = await Institute.find({id: {'!': mainInstituteId}, scopusId: {'!': null}});
    sails.log.debug(`${institutes.length} to check`);
    const deletedInstitutes = [];
    for (let institute of institutes) {
        const copy = await getInstituteCopy(institute);
        if (!copy)
            continue;

        const affiliations = await Affiliation.find({institute: institute.id});
        if (affiliations.length) {
            const affiliationsIds = affiliations.map(a => a.id);
            const updateAffiliations = await Affiliation.update({id: affiliationsIds}, {institute: copy.id});
            sails.log.debug(`${updateAffiliations.length} affiliations updated from institute ${institute.id} to ${copy.id}`);
        }
        await institute.destroy();
        deletedInstitutes.push(institute);
    }
    sails.log.debug(`${deletedInstitutes.length} deleted`);

    const institutesDup = await Institute.find({id: {'!': mainInstituteId}, parentId: {'!': null}});
    for (let institute of institutesDup) {
        const parent = await getInstituteParent(institute);
        if (!parent)
            continue;

        const affiliations = await Affiliation.find({institute: institute.id});
        if (affiliations.length) {
            const affiliationsIds = affiliations.map(a => a.id);
            const updateAffiliations = await Affiliation.update({id: affiliationsIds}, {institute: parent.id});
            sails.log.debug(`${updateAffiliations.length} affiliations updated from institute ${institute.id} to ${parent.id}`);
        }
    }

}

async function cleanSourceCopies() {
    function getSourceCopy(i) {
        return Source.findOne({id: {'!': i.id}, scopusId: i.scopusId});
    }

    const sources = await Source.find();
    const deletedSources = [];
    for (let source of sources) {
        if (!source.scopusId)
            continue;
        const copy = await getSourceCopy(source);
        if (!copy)
            continue;

        const documents = await Document.find({source: source.id});
        if (documents.length) {
            const documentIds = documents.map(d => d.id);
            const updateDocuments = await Document.update({id: documentIds}, {source: copy.id});
            sails.log.debug(`${updateDocuments.length} documents updated from source ${source.id} to ${copy.id}`);
        }
        await source.destroy();
        deletedSources.push(source);
    }
    sails.log.debug(`${deletedSources.length} deleted`);
}

async function cleanDocumentCopies() {
    const mergedDocuments = [];
    const nonMergedDocuments = [];
    const documents = await Document.findByKind(DocumentKinds.VERIFIED);
    sails.log.debug(`${documents.length} documents to check found`);

    for (let partialDoc of documents) {
        const doc = await Document.findOneById(partialDoc.id)
            .populate('authors')
            .populate('groups')
            .populate('authorships')
            .populate('groupAuthorships')
            .populate('affiliations')
            .populate('discardedCoauthors')
            .populate('discardedGroups')
            .populate('discarded')
            .populate('discardedG');
        if (Document.getNumberOfConnections(doc) == 0) {
            sails.log.warn(`Document with id ${doc.id} is a verified document but has no connections`);
            continue;
        }
        const errors = [];
        const copies = await Document.findCopies(doc);
        if (copies.length == 0)
            continue;
        const copy = copies[0];
        for (let d of doc.discarded) {
            sails.log.debug(`User ${d.researchEntity} is removing ${doc.id} from the discarded`);
            const res = await User.undiscardDocument(User, d.researchEntity, d.document);
            if (res.error) {
                errors.push(res);
                sails.log.warn('Error: ');
                sails.log.warn(res.error);
            } else {
                sails.log.debug(`User ${d.researchEntity} is discarding ${copy.id}`);
                await User.discardDocument(User, d.researchEntity, copy.id);
            }
        }
        for (let d of doc.discardedG) {
            sails.log.debug(`Group ${d.researchEntity} is removing ${doc.id} from the discarded`);
            const res = await Group.undiscardDocument(Group, d.researchEntity, d.document);
            if (res.error) {
                sails.log.warn('Error: ');
                sails.log.warn(res.error);
            } else {
                sails.log.debug(`Group ${d.researchEntity} is discarding ${copy.id}`);
                await Group.discardDocument(Group, d.researchEntity, copy.id);
            }
        }
        for (let a of doc.authorships) {
            if (!a.researchEntity)
                continue;
            const instituteIds = doc.affiliations.filter(aff => aff.authorship === a.id).map(aff => aff.institute);
            sails.log.debug(`User ${a.researchEntity} is trying to verify document ${copy.id} (${copy.title}) in position: ${a.position}`);
            const res = await User.verifyDocument(User, a.researchEntity, copy.id, {
                position: a.position,
                affiliationInstituteIds: instituteIds,
                corresponding: a.corresponding,
                synchronize: a.synchronize
            });
            if (res.error) {
                errors.push(res);
                sails.log.warn('Error: ');
                sails.log.warn(res.error);
            } else {
                sails.log.debug(`User ${a.researchEntity} is trying to unverify document ${doc.id} (${doc.title})`);
                await User.unverifyDocument(User, a.researchEntity, doc.id);
            }
        }
        for (let a of doc.groupAuthorships) {
            if (!a.researchEntity)
                continue;
            sails.log.debug(`Group ${a.researchEntity} is trying to verify document ${copy.id} (${copy.title})`);
            const res = await Group.verifyDocument(Group, a.researchEntity, copy.id);
            if (res.error) {
                errors.push(res);
                sails.log.warn('Error: ');
                sails.log.warn(res.error);
            } else {
                sails.log.debug(`Group ${a.researchEntity} is trying to unverify document ${doc.id} (${doc.title})`);
                await Group.unverifyDocument(Group, a.researchEntity, doc.id);
            }
        }
        if (errors.length) {
            sails.log.debug(`Document ${doc.id} should have been merged with  ${copy.id} but an error occured`)
            nonMergedDocuments.push({doc: doc, copy: copy});
        }
        else {
            sails.log.debug(`Document ${doc.id} was merged with ${copy.id}`);
            mergedDocuments.push({doc: doc, copy: copy});
        }
    }
    sails.log.debug(`${mergedDocuments.length} documents merged`);
    sails.log.debug(`${nonMergedDocuments.length} documents were not merged because of some error`);
}