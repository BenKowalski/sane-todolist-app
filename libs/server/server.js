const http = require('http')
const fs = require('fs')
const zlib = require('zlib')
const path = require('path')
const url = require('url')
const crypto = require('crypto')



var server,
	routes = [],
	parsedRoutes = {},
	fnNow



const serverStart = port => {
  server = http.createServer(handleRequest).listen(port, () =>
    console.log('server running at ' + port)
  ) 
}
exports.serverStart = serverStart



const serverRouting = (pattern, fn) => {
	routes.push({
		pattern,
		fn
	})

	routes.sort((a, b) => a.pattern.length - b.pattern.length)

    parsedRoutes = {}
    routes.forEach(route => {

      var routeArr = route.pattern.split('/')
      routeArr.shift()
      routeArr.pop()
      route.arr = routeArr

      parsedRoutes = routeArr.length === 0
      ? route
      : recursivePatternSetter(parsedRoutes, routeArr.map(val => val.substring(0, 1) === ':' ? '*' : val), route)
    })
}
exports.serverRouting = serverRouting



const serverRedirect = (res, url) => {
  res.writeHead(302, {
  	'Location': url
  })
  res.end()
}
exports.serverRedirect = serverRedirect



const handleRequest = async (req, res) => {

	req = await parseReqQuery(req)

    // Add trailing slash
    if (req.url.substring(req.url.length - 1) != '/') {
      serverRedirect(res, req.url + '/')
      return
    }

    // Prepare route array
    var routeArr = req.url.split('/')
    routeArr.shift()
    routeArr.pop()

    const routeParsed = recursiveUrlParser(parsedRoutes, routeArr, [])


    if (!routeParsed || !routeParsed.pattern) {
    	res.end('404')
    	return
    }

    // TODO: Bad style
    req.params = parseReqParams(req, routeParsed)

    /*if (routeParsed.authRequired) {
       const authCookie = req.getCookie('Auth') // __Secure-

       if(!authCookie || authCookie.userAgent != req.headers['user-agent']) {
         res.redirect('/sign-in/')
         return
       }

       req.session = {}
       req.session.auth = true
       req.session.uid = authCookie.id
     }*/

    const { template, data } = await routeParsed.fn(req, res)

    render({
    	req,
    	res,
    	template,
    	data
    })

}



const render = async ({ req, res, template, data }) => {
  const rendered = eval('`' + template + '`')

  const acceptEncoding = req.headers['accept-encoding'] ? req.headers['accept-encoding'] : ''

  let toSend = rendered,
  	headers = {
  	'Content-Type': 'text/html'
  }

  if (acceptEncoding.match(/\bdeflate\b/)) {
  	
    toSend = zlib.deflateSync(rendered)
    headers['Content-Encoding'] = 'deflate'

  } else if (acceptEncoding.match(/\bgzip\b/)) {

  	toSend = zlib.gzipSync(rendered)
    headers['Content-Encoding'] = 'gzip'

  }

  res.writeHead(200, headers)
  res.end(toSend, 'utf-8')
}



const parseReqQuery = async req => {
  req.body = {}

  if (req.method === 'POST') {
    return new Promise((resolve, reject) => {
      var body = ''
      req.on('data', data => {
        body += data
        if (body.length > 1e6) {
          req.connection.destroy()
        }
      })

      req.on('end', () => {
        const queryArr = body.split('&').map(val => val.split('='))
        queryArr.forEach(val => req.body[val[0]] = decodeURIComponent(val[1]))
        resolve(req)
      })
    })
  } else {
    return req
  }
}



const getCookie = (req, key) => {
  const str = RegExp('' + key + '[^;]+').exec(req.headers.cookie)
  try {
    return decryptJSON(decodeURIComponent(str ? str.toString().replace(/^[^=]+./, '') : ''))
  } catch (err) {
    return
  }
}



const setCookie = (res, key, val) => {
  res.setHeader('Set-Cookie', key + '=' + encryptJSON(val) + '; Path=/') // Secure;
}



const encryptJSON = json => {
  const cipher = crypto.createCipher('aes192', 'D3GS-FH59-XY393foi')
  let encrypted = cipher.update(JSON.stringify(json), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

const decryptJSON = encrypted => {
  try {
    const decipher = crypto.createDecipher('aes192', 'D3GS-FH59-XY393foi')
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return JSON.parse(decrypted)
  } catch (err) {
  	return
  }
}



const recursivePatternSetter = (routingObject, routeArr, route) => {
  if (routeArr.length === 1) {
    routingObject[routeArr[0]] = route
    return routingObject
  }

  const step = routeArr.shift()
  routingObject[step] = routingObject[step] || {}
  routingObject[step] = recursivePatternSetter(routingObject[step], routeArr, route)
  return routingObject
}



const recursiveUrlParser = (routingObject, routeArr, params) => {
  if (routeArr.length === 0) {
    return {
      pattern: routingObject.pattern,
      fn: routingObject.fn,
      /* authRequired: routingObject.authRequired, */
      arr: routingObject.arr,
      params
    }
  }

  const step = routeArr.shift()

  if (routingObject[step]) {
    return recursiveUrlParser(routingObject[step], routeArr, params)
  } else if (routingObject['*']) {
    params.push(step)
    return recursiveUrlParser(routingObject['*'], routeArr, params)
  } else {
    return null
  }
}



const parseReqParams = (req, routeParsed) => {
  params = {}
  if (routeParsed.arr) {
    routeParsed.arr.forEach(val => {
      if (val.substring(0, 1) === ':') {
        params[val.substring(1)] = routeParsed.params.shift()
      }
    })
  }
  return params
}
