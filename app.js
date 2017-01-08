module.exports = function(context, req) {
    var util = require('./util.js');
    if (req.body && req.body.gitToken) {
        util.gitContent(context, req);
    } else {
        res = {
            status: 400,
            body: "Please Send Correct Info"
        };
        context.done(null, res);
    }
};
