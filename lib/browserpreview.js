"use strict";

var util = require("util");
var path = require("path");
var fs = require("fs");
var os = require("os");
var EventEmitter = require("events").EventEmitter;

var openurl = require("openurl");
var jade = require("jade");

var pkg = require("../package.json");

var template = {
  text: jade.compile(fs.readFileSync(path.join(__dirname, "..", "template", "text_mail.jade"))),
  html: jade.compile(fs.readFileSync(path.join(__dirname, "..", "template", "html_mail.jade")))
};

var BrowserPreviewTransport = function(options) {
  EventEmitter.call(this);
  this.name = "BROWSERPREVIEW";
  this.version = pkg.version;
  this.dir = options.dir || os.tmpdir();
};
util.inherits(BrowserPreviewTransport, EventEmitter);

BrowserPreviewTransport.prototype.send = function(mail, callback) {
  mail.message.id = (mail.message.getHeader("message-id") || "").replace(/[<>\s]/g, "");

  var data = mail.data;
  data.attachments = data.attachments || [];

  var attachments = data.attachments;
  var attachment;

  for (var i = 0, len = attachments.length; i < len; ++i) {
    attachment = attachments[i];

    if (attachment.path) {
      continue;
    }

    attachment.path = path.join(this.dir, mail.message.id + "." + attachment.filename);
    try {
      fs.writeFileSync(attachment.path, attachment.content);
    } catch (err) {
      return callback(err);
    }
  }

  this._writeFile(mail, function(err, filename) {
    if (err) {
      return callback(err);
    }

    openurl.open(filename, function(err) {
      if (err) {
        return callback(err);
      }

      var info = {
        envelope: data.envelope || mail.message.getEnvelope(),
        messageId: mail.message.id
      };
      callback(null, info);
    });
  }.bind(this));
};

BrowserPreviewTransport.prototype._writeFile = function(mail, callback) {
  var data = mail.data;
  var id = mail.message.id;
  var type = "text";

  if (data.html) {
    type = "html";
  }

  var body = template[type](data);
  var filename = path.join(this.dir, "message_" + type + "_preview." + id + ".html");

  fs.writeFile(filename, body, function(err) {
    callback(err, filename);
  });
};

module.exports = function(options) {
  return new BrowserPreviewTransport(options);
};
