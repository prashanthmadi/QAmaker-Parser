var GitHub = require('github-api');
var marked = require('marked');
var tsv = require('tsv');
const fs = require('fs');

var requestCounter = 1;

// method to crawl github repo
var startSpider = function(path) {
    repo.getContents(branch, path, true, function(error, data) {
        requestCounter += data.length;
        requestCounter--;
        if (error) {
            context.log(error);
        }
        for (var i in data) {
            if (data[i].type == "dir") {
                startSpider(data[i].path);
            } else {
                processFileContent(data[i].path);
            }
        }
    });
}

// process File Content and append content to tsv file
var processFileContent = function(filePath) {
    repo.getContents(branch, filePath, true, function(error, data) {
        if (error) {
            context.log(error);
        }
        var currentFileData = new Array();
        var splittedcontent = data.split("---");
        var res = data.replace(splittedcontent[1], "");
        data = res.replace("------", "");
        res = "";
        var splitTopContent = splittedcontent[1].replace(/^(\r\n)|(\n)/, '').split("\n");
        for (var i in splitTopContent) {
            var splitKeyValue = splitTopContent[i].split(":");
            currentFileData[splitKeyValue[0]] = splitKeyValue[1];
        }
        currentFileData.data = marked(data).replace(/\n+/g, ' ');
        finalContent.push(currentFileData);
        requestCounter--;
        onCompleted(null, "Finished Processing successfully<br>");
    });
}

// final call
var onCompleted = function(error, data) {
    if (error) {
        res = {
            status: 500,
            body: error
        };
        requestCounter = 0;
    }
    if (requestCounter != 0) {
        return;
    }
    context.bindings.qamaker = tsv.stringify(finalContent);
    var file_name = github_username + "-" + github_reponame;
    data += "Please find TSV file for " + file_name + " @ <a href='" + getSASUrl("outcontainer", file_name + ".tsv")+"'>Link</a>";
    res = {
        status: 200,
        body: data
    };
    context.done(null, res);
}

exports.gitContent = function(cont, req) {
    context = cont;
    gitToken = req.body.gitToken;
    github_username = req.body.github_username;
    github_reponame = req.body.github_reponame;
    branch = req.body.branch;
    const gh = new GitHub({
        token: gitToken
    });
    repo = gh.getRepo(github_username, github_reponame);
    finalContent = [];
    startSpider("");
}

// return SAS Url
var getSASUrl = function(containerName, blobName) {
    var azure = require('azure-storage');
    var blobService = azure.createBlobService(process.env.AzureWebJobsStorage);
    var startDate = new Date();
    var expiryDate = new Date(startDate);
    expiryDate.setMinutes(startDate.getMinutes() + 60);

    var sharedAccessPolicy = {
        AccessPolicy: {
            Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
            Start: startDate,
            Expiry: expiryDate
        },
    };

    var token = blobService.generateSharedAccessSignature(containerName, blobName, sharedAccessPolicy);
    return blobService.getUrl(containerName, blobName, token);
}
