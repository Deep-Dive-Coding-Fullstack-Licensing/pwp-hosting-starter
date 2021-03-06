const express = require('express')
const bodyParser = require('body-parser')
const morgan = require('morgan')
const mailgun = require('mailgun-js')
const {check, validationResult} = require('express-validator');
const Recaptcha = require('express-recaptcha').RecaptchaV2

const app = express()
console.log(Recaptcha)
console.log(process.env)
const recaptcha = new Recaptcha(process.env.RECAPTCHA_SITE_KEY, process.env.RECAPTCHA_SECRET_KEY)

//app.use allows for different middleware to be brought into Express
app.use(morgan("dev"))
app.use(express.json())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

//how to call to the router for express
const indexRoute = express.Router()

const indexRouteMiddleware = (request, response) => {
  response.json("is this thing on?")
}

const validationArray = [
  //email must be formatted like an email
  check('email', 'A valid email is required').isEmail().normalizeEmail(),
  check('name', 'A name is required to send a email').not().isEmpty().trim().escape(),
  check('subject').optional().trim().escape(),
  check('message', 'A message').not().isEmpty().isLength({max: 2000}).trim().escape()
]

//how to configure a route for express
indexRoute.route("/apis")
  .get(indexRouteMiddleware)
  .post(validationArray, recaptcha.middleware.verify,(request, response) => {
    // Finds the validation errors in this request and wraps them in an object with handy functions
    const errors = validationResult(request);

    if(request.recaptcha.error) {
      return response.send(`<div class='alert alert-danger' role='alert'><strong>Oh snap!</strong>There was an error with Recaptcha</div>`)
    }

    if (!errors.isEmpty()) {
      const currentError = errors.array()[0]
      console.log(currentError.msg)
      return response.send(Buffer.from(`<div class='alert alert-danger' role='alert'><strong>Oh snap!</strong> ${currentError.msg}</div>`))
    }

    const {name, email, subject, message} = request.body

    //   Mailgun smtp
    const domain = process.env.MAILGUN_DOMAIN

    const mg = mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: domain});

    const data = {
      to: process.env.MAIL_RECIPIENT,
      from: `Mailgun Sandbox <postmaster@${domain}>`,
      subject: `${name} - ${email}: ${subject}`,
      text: message
    }

    mg.messages().send(data, function (error) {
      if (error) {
        return response.send(Buffer.from(`
<div class='alert alert-danger' role='alert'><strong>Oh snap!</strong> Unable to send email</div>`
        ))
      }
    })



    return response.send(Buffer.from("<div class='alert alert-success' role='alert'>Email successfully sent.</div>"))

  })
app.use(indexRoute)

//app.listen declares what port the Express application is running on
app.listen(4200, () => console.log('Server started...'))