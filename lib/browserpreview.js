"use strict";

var util = require("util");
var path = require("path");
var fs = require("fs");
var os = require("os");
var crypto = require('crypto');
var EventEmitter = require("events").EventEmitter;
var mkdirp = require('mkdirp');

var openurl = require("openurl");
var jade = require("jade");
var MimeNode =  require("nodemailer/lib/mime-node");

var pkg = require("../package.json");

var template = {
  text: jade.compile(fs.readFileSync(path.join(__dirname, "..", "template", "text_mail.jade"))),
  html: jade.compile(fs.readFileSync(path.join(__dirname, "..", "template", "html_mail.jade")))
};

var BrowserPreviewTransport = function(options) {
  EventEmitter.call(this);
  this.name = "BROWSERPREVIEW";
  this.version = pkg.version;
  this.dir = options.dir ? path.resolve(options.dir) : os.tmpdir();
};
util.inherits(BrowserPreviewTransport, EventEmitter);

BrowserPreviewTransport.prototype.send = function(mail, callback) {
  var data = mail.data;
  var messageId;

  if (!(messageId = mail.message.getHeader("message-id"))) {
    messageId = crypto.createHash('sha1').update(data.html || data.text).digest('hex');
  }

  mail.message.id = messageId.replace(/[<>\s]/g, "");

  // use as a parser for Mail.Address objects of the form { name: string, address: string }
  var mimeNode = new MimeNode();
  ['from', 'to', 'cc', 'bcc'].forEach(function(key) {
    if(data[key]) {
      data[key] = mimeNode._convertAddresses(mimeNode._parseAddresses(data[key]))
    }
  })

  data.attachments = data.attachments || [];

  var attachments = data.attachments;
  var attachment;

  for (var i = 0, len = attachments.length; i < len; ++i) {
    attachment = attachments[i];

    if (attachment.path) {
      continue;
    }

    var templateName = mail.data.templateName || mail.data.template || '';
    attachment.path = path.join(this.dir, 'nodemailer-' + templateName +  mail.message.id, attachment.filename);
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
  var type = "html";
  var templateName = mail.data.templateName || mail.data.template || '';
  var filename = path.join(this.dir, 'nodemailer-' + templateName +  mail.message.id, type + '_preview.html');
  var body = template[type](data);
  var writePath = function(filepath, text, callback){
    mkdirp(path.dirname(filepath), function (err) {
      if (err) return callback(err);
      fs.writeFile(filepath, text, callback);
    });
  }

  if (data.text) {
    var type = "text";
    var filenameText = path.join(this.dir, 'nodemailer-' + templateName +  mail.message.id, type + '_preview.html');
    var bodyText = template[type](data);
    writePath(filenameText, bodyText, function() {});
  }

  writePath(filename, body, function(){
    callback(null, filename);
  });

};

module.exports = function(options) {
  return new BrowserPreviewTransport(options);
};
