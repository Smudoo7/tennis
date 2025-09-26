
// netlify/functions/hello.js
exports.handler = async () => ({
  statusCode: 200,
  headers: { "content-type": "text/plain" },
  body: "hello"
});
