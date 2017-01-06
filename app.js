var GitHub = require('github-api');
var marked = require('marked');
var tsv = require('tsv');
const fs = require('fs');

var gitToken ="xxxxx";
var ref = "master";
var finaloutput_filename ="finaloutput.tsv";
var github_username = "xxxx";
var github_reponame ="xxxx";

var finalContent = [];
const gh = new GitHub({token:gitToken});
let repo = gh.getRepo(github_username,github_reponame);
var totalRequests = 1;

// create new file or clear previous file content
fs.writeFile(finaloutput_filename, '',function (err) {
    if (err) throw err;
});


// method to crawl github repo
var startSpider = function(path){
  repo.getContents(ref,path,true,function(error,data){
    totalRequests--;
    if(error){
      console.log(error);
    }
    totalRequests+= data.length;
    for(var i in data){
      if(data[i].type =="dir"){
        startSpider(data[i].path);
      }
      else{
        processFileContent(data[i].path);
      }
    }
  });
}

startSpider("");

var processFileContent = function(filePath){
  repo.getContents(ref,filePath,true,function(error,data){
    if(error){
      console.log(error);
    }

    var currentFileData = new Array();
    var splittedcontent = data.split("---");
    var res = data.replace(splittedcontent[1],"");
    data = res.replace("------","");
    res="";
    var splitTopContent = splittedcontent[1].replace(/^(\r\n)|(\n)/,'').split("\n");
    for(var i in splitTopContent){
      var splitKeyValue = splitTopContent[i].split(":");
      currentFileData[splitKeyValue[0]] = splitKeyValue[1];
    }
    currentFileData.data = marked(data).replace(/\n+/g, ' ');
    finalContent.push(currentFileData);

    fs.appendFile(finaloutput_filename, tsv.stringify(finalContent).split("\n")[1]+"\n", (err) => {
      if (err) throw err;
      console.log('The "data to append" was appended to file!');
    });

  });
}
