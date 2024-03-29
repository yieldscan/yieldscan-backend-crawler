import express from 'express';
import methodOverride from 'method-override';
import bodyParser from 'body-parser';
import cors from 'cors';

// import routes from '../api';
import config from '../config';

export default ({ app }: { app: express.Application }): void => {
  /**
   * Health Check endpoints
   */
  app.get('/status', (req, res) => {
    res.status(200).end();
  });
  app.head('/status', (req, res) => {
    res.status(200).end();
  });

  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  // Some sauce that always add since 2014
  // "Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it."
  app.use(methodOverride());

  // Middleware that transforms the raw string of req.body into json
  app.use(bodyParser.json());

  // Load API routes
  // app.use(config.api.prefix, routes());

  /// catch 404 and forward to error handler

  app.use((err, req, res, next) => {
    if (err.name === 'HttpError') {
      return res.status(err.code).send({ status: err.code, message: err.message }).end();
    }
    return next(err);
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err, req, res, next) => {
    res.status(500);
    return res.json({
      error: {
        status: 500,
        message: 'Internal Server Error',
      },
    });
  });
};
