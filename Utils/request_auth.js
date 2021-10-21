const config = require("config");
const res_msg = require("./res_msg");
const VerifyToken = require("../Routes/token").VerifyToken;
const db = require("../db");
const req_auth = (req, res, next) => {
    var payload = req.header;
    if (!payload.username || !payload.password) {
        res_msg.forbidden(res);
    } else if (
        payload.username === config.get("AUTH.API_AUTH.USERNAME") &&
        payload.password === config.get("AUTH.API_AUTH.PASSWORD")
    ) {
        next();
    } else {
        res_msg.error(res, "Incorrect API credentials");
    }
};
const jwt_auth = (req, res, next) => {
    req.token = VerifyToken(req.session.user.token);
    if (req.token.success === false) return res_msg.error(res, req.token.msg);
    db.Find("Auth", { token: req.session.user.token, isDeleted: !1 }).then(
        (result0) => {
            if (result0.username !== req.token.data.username)
                return res_msg.error(res, "Token Mismatch! Try Login again");
            next();
        }
    );
};
module.exports = { req_auth, jwt_auth };
