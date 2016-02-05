'use strict';
const fs = require('fs');
const path = require('path');
const Q = require('q');
const File = require('../../util/file');
const submissionsDir = __dirname + '/../../public/submissions';
var checksumHelper = require('../helpers/checksum-hash');

var appendFileDeferred = function(filePath, append) {

    var deferred = Q.defer();

    fs.appendFile(filePath, '\n' + append, function(err){
        if (err) {
            deferred.reject(err);
        }
        deferred.resolve();
    });

    return deferred.promise;

};

module.exports = function(req, res, next){

    var err;

    var formName = path.basename(req.params.formName);

    var entityChecksums = req.body.finalizedOsmChecksums || null;

    if(!entityChecksums || !entityChecksums instanceof Array) {
        err = new Error('Bad Request: finalizedOsmChecksums must be a string array.');
        err.status = 400;
        next(err);
    }


    // Get the current blacklist
    var blacklist = checksumHelper.get(formName) || null;

    // If the form not yet added to the formHash map, then we need to add it and create an empty blacklist
    if(!blacklist) {
        var formHash = checksumHelper.get();
        formHash.set(formName, new Map());
        blacklist = formHash.get(formName);
    }

    // Parallel async call to find and append the finialized-osm-checksum.txt files that managed the patched checksums
    Q.all(entityChecksums.map(function(checksum){

        blacklist.set(checksum, true);
        return appendFileDeferred(submissionsDir + '/' + formName + '/finalized-osm-checksums.txt', checksum);

    }))
    .then(function(results){
        res.status(200).json({success: true});
    })
    .catch(function(err){
        next(err);
    })
    .done();
};
