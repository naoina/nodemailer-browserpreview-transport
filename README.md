# In-browser preview transport module for Nodemailer

Applies for Nodemailer v1.x.

## Usage

Install with npm

    npm install nodemailer-browserpreview-transport

Require to your script

```js
var nodemailer = require("nodemailer");
var browserPreviewTransport = require("nodemailer-browserpreview-transport");
```

Create a Nodemailer transport object

```js
var transport = nodemailer.createTransport(browserPreviewTransport({
  dir: "/tmp"
}));
```

## License

nodemailer-browserpreview-transport is licensed under the MIT.
