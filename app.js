module.exports = function(context, req) {

    var requestCounter = 1;
    var finalContent = [];

    if (req.body && req.body.gitToken) {
        gitToken = req.body.gitToken;
        github_username = req.body.github_username;
        github_reponame = req.body.github_reponame;
        branch = req.body.branch;
    } else {
        requestCounter = 0;
        onCompleted("Please Send Correct Info", null);
    }

    var GitHub = require('github-api');
    var marked = require('marked');
    var tsv = require('tsv');
    const fs = require('fs');
    const gh = new GitHub({
        token: gitToken
    });
    let repo = gh.getRepo(github_username, github_reponame);

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
            onCompleted(null, "Finished Processing successfully");
        });
    }

    // final call
    var onCompleted = function(error, data) {
        if (requestCounter != 0) {
            return;
        }
        context.bindings.qamaker = tsv.stringify(finalContent);
        if (error) {
            res = {
                status: 500,
                body: error
            };
        } else {
            res = {
                status: 200,
                body: data
            };
        }
        context.done(null, res);
    }

    // Strating from root url of branch
    if(requestCounter>0){
      startSpider("");
    }
};
