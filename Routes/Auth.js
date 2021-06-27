const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../db");
const config = require("config");
const res_msg = require("./Function/res_msg");
const Token = require("./Function/token");
const Request_Auth = require("./Function/request_auth");
const db_method = require("./Function/db_method");

const auth = express.Router();
const db_name = "Auth";

auth.post("/new_account", (req, res) => {
    var payload = {
        name: req.body.name,
        username: req.body.username,
        password: req.body.password,
        email: req.body.email,
        address: req.body.address,
        isDeleted: 0,
    };
    if (
        !payload.name ||
        !payload.username ||
        !payload.password ||
        !payload.email
    ) {
        res_msg.error(
            res,
            "Incomplete fields. Please provide Name, Username, Password and Email"
        );
    } else if (payload.password.length < 8) {
        res_msg.error(res, "Length of Password must be greater than 8");
    } else {
        db_method
            .Find(db_name, { username: payload.username, isDeleted: 0 })
            .then((result0) => {
                if (result0) {
                    res_msg.error(res, "Username already registered!");
                } else {
                    bcrypt.hash(
                        payload.password,
                        config.get("AUTH.BCRYPT.saltRound"),
                        (err, pass_hash) => {
                            if (err) throw err;
                            payload.password = pass_hash;
                            db_method
                                .Insert(db_name, payload)
                                .then((result1) => {
                                    if (result1.insertedCount === 1) {
                                        res_msg.success(
                                            res,
                                            "Account Registrated Successfully"
                                        );
                                    } else {
                                        res_msg.server_error(res);
                                    }
                                });
                        }
                    );
                }
            });
    }
});
auth.get("/account", Request_Auth.jwt_auth, (req, res) => {
    db_method
        .Find(db_name, {
            _id: db.getOID(req.token_payload.data.uid),
            username: req.token_payload.data.username,
            isDeleted: 0,
        })
        .then((result0) => {
            if (result0 === null) {
                res_msg.error(res, "Unable to find your account");
            } else {
                res.status(200).json({
                    success: true,
                    payload: {
                        name: result0.name,
                        username: result0.username,
                        email: result0.email,
                        address: result0.address,
                    },
                });
            }
        });
});
auth.post("/ch_account", Request_Auth.jwt_auth, (req, res) => {
    var payload = req.body;
    if (payload.username || payload.password) {
        res_msg.error(res, "Cannot change Username or Password here!");
    } else {
        db_method
            .Update(
                db_name,
                {
                    _id: db.getOID(req.token_payload.data.uid),
                    username: req.token_payload.data.username,
                    isDeleted: 0,
                },
                payload
            )
            .then((result0) => {
                if (result0.value === null) {
                    res_msg.error(res, "Unable to find your account!");
                } else {
                    res_msg.success(res, "Account Updated Successfully");
                }
            });
    }
});
auth.post("/rm_account", Request_Auth.jwt_auth, (req, res) => {
    var payload = req.body;
    if (!payload.username || !payload.password) {
        res_msg.error(res, "Provide Username & Password");
    } else if (payload.username !== req.token_payload.data.username) {
        res_msg.error(res, "Incorrect Username");
    } else {
        db_method
            .Find(db_name, {
                _id: db.getOID(req.token_payload.data.uid),
                username: req.token_payload.data.username,
                isDeleted: 0,
            })
            .then((result0) => {
                if (result0 === null) {
                    res_msg.error(res, "Unable to find your account");
                } else {
                    bcrypt.compare(
                        payload.password,
                        result0.password,
                        function (err, result1) {
                            if (err) throw err;
                            if (result1 === true) {
                                db_method
                                    .Update(
                                        db_name,
                                        {
                                            username: payload.username,
                                            isDeleted: 0,
                                        },
                                        { isDeleted: 1 }
                                    )
                                    .then((result2) => {
                                        if (result2.value) {
                                            res_msg.success(
                                                res,
                                                "Account Deleted"
                                            );
                                        } else {
                                            res_msg.error(
                                                res,
                                                "Unable to delete! Try Again Later"
                                            );
                                        }
                                    });
                            } else {
                                res_msg.error(res, "Incorrect Password");
                            }
                        }
                    );
                }
            });
    }
});
auth.post("/ch_password", (req, res) => {
    res_msg.error(res, "API Under Construction");
});
auth.post("/login", (req, res) => {
    var payload = {
        username: req.body.username,
        password: req.body.password,
        isDeleted: 0,
    };
    if (!payload.username || !payload.password) {
        res_msg.error(res, "Provide Username & Password");
    } else {
        db_method
            .Find(db_name, { username: payload.username, isDeleted: 0 })
            .then((result0) => {
                if (result0 === null) {
                    res_msg.error(res, "Incorrect Username");
                } else {
                    bcrypt.compare(
                        payload.password,
                        result0.password,
                        function (err, result1) {
                            if (err) throw err;
                            if (result1 === true) {
                                var token = Token.GenToken(
                                    {
                                        uid: db.getID(result0._id),
                                        username: result0.username,
                                        isDeleted: 0,
                                    },
                                    1
                                );
                                res.json({ success: true, token });
                            } else {
                                res_msg.error(res, "Incorrect Password");
                            }
                        }
                    );
                }
            });
    }
});

module.exports = auth;
