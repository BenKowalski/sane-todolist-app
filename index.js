const fs = require('fs')
const { serverStart, serverRouting, serverRedirect } = require('./libs/server/server.js')

process.stdout.write('\033c')

serverStart(3050)



// require('./libs/views/sign-in/view.sign-in.js')



serverRouting('/', async (req, res) => {

  return {
    template: 'INDEX',
    data: {}
  }
})

serverRouting('/test/', async (req, res) => {

  return {
    template: 'TEST',
    data: {}
  }
})

serverRouting('/test/:WTF/', async (req, res) => {

  return {
    template: 'TEST: ${req.params.WTF}!',
    data: {}
  }
})


/*

webserver.addSpecificRoute('/s', (req, res) => {
  fs.readFile('./minified/static/s.css', (err, content) => {
    res.setHeader('Cache-Control', 'public, max-age=86400000')
    res.writeHead(200, { 'Content-Type': 'text/css' })
    res.end(content, 'utf-8')
  })
})

webserver.addSpecificRoute('/favicon.ico', (req, res) => {
  fs.readFile('./favicon.ico', (err, content) => {
    res.writeHead(200, { 'Content-Type': 'image/x-icon' })
    res.end(content, 'utf-8')
  })
})

*/
